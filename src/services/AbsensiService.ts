import { FilteringQueryV2, PagedList } from "$entities/Query";
import { BadRequestWithMessage, INTERNAL_SERVER_ERROR_SERVICE_RESPONSE, INVALID_ID_SERVICE_RESPONSE, ServiceResponse } from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { Absensi } from "@prisma/client";
import { CreateAbsensiDTO, UpdateAbsensiDTO, AbsensiPerMeetingDTO, MeetingAttendanceResponse } from "$entities/Absensi";
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
 * Get all meetings and attendance data for a specific jadwal with comprehensive statistics
 */
export async function getAllMeetingsAbsensiByJadwal(jadwalId: string): Promise<ServiceResponse<any>> {
        try {
                // Get jadwal with basic info
                const jadwal = await prisma.jadwal.findUnique({
                        where: { id: jadwalId },
                        include: {
                                matakuliah: {
                                        select: {
                                                id: true,
                                                nama: true,
                                                kode: true,
                                                sks: true,
                                        },
                                },
                                shift: {
                                        select: {
                                                startTime: true,
                                                endTime: true,
                                        },
                                },
                                ruangan: {
                                        select: {
                                                nama: true,
                                                lokasi: true,
                                        },
                                },
                                dosen: {
                                        select: {
                                                id: true,
                                                nama: true,
                                                nip: true,
                                        },
                                },
                                mahasiswa: {
                                        select: {
                                                id: true,
                                                nama: true,
                                                npm: true,
                                                semester: true,
                                        },
                                        where: { isActive: true },
                                        orderBy: { nama: "asc" },
                                },
                        },
                });

                if (!jadwal) return INVALID_ID_SERVICE_RESPONSE;

                // Get all meetings for this jadwal
                const meetings = await prisma.meeting.findMany({
                        where: { jadwalId },
                        orderBy: { pertemuan: "asc" },
                });

                // Get all attendance records for this jadwal
                const allAbsensiRecords = await prisma.absensi.findMany({
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
                                                semester: true,
                                        },
                                },
                                dosen: {
                                        select: {
                                                id: true,
                                                nama: true,
                                                nip: true,
                                        },
                                },
                        },
                });

                // Group attendance records by meeting ID
                const absensiByMeeting = new Map<string, typeof allAbsensiRecords>();
                allAbsensiRecords.forEach((record) => {
                        if (record.meetingId) {
                                if (!absensiByMeeting.has(record.meetingId)) {
                                        absensiByMeeting.set(record.meetingId, []);
                                }
                                absensiByMeeting.get(record.meetingId)!.push(record);
                        }
                });

                // Process each meeting with its attendance data
                const meetingsWithAttendance = meetings.map((meeting) => {
                        const absensiRecords = absensiByMeeting.get(meeting.id) || [];

                        // Create attendance maps for quick lookup
                        const mahasiswaAttendanceMap = new Map();
                        const dosenAttendanceMap = new Map();

                        absensiRecords.forEach((record) => {
                                if (record.mahasiswaId) {
                                        mahasiswaAttendanceMap.set(record.mahasiswaId, {
                                                isPresent: record.isPresent,
                                                waktuAbsen: record.waktuAbsen,
                                                keterangan: record.keterangan,
                                                absensiId: record.id,
                                        });
                                }
                                if (record.dosenId) {
                                        dosenAttendanceMap.set(record.dosenId, {
                                                isPresent: record.isPresent,
                                                waktuAbsen: record.waktuAbsen,
                                                keterangan: record.keterangan,
                                                absensiId: record.id,
                                        });
                                }
                        });

                        // Process mahasiswa attendance
                        const mahasiswaAttendance = jadwal.mahasiswa.map((mahasiswa) => {
                                const attendanceData = mahasiswaAttendanceMap.get(mahasiswa.id);
                                return {
                                        id: mahasiswa.id,
                                        nama: mahasiswa.nama,
                                        npm: mahasiswa.npm,
                                        semester: mahasiswa.semester,
                                        isPresent: attendanceData?.isPresent || false,
                                        waktuAbsen: attendanceData?.waktuAbsen || null,
                                        keterangan: attendanceData?.keterangan || null,
                                        absensiId: attendanceData?.absensiId || null,
                                        hasAbsensi: !!attendanceData,
                                };
                        });

                        // Process dosen attendance
                        const dosenAttendance = jadwal.dosen.map((dosen) => {
                                const attendanceData = dosenAttendanceMap.get(dosen.id);
                                return {
                                        id: dosen.id,
                                        nama: dosen.nama,
                                        nip: dosen.nip,
                                        isPresent: attendanceData?.isPresent || false,
                                        waktuAbsen: attendanceData?.waktuAbsen || null,
                                        keterangan: attendanceData?.keterangan || null,
                                        absensiId: attendanceData?.absensiId || null,
                                        hasAbsensi: !!attendanceData,
                                };
                        });

                        // Calculate statistics for this meeting
                        const totalMahasiswa = mahasiswaAttendance.length;
                        const mahasiswaPresentCount = mahasiswaAttendance.filter((m) => m.isPresent).length;
                        const mahasiswaAbsentCount = totalMahasiswa - mahasiswaPresentCount;
                        const mahasiswaAttendancePercentage = totalMahasiswa > 0 ? Math.round((mahasiswaPresentCount / totalMahasiswa) * 100) : 0;

                        const totalDosen = dosenAttendance.length;
                        const dosenPresentCount = dosenAttendance.filter((d) => d.isPresent).length;
                        const dosenAbsentCount = totalDosen - dosenPresentCount;
                        const dosenAttendancePercentage = totalDosen > 0 ? Math.round((dosenPresentCount / totalDosen) * 100) : 0;

                        const totalParticipants = totalMahasiswa + totalDosen;
                        const totalPresentCount = mahasiswaPresentCount + dosenPresentCount;
                        const totalAbsentCount = totalParticipants - totalPresentCount;
                        const overallAttendancePercentage = totalParticipants > 0 ? Math.round((totalPresentCount / totalParticipants) * 100) : 0;

                        return {
                                meeting: {
                                        id: meeting.id,
                                        tanggal: meeting.tanggal,
                                        pertemuan: meeting.pertemuan,
                                },
                                attendance: {
                                        mahasiswa: mahasiswaAttendance,
                                        dosen: dosenAttendance,
                                },
                                statistics: {
                                        mahasiswa: {
                                                total: totalMahasiswa,
                                                present: mahasiswaPresentCount,
                                                absent: mahasiswaAbsentCount,
                                                attendancePercentage: mahasiswaAttendancePercentage,
                                        },
                                        dosen: {
                                                total: totalDosen,
                                                present: dosenPresentCount,
                                                absent: dosenAbsentCount,
                                                attendancePercentage: dosenAttendancePercentage,
                                        },
                                        overall: {
                                                totalParticipants,
                                                totalPresent: totalPresentCount,
                                                totalAbsent: totalAbsentCount,
                                                attendancePercentage: overallAttendancePercentage,
                                        },
                                },
                                summary: {
                                        attendanceStatus: overallAttendancePercentage >= 75 ? "BAIK" : overallAttendancePercentage >= 50 ? "CUKUP" : "KURANG",
                                        meetingStatus: totalPresentCount > 0 ? "BERLANGSUNG" : "TIDAK_ADA_PESERTA",
                                },
                        };
                });

                // Calculate overall statistics across all meetings
                const totalMeetings = meetingsWithAttendance.length;
                const totalMahasiswaEnrollment = jadwal.mahasiswa.length;
                const totalDosenAssignment = jadwal.dosen.length;

                // Calculate attendance rates across all meetings
                const allMeetingStats = meetingsWithAttendance.map((m) => m.statistics.overall);
                const averageAttendanceRate =
                        allMeetingStats.length > 0 ? Math.round(allMeetingStats.reduce((sum, stat) => sum + stat.attendancePercentage, 0) / allMeetingStats.length) : 0;

                const totalPossibleAttendance = totalMeetings * (totalMahasiswaEnrollment + totalDosenAssignment);
                const totalActualPresent = allMeetingStats.reduce((sum, stat) => sum + stat.totalPresent, 0);
                const totalActualAbsent = allMeetingStats.reduce((sum, stat) => sum + stat.totalAbsent, 0);

                return {
                        status: true,
                        data: {
                                jadwal: {
                                        id: jadwal.id,
                                        hari: jadwal.hari,
                                        semester: jadwal.semester,
                                        tahun: jadwal.tahun,
                                        matakuliah: jadwal.matakuliah,
                                        shift: jadwal.shift,
                                        ruangan: jadwal.ruangan,
                                        totalMahasiswa: totalMahasiswaEnrollment,
                                        totalDosen: totalDosenAssignment,
                                },
                                meetings: meetingsWithAttendance,
                                overallStatistics: {
                                        totalMeetings,
                                        totalMahasiswaEnrollment,
                                        totalDosenAssignment,
                                        totalPossibleAttendance,
                                        totalActualPresent,
                                        totalActualAbsent,
                                        averageAttendanceRate,
                                        attendanceQuality: averageAttendanceRate >= 75 ? "BAIK" : averageAttendanceRate >= 50 ? "CUKUP" : "KURANG",
                                        completionStatus: totalMeetings >= 14 ? "SELESAI" : totalMeetings >= 7 ? "SETENGAH_SEMESTER" : "AWAL_SEMESTER",
                                },
                                participantSummary: {
                                        mahasiswa: jadwal.mahasiswa,
                                        dosen: jadwal.dosen,
                                },
                                lastUpdated: new Date().toISOString(),
                        },
                };
        } catch (err) {
                Logger.error(`AbsensiService.getAllMeetingsAbsensiByJadwal : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

/**
 * Legacy function - kept for backward compatibility
 * @deprecated Use getAllMeetingsAbsensiByJadwal instead
 */
export async function getByJadwalId(jadwalId: string): Promise<ServiceResponse<any>> {
        return getAllMeetingsAbsensiByJadwal(jadwalId);
}

/**
 * Get comprehensive attendance data for a specific meeting
 * Includes meeting info, attendance status, and statistics
 */
export async function getAbsensiByMeeting(meetingId: string): Promise<ServiceResponse<MeetingAttendanceResponse | {}>> {
        try {
                // Get meeting with jadwal details
                const meeting = await prisma.meeting.findUnique({
                        where: { id: meetingId },
                        include: {
                                jadwal: {
                                        include: {
                                                matakuliah: {
                                                        select: {
                                                                id: true,
                                                                nama: true,
                                                                kode: true,
                                                                sks: true,
                                                        },
                                                },
                                                shift: {
                                                        select: {
                                                                startTime: true,
                                                                endTime: true,
                                                        },
                                                },
                                                ruangan: {
                                                        select: {
                                                                nama: true,
                                                                lokasi: true,
                                                        },
                                                },
                                                dosen: {
                                                        select: {
                                                                id: true,
                                                                nama: true,
                                                                nip: true,
                                                        },
                                                },
                                                mahasiswa: {
                                                        select: {
                                                                id: true,
                                                                nama: true,
                                                                npm: true,
                                                                semester: true,
                                                        },
                                                        where: { isActive: true },
                                                        orderBy: { nama: "asc" },
                                                },
                                        },
                                },
                        },
                });

                if (!meeting) return INVALID_ID_SERVICE_RESPONSE;

                // Get all attendance records for this meeting
                const absensiRecords = await prisma.absensi.findMany({
                        where: {
                                meetingId: meetingId,
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
                                dosen: {
                                        select: {
                                                id: true,
                                                nama: true,
                                                nip: true,
                                        },
                                },
                        },
                });

                // Create attendance maps for quick lookup
                const mahasiswaAttendanceMap = new Map();
                const dosenAttendanceMap = new Map();

                absensiRecords.forEach((record) => {
                        if (record.mahasiswaId) {
                                mahasiswaAttendanceMap.set(record.mahasiswaId, {
                                        isPresent: record.isPresent,
                                        waktuAbsen: record.waktuAbsen,
                                        keterangan: record.keterangan,
                                        absensiId: record.id,
                                });
                        }
                        if (record.dosenId) {
                                dosenAttendanceMap.set(record.dosenId, {
                                        isPresent: record.isPresent,
                                        waktuAbsen: record.waktuAbsen,
                                        keterangan: record.keterangan,
                                        absensiId: record.id,
                                });
                        }
                });

                // Process mahasiswa attendance
                const mahasiswaAttendance =
                        meeting.jadwal?.mahasiswa.map((mahasiswa) => {
                                const attendanceData = mahasiswaAttendanceMap.get(mahasiswa.id);
                                return {
                                        id: mahasiswa.id,
                                        nama: mahasiswa.nama,
                                        npm: mahasiswa.npm,
                                        semester: mahasiswa.semester,
                                        isPresent: attendanceData?.isPresent || false,
                                        waktuAbsen: attendanceData?.waktuAbsen || null,
                                        keterangan: attendanceData?.keterangan || null,
                                        absensiId: attendanceData?.absensiId || null,
                                        hasAbsensi: !!attendanceData,
                                };
                        }) || [];

                // Process dosen attendance
                const dosenAttendance =
                        meeting.jadwal?.dosen.map((dosen) => {
                                const attendanceData = dosenAttendanceMap.get(dosen.id);
                                return {
                                        id: dosen.id,
                                        nama: dosen.nama,
                                        nip: dosen.nip,
                                        isPresent: attendanceData?.isPresent || false,
                                        waktuAbsen: attendanceData?.waktuAbsen || null,
                                        keterangan: attendanceData?.keterangan || null,
                                        absensiId: attendanceData?.absensiId || null,
                                        hasAbsensi: !!attendanceData,
                                };
                        }) || [];

                // Calculate statistics for mahasiswa
                const totalMahasiswa = mahasiswaAttendance.length;
                const mahasiswaPresentCount = mahasiswaAttendance.filter((m) => m.isPresent).length;
                const mahasiswaAbsentCount = totalMahasiswa - mahasiswaPresentCount;
                const mahasiswaAttendancePercentage = totalMahasiswa > 0 ? Math.round((mahasiswaPresentCount / totalMahasiswa) * 100) : 0;

                // Calculate statistics for dosen
                const totalDosen = dosenAttendance.length;
                const dosenPresentCount = dosenAttendance.filter((d) => d.isPresent).length;
                const dosenAbsentCount = totalDosen - dosenPresentCount;
                const dosenAttendancePercentage = totalDosen > 0 ? Math.round((dosenPresentCount / totalDosen) * 100) : 0;

                // Overall statistics
                const totalParticipants = totalMahasiswa + totalDosen;
                const totalPresentCount = mahasiswaPresentCount + dosenPresentCount;
                const totalAbsentCount = totalParticipants - totalPresentCount;
                const overallAttendancePercentage = totalParticipants > 0 ? Math.round((totalPresentCount / totalParticipants) * 100) : 0;

                return {
                        status: true,
                        data: {
                                meeting: {
                                        id: meeting.id,
                                        tanggal: meeting.tanggal,
                                        pertemuan: meeting.pertemuan,
                                        jadwal: meeting.jadwal
                                                ? {
                                                          id: meeting.jadwal.id,
                                                          hari: meeting.jadwal.hari,
                                                          semester: meeting.jadwal.semester,
                                                          tahun: meeting.jadwal.tahun,
                                                          matakuliah: meeting.jadwal.matakuliah,
                                                          shift: meeting.jadwal.shift,
                                                          ruangan: meeting.jadwal.ruangan,
                                                  }
                                                : null,
                                },
                                attendance: {
                                        mahasiswa: mahasiswaAttendance,
                                        dosen: dosenAttendance,
                                },
                                statistics: {
                                        mahasiswa: {
                                                total: totalMahasiswa,
                                                present: mahasiswaPresentCount,
                                                absent: mahasiswaAbsentCount,
                                                attendancePercentage: mahasiswaAttendancePercentage,
                                        },
                                        dosen: {
                                                total: totalDosen,
                                                present: dosenPresentCount,
                                                absent: dosenAbsentCount,
                                                attendancePercentage: dosenAttendancePercentage,
                                        },
                                        overall: {
                                                totalParticipants,
                                                totalPresent: totalPresentCount,
                                                totalAbsent: totalAbsentCount,
                                                attendancePercentage: overallAttendancePercentage,
                                        },
                                },
                                summary: {
                                        attendanceStatus: overallAttendancePercentage >= 75 ? "BAIK" : overallAttendancePercentage >= 50 ? "CUKUP" : "KURANG",
                                        meetingStatus: totalPresentCount > 0 ? "BERLANGSUNG" : "TIDAK_ADA_PESERTA",
                                        lastUpdated: new Date().toISOString(),
                                },
                        },
                };
        } catch (err) {
                Logger.error(`AbsensiService.getAbsensiByMeeting : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

/**
 * Get all meetings with their attendance data and statistics
 */
export async function getAllMeetingsWithAbsensi(filters?: { jadwalId?: string; semester?: string; tahun?: string }): Promise<ServiceResponse<any>> {
        try {
                // Build where clause for meetings
                let whereClause: any = {};

                if (filters?.jadwalId) {
                        whereClause.jadwalId = filters.jadwalId;
                }

                if (filters?.semester || filters?.tahun) {
                        whereClause.jadwal = {};
                        if (filters.semester) {
                                whereClause.jadwal.semester = filters.semester;
                        }
                        if (filters.tahun) {
                                whereClause.jadwal.tahun = filters.tahun;
                        }
                }

                // Get all meetings with their related data
                const meetings = await prisma.meeting.findMany({
                        where: whereClause,
                        include: {
                                jadwal: {
                                        include: {
                                                matakuliah: {
                                                        select: {
                                                                id: true,
                                                                nama: true,
                                                                kode: true,
                                                                sks: true,
                                                        },
                                                },
                                                shift: {
                                                        select: {
                                                                startTime: true,
                                                                endTime: true,
                                                        },
                                                },
                                                ruangan: {
                                                        select: {
                                                                nama: true,
                                                                lokasi: true,
                                                        },
                                                },
                                                dosen: {
                                                        select: {
                                                                id: true,
                                                                nama: true,
                                                                nip: true,
                                                        },
                                                },
                                                mahasiswa: {
                                                        select: {
                                                                id: true,
                                                                nama: true,
                                                                npm: true,
                                                                semester: true,
                                                        },
                                                        where: { isActive: true },
                                                },
                                        },
                                },
                        },
                        orderBy: [{ jadwal: { matakuliah: { nama: "asc" } } }, { pertemuan: "asc" }],
                });

                // Get all attendance records for these meetings
                const meetingIds = meetings.map((meeting) => meeting.id);
                const allAbsensiRecords = await prisma.absensi.findMany({
                        where: {
                                meetingId: { in: meetingIds },
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
                                dosen: {
                                        select: {
                                                id: true,
                                                nama: true,
                                                nip: true,
                                        },
                                },
                        },
                });

                // Group attendance records by meeting ID
                const absensiByMeeting = new Map<string, typeof allAbsensiRecords>();
                allAbsensiRecords.forEach((record) => {
                        if (!absensiByMeeting.has(record.meetingId!)) {
                                absensiByMeeting.set(record.meetingId!, []);
                        }
                        absensiByMeeting.get(record.meetingId!)!.push(record);
                });

                // Process each meeting with its attendance data
                const meetingsWithAttendance = await Promise.all(
                        meetings.map(async (meeting) => {
                                const absensiRecords = absensiByMeeting.get(meeting.id) || [];

                                // Create attendance maps for quick lookup
                                const mahasiswaAttendanceMap = new Map();
                                const dosenAttendanceMap = new Map();

                                absensiRecords.forEach((record) => {
                                        if (record.mahasiswaId) {
                                                mahasiswaAttendanceMap.set(record.mahasiswaId, {
                                                        isPresent: record.isPresent,
                                                        waktuAbsen: record.waktuAbsen,
                                                        keterangan: record.keterangan,
                                                        absensiId: record.id,
                                                });
                                        }
                                        if (record.dosenId) {
                                                dosenAttendanceMap.set(record.dosenId, {
                                                        isPresent: record.isPresent,
                                                        waktuAbsen: record.waktuAbsen,
                                                        keterangan: record.keterangan,
                                                        absensiId: record.id,
                                                });
                                        }
                                });

                                // Process mahasiswa attendance
                                const mahasiswaAttendance =
                                        meeting.jadwal?.mahasiswa.map((mahasiswa) => {
                                                const attendanceData = mahasiswaAttendanceMap.get(mahasiswa.id);
                                                return {
                                                        id: mahasiswa.id,
                                                        nama: mahasiswa.nama,
                                                        npm: mahasiswa.npm,
                                                        semester: mahasiswa.semester,
                                                        isPresent: attendanceData?.isPresent || false,
                                                        waktuAbsen: attendanceData?.waktuAbsen || null,
                                                        keterangan: attendanceData?.keterangan || null,
                                                        absensiId: attendanceData?.absensiId || null,
                                                        hasAbsensi: !!attendanceData,
                                                };
                                        }) || [];

                                // Process dosen attendance
                                const dosenAttendance =
                                        meeting.jadwal?.dosen.map((dosen) => {
                                                const attendanceData = dosenAttendanceMap.get(dosen.id);
                                                return {
                                                        id: dosen.id,
                                                        nama: dosen.nama,
                                                        nip: dosen.nip,
                                                        isPresent: attendanceData?.isPresent || false,
                                                        waktuAbsen: attendanceData?.waktuAbsen || null,
                                                        keterangan: attendanceData?.keterangan || null,
                                                        absensiId: attendanceData?.absensiId || null,
                                                        hasAbsensi: !!attendanceData,
                                                };
                                        }) || [];

                                // Calculate statistics
                                const totalMahasiswa = mahasiswaAttendance.length;
                                const mahasiswaPresentCount = mahasiswaAttendance.filter((m) => m.isPresent).length;
                                const mahasiswaAbsentCount = totalMahasiswa - mahasiswaPresentCount;
                                const mahasiswaAttendancePercentage = totalMahasiswa > 0 ? Math.round((mahasiswaPresentCount / totalMahasiswa) * 100) : 0;

                                const totalDosen = dosenAttendance.length;
                                const dosenPresentCount = dosenAttendance.filter((d) => d.isPresent).length;
                                const dosenAbsentCount = totalDosen - dosenPresentCount;
                                const dosenAttendancePercentage = totalDosen > 0 ? Math.round((dosenPresentCount / totalDosen) * 100) : 0;

                                const totalParticipants = totalMahasiswa + totalDosen;
                                const totalPresentCount = mahasiswaPresentCount + dosenPresentCount;
                                const totalAbsentCount = totalParticipants - totalPresentCount;
                                const overallAttendancePercentage = totalParticipants > 0 ? Math.round((totalPresentCount / totalParticipants) * 100) : 0;

                                return {
                                        meeting: {
                                                id: meeting.id,
                                                tanggal: meeting.tanggal,
                                                pertemuan: meeting.pertemuan,
                                                jadwal: meeting.jadwal
                                                        ? {
                                                                  id: meeting.jadwal.id,
                                                                  hari: meeting.jadwal.hari,
                                                                  semester: meeting.jadwal.semester,
                                                                  tahun: meeting.jadwal.tahun,
                                                                  matakuliah: meeting.jadwal.matakuliah,
                                                                  shift: meeting.jadwal.shift,
                                                                  ruangan: meeting.jadwal.ruangan,
                                                          }
                                                        : null,
                                        },
                                        attendance: {
                                                mahasiswa: mahasiswaAttendance,
                                                dosen: dosenAttendance,
                                        },
                                        statistics: {
                                                mahasiswa: {
                                                        total: totalMahasiswa,
                                                        present: mahasiswaPresentCount,
                                                        absent: mahasiswaAbsentCount,
                                                        attendancePercentage: mahasiswaAttendancePercentage,
                                                },
                                                dosen: {
                                                        total: totalDosen,
                                                        present: dosenPresentCount,
                                                        absent: dosenAbsentCount,
                                                        attendancePercentage: dosenAttendancePercentage,
                                                },
                                                overall: {
                                                        totalParticipants,
                                                        totalPresent: totalPresentCount,
                                                        totalAbsent: totalAbsentCount,
                                                        attendancePercentage: overallAttendancePercentage,
                                                },
                                        },
                                        summary: {
                                                attendanceStatus: overallAttendancePercentage >= 75 ? "BAIK" : overallAttendancePercentage >= 50 ? "CUKUP" : "KURANG",
                                                meetingStatus: totalPresentCount > 0 ? "BERLANGSUNG" : "TIDAK_ADA_PESERTA",
                                        },
                                };
                        })
                );

                // Calculate overall summary statistics
                const totalMeetings = meetingsWithAttendance.length;
                const totalParticipantsAcrossAllMeetings = meetingsWithAttendance.reduce((sum, meeting) => sum + meeting.statistics.overall.totalParticipants, 0);
                const totalPresentAcrossAllMeetings = meetingsWithAttendance.reduce((sum, meeting) => sum + meeting.statistics.overall.totalPresent, 0);
                const totalAbsentAcrossAllMeetings = meetingsWithAttendance.reduce((sum, meeting) => sum + meeting.statistics.overall.totalAbsent, 0);
                const overallAverageAttendance =
                        totalParticipantsAcrossAllMeetings > 0 ? Math.round((totalPresentAcrossAllMeetings / totalParticipantsAcrossAllMeetings) * 100) : 0;

                return {
                        status: true,
                        data: {
                                meetings: meetingsWithAttendance,
                                summary: {
                                        totalMeetings,
                                        totalParticipantsAcrossAllMeetings,
                                        totalPresentAcrossAllMeetings,
                                        totalAbsentAcrossAllMeetings,
                                        overallAverageAttendance,
                                        attendanceQuality: overallAverageAttendance >= 75 ? "BAIK" : overallAverageAttendance >= 50 ? "CUKUP" : "KURANG",
                                        lastUpdated: new Date().toISOString(),
                                },
                        },
                };
        } catch (err) {
                Logger.error(`AbsensiService.getAllMeetingsWithAbsensi : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

/**
 * Legacy function - kept for backward compatibility
 * @deprecated Use getAbsensiByMeeting instead
 */
export async function getByMeetingId(meetingId: string): Promise<ServiceResponse<any>> {
        return getAbsensiByMeeting(meetingId);
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

export async function getAbsensiByJadwalIdAndMahasiswaId(jadwalId: string, userId: string): Promise<ServiceResponse<{}>> {
        try {
                // Get all meetings for this jadwal
                const meetings = await prisma.meeting.findMany({
                        where: {
                                jadwalId: jadwalId,
                        },
                        orderBy: {
                                pertemuan: "asc",
                        },
                });

                if (!meetings.length) {
                        return {
                                status: true,
                                data: {
                                        meetings: [],
                                        totalPresent: 0,
                                        totalAbsent: 0,
                                        attendancePercentage: 0,
                                },
                        };
                }

                // Get all attendance records for this user (student or lecturer) across these meetings
                const absensiRecords = await prisma.absensi.findMany({
                        where: {
                                jadwalId: jadwalId,
                                OR: [{ mahasiswaId: userId }, { dosenId: userId }],
                                deletedAt: null,
                        },
                        include: {
                                meeting: true,
                        },
                });

                // Create attendance map for quick lookup
                const attendanceMap = new Map();
                absensiRecords.forEach((record) => {
                        attendanceMap.set(record.meetingId, {
                                isPresent: record.isPresent,
                                keterangan: record.keterangan,
                                waktuAbsen: record.waktuAbsen,
                                role: record.mahasiswaId ? "mahasiswa" : "dosen",
                        });
                });

                // Build comprehensive attendance data
                const attendanceData = meetings.map((meeting) => {
                        const attendance = attendanceMap.get(meeting.id) || {
                                isPresent: false,
                                keterangan: null,
                                waktuAbsen: null,
                                role: null,
                        };

                        return {
                                meetingId: meeting.id,
                                pertemuan: meeting.pertemuan,
                                tanggal: meeting.tanggal,
                                ...attendance,
                        };
                });

                // Calculate statistics
                const totalPresent = attendanceData.filter((record) => record.isPresent).length;
                const totalMeetings = meetings.length;
                const attendancePercentage = (totalPresent / totalMeetings) * 100;

                return {
                        status: true,
                        data: {
                                meetings: attendanceData,
                                totalPresent,
                                totalAbsent: totalMeetings - totalPresent,
                                attendancePercentage: Math.round(attendancePercentage * 100) / 100,
                                role: attendanceData.find((record) => record.role)?.role || null,
                        },
                };
        } catch (error) {
                Logger.error(`AbsensiService.getAbsensiByJadwalIdAndMahasiswaId : ${error}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}
