import { FilteringQueryV2, PagedList } from "$entities/Query";
import { BadRequestWithMessage, INTERNAL_SERVER_ERROR_SERVICE_RESPONSE, INVALID_ID_SERVICE_RESPONSE, ServiceResponse } from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { Absensi } from "@prisma/client";
import { AbsentDTO, UpdateAbsensiDTO } from "$entities/Absensi";
import { buildFilterQueryLimitOffsetV2 } from "./helpers/FilterQueryV2";
import { ulid } from "ulid";
import { UserJWTDAO } from "$entities/User";
import { DateTime } from "luxon";

export type CreateResponse = Absensi | {};
export async function create(data: AbsentDTO): Promise<ServiceResponse<CreateResponse>> {
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

                if (!mahasiswa && !dosen) return BadRequestWithMessage("User tidak ditemukan!");

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

                let absensi: Absensi | {} = {};

                // If Absent is exist, update the absent
                if (absent) {
                        absensi = await prisma.absensi.update({
                                where: {
                                        mahasiswaId_meetingId: { mahasiswaId: data.userId, meetingId: data.meetingId },
                                        dosenId: data.userId,
                                        jadwalId: data.jadwalId,
                                        meetingId: data.meetingId,
                                },
                                data: { isPresent: data.isPresent },
                        });
                }

                // If Absent is not exist, create the absent
                if (!absent) {
                        const keterangan = `melakukan absensi pada waktu ${DateTime.now().toFormat("dd MMMM yyyy HH:mm:ss")}`;
                        absensi = await prisma.absensi.create({
                                data: {
                                        id: ulid(),
                                        jadwalId: data.jadwalId,
                                        mahasiswaId: mahasiswa?.id,
                                        dosenId: dosen?.id,
                                        meetingId: data.meetingId,
                                        isPresent: data.isPresent,
                                        keterangan: keterangan,
                                        waktuAbsen: DateTime.now().toFormat("yyyy-MM-dd HH:mm:ss"),
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

export type GetAllResponse = PagedList<Absensi[]> | {};
export async function getAll(filters: FilteringQueryV2): Promise<ServiceResponse<GetAllResponse>> {
        try {
                const usedFilters = buildFilterQueryLimitOffsetV2(filters);

                usedFilters.include = {
                        mahasiswa: {
                                select: {
                                        id: true,
                                        nama: true,
                                        npm: true,
                                        semester: true,
                                },
                        },
                        jadwal: {
                                include: {
                                        matakuliah: {
                                                select: {
                                                        id: true,
                                                        nama: true,
                                                        kode: true,
                                                },
                                        },
                                        dosen: {
                                                select: {
                                                        id: true,
                                                        nama: true,
                                                },
                                        },
                                },
                        },
                };

                const whereClause = {
                        deletedAt: null,
                };
                if (usedFilters.where) {
                        Object.assign(whereClause, usedFilters.where);
                }

                const [absensi, totalData] = await Promise.all([
                        prisma.absensi.findMany({
                                skip: usedFilters.skip,
                                take: usedFilters.take,
                                where: whereClause,
                                include: usedFilters.include,
                                orderBy: {
                                        createdAt: "desc",
                                },
                        }),
                        prisma.absensi.count({
                                where: whereClause,
                        }),
                ]);

                let totalPage = 1;
                if (totalData > usedFilters.take) totalPage = Math.ceil(totalData / usedFilters.take);

                return {
                        status: true,
                        data: {
                                entries: absensi,
                                totalData,
                                totalPage,
                        },
                };
        } catch (err) {
                Logger.error(`AbsensiService.getAll : ${err} `);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

export type GetByIdResponse = Absensi | {};
export async function getById(id: string): Promise<ServiceResponse<GetByIdResponse>> {
        try {
                const absensi = await prisma.absensi.findUnique({
                        where: {
                                id,
                                deletedAt: null,
                        },
                        include: {
                                mahasiswa: {
                                        select: {
                                                id: true,
                                                nama: true,
                                                npm: true,
                                                semester: true,
                                        },
                                },
                                jadwal: {
                                        include: {
                                                matakuliah: true,
                                                dosen: true,
                                        },
                                },
                        },
                });

                if (!absensi) return INVALID_ID_SERVICE_RESPONSE;

                return {
                        status: true,
                        data: absensi,
                };
        } catch (err) {
                Logger.error(`AbsensiService.getById : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

export type UpdateResponse = Absensi | {};
export async function update(id: string, data: UpdateAbsensiDTO, user: UserJWTDAO): Promise<ServiceResponse<UpdateResponse>> {
        try {
                // check if user is mahasiswa or dosen
                const role = await prisma.userLevels.findUnique({
                        where: {
                                id: user.userLevelId,
                        },
                });

                if (!role) return BadRequestWithMessage("Role user tidak ditemukan!");

                let absensi = await prisma.absensi.findUnique({
                        where: {
                                id,
                        },
                });

                if (!absensi) return INVALID_ID_SERVICE_RESPONSE;

                // Validate that the jadwal exists
                const jadwal = await prisma.jadwal.findUnique({
                        where: { id: absensi.jadwalId },
                        include: {
                                shift: true,
                        },
                });

                if (!jadwal) {
                        return BadRequestWithMessage("Jadwal tidak ditemukan!");
                }

                // validate if jadwal already to absent
                const currentTime = DateTime.now();
                const shiftStartTime = DateTime.fromISO(jadwal.shift.startTime);
                const shiftEndTime = DateTime.fromISO(jadwal.shift.endTime);

                // check if current time is after shift end time
                if (currentTime.toMillis() > shiftEndTime.toMillis()) {
                        return BadRequestWithMessage("Jadwal sudah selesai!");
                }

                // check if current time is before shift start time
                if (currentTime.toMillis() < shiftStartTime.toMillis()) {
                        return BadRequestWithMessage("Jadwal belum dimulai!");
                }

                const keterangan = `mengubah absensi pada waktu ${DateTime.now().toFormat("dd MMMM yyyy HH:mm:ss")}`;

                absensi = await prisma.absensi.update({
                        where: { id },
                        data: {
                                isPresent: data.isPresent,
                                keterangan: data.keterangan || keterangan,
                                waktuAbsen: new Date(),
                        },
                });

                return {
                        status: true,
                        data: absensi,
                };
        } catch (err) {
                Logger.error(`AbsensiService.update : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

export async function deleteByIds(ids: string): Promise<ServiceResponse<{}>> {
        try {
                const idArray: string[] = JSON.parse(ids);

                await Promise.all(
                        idArray.map((id) =>
                                prisma.absensi.update({
                                        where: { id },
                                        data: { deletedAt: new Date() },
                                })
                        )
                );

                return {
                        status: true,
                        data: {},
                };
        } catch (err) {
                Logger.error(`AbsensiService.deleteByIds : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}
