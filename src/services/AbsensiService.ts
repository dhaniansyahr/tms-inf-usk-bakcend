import { FilteringQueryV2, PagedList } from "$entities/Query";
import { BadRequestWithMessage, INTERNAL_SERVER_ERROR_SERVICE_RESPONSE, INVALID_ID_SERVICE_RESPONSE, ServiceResponse } from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { Absensi } from "@prisma/client";
import { CreateAbsensiDTO, UpdateAbsensiDTO, AbsensiPerMeetingDTO } from "$entities/Absensi";
import { buildFilterQueryLimitOffsetV2 } from "./helpers/FilterQueryV2";
import { ulid } from "ulid";
import { UserJWTDAO } from "$entities/User";
import { DateTime } from "luxon";

export type CreateResponse = Absensi | {};
export async function create(data: CreateAbsensiDTO, user: UserJWTDAO): Promise<ServiceResponse<CreateResponse>> {
        try {
                // check if user is mahasiswa or dosen
                const role = await prisma.userLevels.findUnique({
                        where: {
                                id: user.userLevelId,
                        },
                });

                if (!role) return BadRequestWithMessage("Role user tidak ditemukan!");

                const meeting = await prisma.meeting.findUnique({
                        where: {
                                id: data.meetingId,
                        },
                });

                if (!meeting) return BadRequestWithMessage("Meeting tidak ditemukan!");

                let whereClause = {};
                if (role.name === "MAHASISWA") {
                        whereClause = {
                                mahasiswaId: user.id,
                                jadwalId: data.jadwalId,
                                meetingId: data.meetingId,
                        };
                } else if (role.name === "DOSEN") {
                        whereClause = {
                                dosenId: user.id,
                                jadwalId: data.jadwalId,
                                meetingId: data.meetingId,
                        };
                } else {
                        return BadRequestWithMessage("User tidak memiliki akses untuk melakukan absensi!");
                }

                // Check if absensi already exists based on role
                const existingAbsensi = await prisma.absensi.findFirst({
                        where: whereClause,
                });

                if (existingAbsensi) {
                        const userType = role.name === "MAHASISWA" ? "mahasiswa" : "dosen";
                        return BadRequestWithMessage(`Absensi untuk ${userType} ini pada jadwal ini sudah ada!`);
                }

                // Validate that the jadwal exists
                const jadwal = await prisma.jadwal.findUnique({
                        where: { id: data.jadwalId },
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

                const keterangan = `melakukan absensi pada waktu ${DateTime.now().toFormat("dd MMMM yyyy HH:mm:ss")}`;

                const absensi = await prisma.absensi.create({
                        data: {
                                id: ulid(),
                                mahasiswaId: role.name === "MAHASISWA" ? user.id : null,
                                jadwalId: data.jadwalId,
                                dosenId: role.name === "DOSEN" ? user.id : null,
                                meetingId: data.meetingId,
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

/**
 * Get absensi by jadwal ID
 */
export async function getByJadwalId(jadwalId: string): Promise<ServiceResponse<any>> {
        try {
                const jadwal = await prisma.jadwal.findUnique({
                        where: { id: jadwalId },
                        include: {
                                matakuliah: true,
                                dosen: true,
                                Meeting: {
                                        orderBy: { pertemuan: "asc" },
                                },
                        },
                });

                if (!jadwal) return INVALID_ID_SERVICE_RESPONSE;

                const absensiData = await prisma.absensi.findMany({
                        where: {
                                jadwalId,
                                deletedAt: null,
                        },
                        include: {
                                mahasiswa: {
                                        select: {
                                                id: true,
                                                nama: true,
                                                npm: true,
                                        },
                                },
                        },
                        orderBy: {
                                mahasiswa: { nama: "asc" },
                        },
                });

                return {
                        status: true,
                        data: {
                                jadwal,
                                absensi: absensiData,
                                meetings: jadwal.Meeting,
                        },
                };
        } catch (err) {
                Logger.error(`AbsensiService.getByJadwalId : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

/**
 * Get absensi by meeting ID - placeholder for future implementation
 */
export async function getByMeetingId(meetingId: string): Promise<ServiceResponse<any>> {
        try {
                const meeting = await prisma.meeting.findUnique({
                        where: { id: meetingId },
                        include: {
                                jadwal: {
                                        include: {
                                                matakuliah: true,
                                                dosen: true,
                                        },
                                },
                        },
                });

                if (!meeting) return INVALID_ID_SERVICE_RESPONSE;

                // For now, return meeting info and placeholder for attendance
                // This will be enhanced once the schema is updated
                return {
                        status: true,
                        data: {
                                meeting,
                                message: "Meeting-specific attendance will be available after schema update",
                        },
                };
        } catch (err) {
                Logger.error(`AbsensiService.getByMeetingId : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

/**
 * Placeholder for bulk attendance creation
 */
export async function createBulkAbsensiForMeeting(data: AbsensiPerMeetingDTO): Promise<ServiceResponse<any>> {
        try {
                return {
                        status: false,
                        err: {
                                message: "Bulk attendance creation will be available after schema update",
                                code: 501,
                        },
                        data: null,
                };
        } catch (err) {
                Logger.error(`AbsensiService.createBulkAbsensiForMeeting : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

/**
 * Get absensi summary for a jadwal
 */
export async function getAbsensiSummary(jadwalId: string): Promise<ServiceResponse<any>> {
        try {
                const jadwal = await prisma.jadwal.findUnique({
                        where: { id: jadwalId },
                        include: {
                                Meeting: {
                                        orderBy: { pertemuan: "asc" },
                                },
                                matakuliah: true,
                        },
                });

                if (!jadwal) return INVALID_ID_SERVICE_RESPONSE;

                const totalAbsensi = await prisma.absensi.count({
                        where: {
                                jadwalId,
                                deletedAt: null,
                        },
                });

                return {
                        status: true,
                        data: {
                                jadwal,
                                summary: {
                                        totalMeetings: jadwal.Meeting.length,
                                        totalAbsensiRecords: totalAbsensi,
                                        message: "Detailed attendance statistics will be available after schema update",
                                },
                        },
                };
        } catch (err) {
                Logger.error(`AbsensiService.getAbsensiSummary : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}
