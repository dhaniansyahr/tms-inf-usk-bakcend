import { RecordAttendanceDTO } from "$entities/Absensi";
import {
    BadRequestWithMessage,
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    ServiceResponse,
} from "$entities/Service";
import { UserJWTDAO } from "$entities/User";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { getIdentityType } from "$utils/strings.utils";
import { Absensi } from "@prisma/client";
import { DateTime } from "luxon";
import { ulid } from "ulid";

type AbsentResponse = Absensi[] | {};

export async function getTodaySchedule(
    user: UserJWTDAO
): Promise<ServiceResponse<AbsentResponse>> {
    try {
        const today = DateTime.now().toFormat("yyyy-MM-dd");
        const timeNow = DateTime.now().toFormat("HH:mm");

        // Get Jadwal
        const jadwal = await prisma.jadwal.findMany({
            where: {
                OR: [
                    {
                        dosen: {
                            some: {
                                id: user.id,
                            },
                        },
                    },
                    {
                        mahasiswa: {
                            some: {
                                id: user.id,
                            },
                        },
                    },
                ],
                AND: [
                    {
                        shift: {
                            startTime: {
                                lte: timeNow,
                            },
                            endTime: {
                                gte: timeNow,
                            },
                        },
                    },
                    {
                        Meeting: {
                            some: {
                                tanggal: today,
                            },
                        },
                    },
                ],
            },
            include: {
                Meeting: true,
                matakuliah: true,
                shift: true,
                ruangan: true,
                asisten: true,
                dosen: true,
            },
        });

        if (jadwal.length === 0)
            return BadRequestWithMessage("Jadwal Tidak ditemukan!");

        return {
            status: true,
            data: jadwal,
        };
    } catch (err) {
        Logger.error(
            `AttendanceService.getTodaySchedulesForAttendance : ${err}`
        );
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

type AttendanceResponse = Absensi | {};

export async function recordAttendance(
    data: RecordAttendanceDTO
): Promise<ServiceResponse<AttendanceResponse>> {
    try {
        const { identity, meetingId } = data;

        const checkIdentity = getIdentityType(identity);

        let absentExist: Absensi | null = null;

        switch (checkIdentity) {
            case "NPM":
                const mahasiswa = await prisma.mahasiswa.findUnique({
                    where: { npm: identity },
                });

                if (!mahasiswa) {
                    return BadRequestWithMessage("Mahasiswa tidak ditemukan!");
                }

                absentExist = await prisma.absensi.findUnique({
                    where: {
                        mahasiswaId_meetingId: {
                            mahasiswaId: mahasiswa.id,
                            meetingId,
                        },
                    },
                });

                if (absentExist) {
                    return updateAttendance(
                        identity,
                        meetingId,
                        !absentExist.isPresent
                    );
                } else {
                    return createAttendance(identity, meetingId);
                }

                break;

            case "NIP":
                const dosen = await prisma.dosen.findUnique({
                    where: { nip: identity },
                });

                if (!dosen) {
                    return BadRequestWithMessage("Dosen tidak ditemukan!");
                }

                absentExist = await prisma.absensi.findFirst({
                    where: { dosenId: dosen.id, meetingId: meetingId },
                });

                if (absentExist) {
                    return updateAttendance(
                        identity,
                        meetingId,
                        !absentExist.isPresent
                    );
                } else {
                    return createAttendance(identity, meetingId);
                }
                break;

            default:
                return BadRequestWithMessage("NPM atau NIP tidak valid!");
                break;
        }
    } catch (error) {
        Logger.error(`AttendanceService.recordAttendance : ${error}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

type CreateAbsentResponse = Absensi | {};

export async function createAttendance(
    identity: string,
    meetingId: string
): Promise<ServiceResponse<CreateAbsentResponse>> {
    try {
        const checkIdentity = getIdentityType(identity);

        let absent = {};

        if (checkIdentity === "NPM") {
            const mahasiswa = await prisma.mahasiswa.findUnique({
                where: { npm: identity },
            });

            if (!mahasiswa)
                return BadRequestWithMessage("Mahasiswa tidak ditemukan!");

            const meeting = await prisma.meeting.findUnique({
                where: { id: meetingId },
            });

            if (!meeting)
                return BadRequestWithMessage("Meeting tidak ditemukan!");

            absent = await prisma.absensi.create({
                data: {
                    id: ulid(),
                    mahasiswaId: mahasiswa.id,
                    meetingId,
                    isPresent: true,
                    waktuAbsen: DateTime.now().toJSDate(),
                    keterangan: `Absen ke-${
                        meeting.pertemuan
                    } pada ${DateTime.now().toFormat("dd MMMM yyyy HH:mm:ss")}`,
                },
            });
        } else if (checkIdentity === "NIP") {
            const dosen = await prisma.dosen.findUnique({
                where: { nip: identity },
            });

            if (!dosen) return BadRequestWithMessage("Dosen tidak ditemukan!");

            const meeting = await prisma.meeting.findUnique({
                where: { id: meetingId },
            });

            if (!meeting)
                return BadRequestWithMessage("Meeting tidak ditemukan!");

            absent = await prisma.absensi.create({
                data: {
                    id: ulid(),
                    dosenId: dosen.id,
                    meetingId,
                    isPresent: true,
                    waktuAbsen: DateTime.now().toJSDate(),
                    keterangan: `Absen ke-${
                        meeting.pertemuan
                    } pada ${DateTime.now().toFormat("dd MMMM yyyy HH:mm:ss")}`,
                },
            });
        } else {
            return BadRequestWithMessage("NPM atau NIP tidak valid!");
        }

        return {
            status: true,
            data: absent,
        };
    } catch (error) {
        Logger.error(`AttendanceService.createAttendance : ${error}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

type UpdateAbsentResponse = Absensi | {};

export async function updateAttendance(
    identity: string,
    meetingId: string,
    isPresent: boolean
): Promise<ServiceResponse<UpdateAbsentResponse>> {
    try {
        const checkIdentity = getIdentityType(identity);

        let absent = {};

        if (checkIdentity === "NPM") {
            const mahasiswa = await prisma.mahasiswa.findUnique({
                where: { npm: identity },
            });

            if (!mahasiswa)
                return BadRequestWithMessage("Mahasiswa tidak ditemukan!");

            const meeting = await prisma.meeting.findUnique({
                where: { id: meetingId },
            });

            if (!meeting)
                return BadRequestWithMessage("Meeting tidak ditemukan!");

            absent = await prisma.absensi.update({
                where: { id: meetingId },
                data: {
                    id: ulid(),
                    mahasiswaId: mahasiswa.id,
                    meetingId,
                    isPresent,
                    waktuAbsen: DateTime.now().toJSDate(),
                    keterangan: `Absen ke-${
                        meeting.pertemuan
                    } di perbaharui pada ${DateTime.now().toFormat(
                        "dd MMMM yyyy HH:mm:ss"
                    )}`,
                },
            });
        } else if (checkIdentity === "NIP") {
            const dosen = await prisma.dosen.findUnique({
                where: { nip: identity },
            });

            if (!dosen) return BadRequestWithMessage("Dosen tidak ditemukan!");

            const meeting = await prisma.meeting.findUnique({
                where: { id: meetingId },
            });

            if (!meeting)
                return BadRequestWithMessage("Meeting tidak ditemukan!");

            absent = await prisma.absensi.update({
                where: { id: meetingId },
                data: {
                    id: ulid(),
                    dosenId: dosen.id,
                    meetingId,
                    isPresent,
                    waktuAbsen: DateTime.now().toJSDate(),
                    keterangan: `Absen ke-${
                        meeting.pertemuan
                    } di perbaharui pada ${DateTime.now().toFormat(
                        "dd MMMM yyyy HH:mm:ss"
                    )}`,
                },
            });
        } else {
            return BadRequestWithMessage("NPM atau NIP tidak valid!");
        }

        return {
            status: true,
            data: absent,
        };
    } catch (error) {
        Logger.error(`AttendanceService.createAttendance : ${error}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}
