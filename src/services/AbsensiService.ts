import {
    BadRequestWithMessage,
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    ServiceResponse,
} from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { Absensi } from "@prisma/client";
import { AbsentDTO } from "$entities/Absensi";
import { ulid } from "ulid";
import { DateTime } from "luxon";

export type CreateResponse = Absensi | {};
export async function create(
    data: AbsentDTO
): Promise<ServiceResponse<CreateResponse>> {
    try {
        // Check Absent if User is Mahasiswa or Dosen
        const mahasiswa = await prisma.mahasiswa.findUnique({
            where: {
                id: data.userId,
            },
        });

        const dosen = await prisma.dosen.findUnique({
            where: {
                id: data.userId,
            },
        });

        if (!mahasiswa && !dosen)
            return BadRequestWithMessage("User tidak ditemukan!");

        // Check Absent if User is Mahasiswa or Dosen
        const absent = await prisma.absensi.findUnique({
            where: {
                mahasiswaId_meetingId: {
                    mahasiswaId: data.userId,
                    meetingId: data.meetingId,
                },
                dosenId: data.userId,
                meetingId: data.meetingId,
            },
        });

        console.log("Absent : ", absent);

        let absensi: Absensi | {} = {};

        // If Absent is exist, update the absent
        if (absent) {
            absensi = await prisma.absensi.update({
                where: {
                    mahasiswaId_meetingId: {
                        mahasiswaId: data.userId,
                        meetingId: data.meetingId,
                    },
                    dosenId: data.userId,
                    meetingId: data.meetingId,
                },
                data: { isPresent: data.isPresent },
            });
        }

        // If Absent is not exist, create the absent
        if (!absent) {
            const keterangan = `melakukan absensi pada waktu ${DateTime.now().toFormat(
                "dd MMMM yyyy HH:mm:ss"
            )}`;
            absensi = await prisma.absensi.create({
                data: {
                    id: ulid(),
                    mahasiswaId: mahasiswa?.id,
                    dosenId: dosen?.id,
                    meetingId: data.meetingId,
                    isPresent: data.isPresent,
                    keterangan: keterangan,
                    waktuAbsen: DateTime.now().toJSDate(),
                },
            });
        }

        return {
            status: true,
            data: absensi,
        };
    } catch (err) {
        Logger.error(`AbsensiService.create : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}
