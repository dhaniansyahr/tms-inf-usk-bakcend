import { INTERNAL_SERVER_ERROR_SERVICE_RESPONSE, INVALID_ID_SERVICE_RESPONSE, ServiceResponse, BadRequestWithMessage } from "$entities/Service";
import { UpdateMeetingDTO, MeetingWithJadwalDTO } from "$entities/Meeting";
import { FilteringQueryV2, PagedList } from "$entities/Query";
import { buildFilterQueryLimitOffsetV2 } from "./helpers/FilterQueryV2";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { Meeting } from "@prisma/client";

export type UpdateMeetingResponse = Meeting | {};
export type GetAllMeetingsResponse = PagedList<Meeting[]> | {};

/**
 * Update a meeting with validation that update must be at least 1 day before the meeting date
 * @param id - The meeting ID to update
 * @param data - The data to update
 * @returns Promise<ServiceResponse<UpdateMeetingResponse>> Response containing updated meeting or error
 */
export async function updateMeeting(id: string, data: UpdateMeetingDTO): Promise<ServiceResponse<UpdateMeetingResponse>> {
        try {
                // First, get the existing meeting
                const existingMeeting = await prisma.meeting.findUnique({
                        where: { id },
                        include: {
                                jadwal: {
                                        include: {
                                                matakuliah: {
                                                        select: {
                                                                nama: true,
                                                                kode: true,
                                                        },
                                                },
                                                shift: {
                                                        select: {
                                                                startTime: true,
                                                                endTime: true,
                                                        },
                                                },
                                        },
                                },
                        },
                });

                if (!existingMeeting) {
                        return INVALID_ID_SERVICE_RESPONSE;
                }

                // Parse the meeting date (stored as string in YYYY-MM-DD format)
                const meetingDate = new Date(existingMeeting.tanggal + "T00:00:00.000Z");
                const currentDate = new Date();

                // Set current date to start of day for comparison
                currentDate.setHours(0, 0, 0, 0);
                meetingDate.setHours(0, 0, 0, 0);

                // Calculate the difference in days
                const timeDifference = meetingDate.getTime() - currentDate.getTime();
                const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));

                // Validation: Update must be at least 1 day before the meeting
                if (daysDifference < 1) {
                        const matakuliahName = existingMeeting.jadwal?.matakuliah?.nama || "Unknown";
                        const meetingInfo = `Meeting ${existingMeeting.pertemuan} - ${matakuliahName}`;

                        if (daysDifference < 0) {
                                return BadRequestWithMessage(`Cannot update ${meetingInfo}. The meeting date (${existingMeeting.tanggal}) has already passed.`);
                        } else if (daysDifference === 0) {
                                return BadRequestWithMessage(
                                        `Cannot update ${meetingInfo}. The meeting is scheduled for today (${existingMeeting.tanggal}). Updates must be made at least 1 day before the meeting date.`
                                );
                        }
                }

                // If we're updating the tanggal, validate the new date as well
                if (data.tanggal) {
                        const newMeetingDate = new Date(data.tanggal + "T00:00:00.000Z");
                        newMeetingDate.setHours(0, 0, 0, 0);

                        const newTimeDifference = newMeetingDate.getTime() - currentDate.getTime();
                        const newDaysDifference = Math.ceil(newTimeDifference / (1000 * 3600 * 24));

                        if (newDaysDifference < 1) {
                                return BadRequestWithMessage(`Cannot set meeting date to ${data.tanggal}. The new meeting date must be at least 1 day from today.`);
                        }
                }

                // Perform the update
                const updatedMeeting = await prisma.meeting.update({
                        where: { id },
                        data: {
                                ...(data.tanggal && { tanggal: data.tanggal }),
                                ...(data.pertemuan && { pertemuan: data.pertemuan }),
                        },
                        include: {
                                jadwal: {
                                        include: {
                                                matakuliah: {
                                                        select: {
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
                                        },
                                },
                        },
                });

                Logger.info(`Meeting updated successfully: ${updatedMeeting.id} - Pertemuan ${updatedMeeting.pertemuan} on ${updatedMeeting.tanggal}`);

                return {
                        status: true,
                        data: updatedMeeting,
                };
        } catch (err) {
                Logger.error(`MeetingService.updateMeeting : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

/**
 * Get a meeting by ID
 * @param id - The meeting ID
 * @returns Promise<ServiceResponse<MeetingWithJadwalDTO>> Response containing meeting data
 */
export async function getMeetingById(id: string): Promise<ServiceResponse<MeetingWithJadwalDTO | {}>> {
        try {
                const meeting = await prisma.meeting.findUnique({
                        where: { id },
                        include: {
                                jadwal: {
                                        include: {
                                                matakuliah: {
                                                        select: {
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
                                        },
                                },
                        },
                });

                if (!meeting) {
                        return INVALID_ID_SERVICE_RESPONSE;
                }

                return {
                        status: true,
                        data: meeting,
                };
        } catch (err) {
                Logger.error(`MeetingService.getMeetingById : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

/**
 * Check if a meeting can be updated (must be at least 1 day before meeting date)
 * @param id - The meeting ID
 * @returns Promise<ServiceResponse<{canUpdate: boolean, reason?: string, daysUntilMeeting: number}>>
 */
export async function checkMeetingUpdateEligibility(id: string): Promise<ServiceResponse<{ canUpdate: boolean; reason?: string; daysUntilMeeting: number } | {}>> {
        try {
                const meeting = await prisma.meeting.findUnique({
                        where: { id },
                        include: {
                                jadwal: {
                                        include: {
                                                matakuliah: {
                                                        select: {
                                                                nama: true,
                                                                kode: true,
                                                        },
                                                },
                                        },
                                },
                        },
                });

                if (!meeting) {
                        return INVALID_ID_SERVICE_RESPONSE;
                }

                // Parse the meeting date
                const meetingDate = new Date(meeting.tanggal + "T00:00:00.000Z");
                const currentDate = new Date();

                currentDate.setHours(0, 0, 0, 0);
                meetingDate.setHours(0, 0, 0, 0);

                const timeDifference = meetingDate.getTime() - currentDate.getTime();
                const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));

                const canUpdate = daysDifference >= 1;
                let reason: string | undefined;

                if (!canUpdate) {
                        const matakuliahName = meeting.jadwal?.matakuliah?.nama || "Unknown";
                        if (daysDifference < 0) {
                                reason = `Meeting ${meeting.pertemuan} - ${matakuliahName} has already passed (${meeting.tanggal})`;
                        } else if (daysDifference === 0) {
                                reason = `Meeting ${meeting.pertemuan} - ${matakuliahName} is scheduled for today (${meeting.tanggal}). Updates must be made at least 1 day in advance`;
                        }
                }

                return {
                        status: true,
                        data: {
                                canUpdate,
                                reason,
                                daysUntilMeeting: daysDifference,
                        },
                };
        } catch (err) {
                Logger.error(`MeetingService.checkMeetingUpdateEligibility : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

/**
 * Get all meetings for a specific jadwal with pagination
 * @param jadwalId - The jadwal ID to get meetings for
 * @param filters - Pagination and filtering parameters
 * @returns Promise<ServiceResponse<GetAllMeetingsResponse>> Response containing paginated meetings
 */
export async function getAllMeetingsByJadwalId(jadwalId: string, filters: FilteringQueryV2): Promise<ServiceResponse<GetAllMeetingsResponse>> {
        try {
                // First, verify that the jadwal exists
                const jadwal = await prisma.jadwal.findUnique({
                        where: { id: jadwalId },
                        select: { id: true },
                });

                if (!jadwal) {
                        return {
                                status: false,
                                err: { message: "Jadwal not found", code: 404 },
                                data: {},
                        };
                }

                const usedFilters = buildFilterQueryLimitOffsetV2(filters);

                // Set up the where clause for the specific jadwal
                usedFilters.where = {
                        ...usedFilters.where,
                        jadwalId: jadwalId,
                };

                // Set up includes for related data
                usedFilters.include = {
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
                                                        id: true,
                                                        startTime: true,
                                                        endTime: true,
                                                },
                                        },
                                        ruangan: {
                                                select: {
                                                        id: true,
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
                                },
                        },
                };

                // Get meetings and total count in parallel
                const [meetings, totalData] = await Promise.all([
                        prisma.meeting.findMany({
                                ...usedFilters,
                                orderBy: {
                                        pertemuan: "asc", // Order by meeting number
                                },
                        }),
                        prisma.meeting.count({
                                where: usedFilters.where,
                        }),
                ]);

                // Calculate total pages
                let totalPage = 1;
                if (totalData > usedFilters.take) totalPage = Math.ceil(totalData / usedFilters.take);

                return {
                        status: true,
                        data: {
                                entries: meetings,
                                totalData,
                                totalPage,
                        },
                };
        } catch (err) {
                Logger.error(`MeetingService.getAllMeetingsByJadwalId : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

/**
 * Get all meetings for a specific jadwal (without pagination) - useful for simple lists
 * @param jadwalId - The jadwal ID to get meetings for
 * @returns Promise<ServiceResponse<Meeting[]>> Response containing all meetings
 */
export async function getMeetingsByJadwalId(jadwalId: string): Promise<ServiceResponse<Meeting[] | {}>> {
        try {
                // First, verify that the jadwal exists
                const jadwal = await prisma.jadwal.findUnique({
                        where: { id: jadwalId },
                        select: { id: true },
                });

                if (!jadwal) {
                        return {
                                status: false,
                                err: { message: "Jadwal not found", code: 404 },
                                data: {},
                        };
                }

                const meetings = await prisma.meeting.findMany({
                        where: { jadwalId },
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
                                                                id: true,
                                                                startTime: true,
                                                                endTime: true,
                                                        },
                                                },
                                                ruangan: {
                                                        select: {
                                                                id: true,
                                                                nama: true,
                                                                lokasi: true,
                                                        },
                                                },
                                        },
                                },
                        },
                        orderBy: {
                                pertemuan: "asc",
                        },
                });

                return {
                        status: true,
                        data: meetings,
                };
        } catch (err) {
                Logger.error(`MeetingService.getMeetingsByJadwalId : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

export async function getListMahasiswaByJadwalId(jadwalId: string): Promise<ServiceResponse<{}>> {
        try {
                const mahasiswa = await prisma.mahasiswa.findMany({
                        where: {
                                jadwal: {
                                        some: {
                                                id: jadwalId,
                                        },
                                },
                        },
                });

                return {
                        status: true,
                        data: mahasiswa,
                };
        } catch (err) {
                Logger.error(`MeetingService.getListMahasiswaByJadwalId : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

export async function getListParticipantsByJadwalId(jadwalId: string): Promise<ServiceResponse<{}>> {
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

                // Get all dosen for this jadwal
                const dosenList = await prisma.dosen.findMany({
                        where: {
                                jadwalDosen: {
                                        some: {
                                                id: jadwalId,
                                        },
                                },
                        },
                });

                // Get all mahasiswa for this jadwal
                const mahasiswaList = await prisma.mahasiswa.findMany({
                        where: {
                                jadwal: {
                                        some: {
                                                id: jadwalId,
                                        },
                                },
                        },
                });

                // Get all absensi records for this jadwal
                const absensiRecords = await prisma.absensi.findMany({
                        where: {
                                jadwalId: jadwalId,
                        },
                        include: {
                                meeting: true,
                        },
                });

                // Process dosen with their meeting attendance
                const dosenWithMeetings = dosenList.map((dosen) => {
                        const dosenMeetings = meetings.map((meeting) => {
                                // Find absensi record for this dosen and meeting
                                const absensi = absensiRecords.find((record) => record.dosenId === dosen.id && record.meetingId === meeting.id);

                                return {
                                        id: meeting.id,
                                        pertemuan: meeting.pertemuan,
                                        tanggal: meeting.tanggal,
                                        isPresent: absensi ? absensi.isPresent : false,
                                        keterangan: absensi ? absensi.keterangan : null,
                                        waktuAbsen: absensi ? absensi.waktuAbsen : null,
                                };
                        });

                        // Calculate total absences and percentage
                        const totalMeetings = meetings.length;
                        const totalAbsent = dosenMeetings.filter((meeting) => !meeting.isPresent).length;
                        const percentageAbsent = totalMeetings > 0 ? (totalAbsent / totalMeetings) * 100 : 0;

                        return {
                                id: dosen.id,
                                nama: dosen.nama,
                                email: dosen.email,
                                nip: dosen.nip,
                                bidangMinat: dosen.bidangMinat,
                                userLevelId: dosen.userLevelId,
                                type: "dosen",
                                totalAbsent,
                                percentageAbsent: Math.round(percentageAbsent * 100) / 100, // Round to 2 decimal places
                                meetings: dosenMeetings,
                        };
                });

                // Process mahasiswa with their meeting attendance
                const mahasiswaWithMeetings = mahasiswaList.map((mahasiswa) => {
                        const mahasiswaMeetings = meetings.map((meeting) => {
                                // Find absensi record for this mahasiswa and meeting
                                const absensi = absensiRecords.find((record) => record.mahasiswaId === mahasiswa.id && record.meetingId === meeting.id);

                                return {
                                        id: meeting.id,
                                        pertemuan: meeting.pertemuan,
                                        tanggal: meeting.tanggal,
                                        isPresent: absensi ? absensi.isPresent : false,
                                        keterangan: absensi ? absensi.keterangan : null,
                                        waktuAbsen: absensi ? absensi.waktuAbsen : null,
                                };
                        });

                        // Calculate total absences and percentage
                        const totalMeetings = meetings.length;
                        const totalAbsent = mahasiswaMeetings.filter((meeting) => !meeting.isPresent).length;
                        const percentageAbsent = totalMeetings > 0 ? (totalAbsent / totalMeetings) * 100 : 0;

                        return {
                                id: mahasiswa.id,
                                nama: mahasiswa.nama,
                                npm: mahasiswa.npm,
                                semester: mahasiswa.semester,
                                tahunMasuk: mahasiswa.tahunMasuk,
                                isActive: mahasiswa.isActive,
                                userLevelId: mahasiswa.userLevelId,
                                type: "mahasiswa",
                                totalAbsent,
                                percentageAbsent: Math.round(percentageAbsent * 100) / 100, // Round to 2 decimal places
                                meetings: mahasiswaMeetings,
                        };
                });

                // Combine dosen first, then mahasiswa
                const participants = [...dosenWithMeetings, ...mahasiswaWithMeetings];

                return {
                        status: true,
                        data: participants,
                };
        } catch (err) {
                Logger.error(`MeetingService.getListParticipantsByJadwalId : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}
