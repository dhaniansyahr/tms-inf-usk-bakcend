import { FilteringQueryV2, PagedList } from "$entities/Query";
import {
    BadRequestWithMessage,
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
    ServiceResponse,
} from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { Absensi, BIDANG_MINAT, Jadwal, SEMESTER } from "@prisma/client";
import {
    AbsentDTO,
    JadwalDTO,
    UpdateMeetingDTO,
    JadwalExcelResult,
    JadwalExcelRow,
    UpdateJadwalDTO,
} from "$entities/Jadwal";
import { buildFilterQueryLimitOffsetV2 } from "./helpers/FilterQueryV2";
import { HARI, HARI_LIST, jadwalGeneticService } from "./JadwalGeneticService";
import { getCurrentAcademicYear, isGanjilSemester } from "$utils/strings.utils";
import { UserJWTDAO } from "$entities/User";
import { ulid } from "ulid";
import { DateTime } from "luxon";
import bcrypt from "bcrypt";
import { createMeetingDates, hasConflict } from "./helpers/jadwal";

export type CreateResponse = Jadwal | {};
export async function create(
    data: JadwalDTO
): Promise<ServiceResponse<CreateResponse>> {
    try {
        // Get matakuliah details to determine course type
        const matakuliah = await prisma.matakuliah.findUnique({
            where: { id: data.matakuliahId },
        });

        if (!matakuliah) {
            return BadRequestWithMessage("Matakuliah tidak ditemukan!");
        }

        let namaTeori = matakuliah.nama;
        if (namaTeori.toUpperCase().startsWith("PRAKTIKUM ")) {
            namaTeori = namaTeori.substring("PRAKTIKUM ".length);
        }

        // Cari matakuliah teori berdasarkan nama yang sudah diambil
        const findTeoriMK = await prisma.jadwal.findFirst({
            where: {
                matakuliah: {
                    nama: namaTeori,
                },
            },
            include: {
                dosen: true,
            },
        });

        if (!findTeoriMK)
            return BadRequestWithMessage(
                "Matakuliah teori untuk mk tersebut tidak ditemukan!"
            );

        const existingSchedules =
            await jadwalGeneticService.getExistingSchedules();

        if (!existingSchedules)
            return BadRequestWithMessage("Tidak ada Jadwal yang ditemukan!");

        const scheduleForValidation = {
            id: data.id,
            matakuliahId: data.matakuliahId,
            ruanganId: data.ruanganId,
            shiftId: data.shiftId,
            dosenIds: findTeoriMK.dosen.map((dosen) => dosen.id),
            hari: data.hari,
            semester: isGanjilSemester() ? SEMESTER.GENAP : SEMESTER.GANJIL,
            tahun: getCurrentAcademicYear(),
            asistenLabIds: data.asistenLabIds || [],
            fitness: 0,
        };

        // Use the detailed conflict checker from helpers/jadwal.ts
        const conflictList = await hasConflict(scheduleForValidation);

        if (conflictList && conflictList.length > 0) {
            if (!data.isOverride)
                return {
                    status: false,
                    err: {
                        message: "Terjadi Konflik dengan jadwal lainnya!",
                        code: 409,
                    },
                    data: conflictList,
                };
        }

        const { dosenIds, mahasiswaIds, asistenLabIds, ...jadwalData } = data;

        // Create jadwal
        const jadwal = await prisma.jadwal.create({
            data: {
                ...jadwalData,
                semester: isGanjilSemester() ? SEMESTER.GENAP : SEMESTER.GANJIL,
                tahun: getCurrentAcademicYear(),
                dosen: {
                    connect: findTeoriMK.dosen.map((dosen) => ({
                        id: dosen.id,
                    })),
                },
            },
        });

        // Generate meeting dates and create meeting records
        const meetingDates = await createMeetingDates(jadwal.id);

        // Delete old meetings if any (defensive, in case of re-creation)
        await prisma.meeting.deleteMany({
            where: { jadwalId: jadwal.id },
        });

        // Create new meeting records
        await Promise.all(
            meetingDates.map((dateStr, index) =>
                prisma.meeting.create({
                    data: {
                        id: ulid(),
                        jadwalId: jadwal.id,
                        tanggal: dateStr, // Using string instead of Date
                        pertemuan: index + 1,
                    },
                })
            )
        );

        // Return jadwal after updating/creating meetings
        const jadwalAfterMeeting = await prisma.jadwal.findUnique({
            where: { id: jadwal.id },
            include: {
                dosen: true,
                mahasiswa: true,
                asisten: true,
                matakuliah: true,
                ruangan: true,
                shift: true,
                Meeting: true,
            },
        });

        // If for some reason jadwalAfterMeeting is null, return empty object
        return {
            status: true,
            data: jadwalAfterMeeting ?? {},
        };
    } catch (err) {
        Logger.error(`JadwalService.create : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetAllResponse = PagedList<Jadwal[]> | {};
export async function getAll(
    filters: FilteringQueryV2,
    user: UserJWTDAO
): Promise<ServiceResponse<GetAllResponse>> {
    try {
        const usedFilters = buildFilterQueryLimitOffsetV2(filters);

        // Build base include configuration
        const includeConfig = {
            ruangan: {
                select: {
                    nama: true,
                    lokasi: true,
                },
            },
            shift: {
                select: {
                    startTime: true,
                    endTime: true,
                },
            },
            dosen: {
                select: {
                    nama: true,
                    nip: true,
                },
            },
            matakuliah: {
                select: {
                    nama: true,
                    kode: true,
                    sks: true,
                },
            },
            mahasiswa: {
                select: {
                    id: true,
                    nama: true,
                    npm: true,
                    semester: true,
                },
            },
            asisten: {
                include: {
                    Mahasiswa: {
                        select: {
                            nama: true,
                            npm: true,
                        },
                    },
                },
            },
        };

        // Build base where conditions
        const baseWhere = {
            ...usedFilters.where,
            matakuliah: {
                nama: {
                    contains: "PRAKTIKUM",
                },
            },
            semester: isGanjilSemester() ? SEMESTER.GENAP : SEMESTER.GANJIL,
        };

        // Add role-based filtering
        const roleBasedWhere = { ...baseWhere };

        switch (user.userLevel.name) {
            case "DOSEN":
                roleBasedWhere.dosen = {
                    some: {
                        id: user.id,
                    },
                };
                break;
            case "MAHASISWA":
                roleBasedWhere.mahasiswa = {
                    some: {
                        id: user.id,
                    },
                };
                break;
            // SUPER_ADMIN and other roles see all data
        }

        // Build final query configuration
        const queryConfig = {
            ...usedFilters,
            include: includeConfig,
            where: roleBasedWhere,
            orderBy: [
                { hari: "desc" as const },
                { shift: { startTime: "asc" as const } },
            ],
        };

        // Execute queries in parallel
        const [jadwal, totalData] = await Promise.all([
            prisma.jadwal.findMany(queryConfig),
            prisma.jadwal.count({
                where: roleBasedWhere,
            }),
        ]);

        // Calculate pagination
        const totalPage = Math.ceil(totalData / usedFilters.take);

        return {
            status: true,
            data: {
                entries: jadwal,
                totalData,
                totalPage,
            },
        };
    } catch (err) {
        Logger.error(`JadwalService.getAll : ${err} `);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type GetByIdResponse = Jadwal | {};
export async function getById(
    id: string
): Promise<ServiceResponse<GetByIdResponse>> {
    try {
        let jadwal = await prisma.jadwal.findUnique({
            where: {
                id,
            },
            include: {
                dosen: true,
                ruangan: true,
                shift: true,
                asisten: {
                    include: {
                        Mahasiswa: {
                            select: {
                                nama: true,
                                npm: true,
                            },
                        },
                    },
                },
                Meeting: {
                    orderBy: {
                        pertemuan: "asc",
                    },
                },
                mahasiswa: {
                    select: {
                        nama: true,
                        npm: true,
                        semester: true,
                        tahunMasuk: true,
                    },
                },
                matakuliah: true,
            },
        });

        if (!jadwal) return INVALID_ID_SERVICE_RESPONSE;

        return {
            status: true,
            data: jadwal,
        };
    } catch (err) {
        Logger.error(`JadwalService.getById : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type UpdateJadwalResponse = Jadwal | {};
export async function UpdateJadwal(
    id: string,
    data: UpdateJadwalDTO
): Promise<ServiceResponse<UpdateJadwalResponse>> {
    try {
        // Ambil jadwal beserta semua meeting-nya
        const jadwal = await prisma.jadwal.findUnique({
            where: { id },
            include: {
                Meeting: {
                    orderBy: { pertemuan: "asc" },
                },
            },
        });

        if (!jadwal) {
            return BadRequestWithMessage(
                "Jadwal yang ingin anda perbaharui tidak ditemukan"
            );
        }

        // Ambil pertemuan pertama
        const firstMeeting =
            jadwal.Meeting && jadwal.Meeting.length > 0
                ? jadwal.Meeting[0]
                : null;
        if (!firstMeeting) {
            return BadRequestWithMessage(
                "Jadwal belum memiliki pertemuan, tidak dapat diupdate."
            );
        }

        // Cek apakah jadwal sudah dimulai (pertemuan pertama sudah lewat/hari ini)
        const today = DateTime.now().startOf("day");
        const firstMeetingDate = DateTime.fromISO(firstMeeting.tanggal).startOf(
            "day"
        );

        if (today >= firstMeetingDate) {
            return BadRequestWithMessage(
                "Jadwal tidak dapat diubah karena sudah dimulai."
            );
        }

        // Update jadwal (shiftId dan hari)
        const updatedJadwal = await prisma.jadwal.update({
            where: { id },
            data: {
                shiftId: data.shiftId,
                hari: data.hari,
            },
        });

        const meetingDates = await createMeetingDates(updatedJadwal.id);

        // Delete old meetings if any (defensive, in case of re-creation)
        await prisma.meeting.deleteMany({
            where: { jadwalId: updatedJadwal.id },
        });

        // Create new meeting records
        await Promise.all(
            meetingDates.map((dateStr, index) =>
                prisma.meeting.create({
                    data: {
                        id: ulid(),
                        jadwalId: updatedJadwal.id,
                        tanggal: dateStr, // Using string instead of Date
                        pertemuan: index + 1,
                    },
                })
            )
        );

        // Ambil jadwal terbaru beserta relasi
        const resultJadwal = await prisma.jadwal.findUnique({
            where: { id: updatedJadwal.id },
            include: {
                dosen: true,
                mahasiswa: true,
                asisten: true,
                matakuliah: true,
                ruangan: true,
                shift: true,
                Meeting: true,
            },
        });

        return {
            status: true,
            data: resultJadwal || {},
        };
    } catch (error) {
        Logger.error(`JadwalService.UpdateJadwal : ${error}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type UpdateResponse = Jadwal | {};
export async function updateMeeting(
    id: string,
    data: UpdateMeetingDTO
): Promise<ServiceResponse<UpdateResponse>> {
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
        const meetingDate = new Date(
            existingMeeting.tanggal + "T00:00:00.000Z"
        );
        const currentDate = new Date();

        // Set current date to start of day for comparison
        currentDate.setHours(0, 0, 0, 0);
        meetingDate.setHours(0, 0, 0, 0);

        // Calculate the difference in days
        const timeDifference = meetingDate.getTime() - currentDate.getTime();
        const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));

        console.log("Different Days : ", daysDifference);

        // Validation: Update must be at least 1 day before the meeting
        if (daysDifference < 1) {
            const matakuliahName =
                existingMeeting.jadwal?.matakuliah?.nama || "Unknown";
            const meetingInfo = `Meeting ${existingMeeting.pertemuan} - ${matakuliahName}`;

            if (daysDifference < 0) {
                return BadRequestWithMessage(
                    `Cannot update ${meetingInfo}. The meeting date (${existingMeeting.tanggal}) has already passed.`
                );
            } else if (daysDifference === 0) {
                return BadRequestWithMessage(
                    `Cannot update ${meetingInfo}. The meeting is scheduled for today (${existingMeeting.tanggal}). Updates must be made at least 1 day before the meeting date.`
                );
            }
        }

        // If we're updating the tanggal, validate the new date as well
        // if (data.tanggal) {
        //     const newMeetingDate = new Date(data.tanggal + "T00:00:00.000Z");
        //     newMeetingDate.setHours(0, 0, 0, 0);

        //     const newTimeDifference =
        //         newMeetingDate.getTime() - currentDate.getTime();
        //     const newDaysDifference = Math.ceil(
        //         newTimeDifference / (1000 * 3600 * 24)
        //     );

        //     if (newDaysDifference < 1) {
        //         return BadRequestWithMessage(
        //             `Cannot set meeting date to ${data.tanggal}. The new meeting date must be at least 1 day from today.`
        //         );
        //     }
        // }

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

        Logger.info(
            `Meeting updated successfully: ${updatedMeeting.id} - Pertemuan ${updatedMeeting.pertemuan} on ${updatedMeeting.tanggal}`
        );

        return {
            status: true,
            data: updatedMeeting,
        };
    } catch (err) {
        Logger.error(`JadwalService.updateMeeting : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function getAvailableSchedule(
    filters: FilteringQueryV2,
    day?: string
): Promise<ServiceResponse<any>> {
    try {
        const usedFilters = buildFilterQueryLimitOffsetV2(filters);

        // Get all active shifts
        const allShifts = await prisma.shift.findMany({
            where: { isActive: true },
        });

        // Get all rooms
        const allRooms = await prisma.ruanganLaboratorium.findMany({
            select: {
                id: true,
                nama: true,
            },
        });

        // Get all existing schedules, filtered by day, semester and year if provided
        const existingSchedulesFilter: any = {};
        if (day) existingSchedulesFilter.hari = day;

        const existingSchedules = await prisma.jadwal.findMany({
            where: {
                hari: day,
                semester: isGanjilSemester() ? SEMESTER.GENAP : SEMESTER.GANJIL,
                tahun: getCurrentAcademicYear(),
                deletedAt: null, // Only include non-deleted schedules
            },
            select: {
                hari: true,
                shiftId: true,
                ruanganId: true,
                dosen: true,
                matakuliahId: true,
                semester: true,
                tahun: true,
                asisten: true,
                mahasiswa: true,
                isOverride: true,
            },
        });

        // If no specific day is provided, use all days from HARI_LIST
        let daysToCheck: HARI[] = [];

        if (day) {
            // If day is provided, only check that specific day
            daysToCheck = [day as HARI];
        } else {
            // Use all days from HARI_LIST
            daysToCheck = [...HARI_LIST];
        }

        // Build a list of free schedule slots for each day
        const allFreeSlots = [];
        const dayStats: Record<HARI, any> = {} as Record<HARI, any>;

        // Get current semester and year if not provided
        const currentSemester = isGanjilSemester()
            ? SEMESTER.GENAP
            : SEMESTER.GANJIL;
        const currentYear = new Date().getFullYear().toString();

        for (const currentDay of daysToCheck) {
            const dayFreeSlots = [];

            for (const shift of allShifts) {
                for (const room of allRooms) {
                    // Check if this combination is occupied on this day
                    // If semester and year are provided, also check those conditions
                    const isOccupied = existingSchedules.some(
                        (schedule) =>
                            schedule.hari === currentDay &&
                            schedule.shiftId === shift.id &&
                            schedule.ruanganId === room.id &&
                            schedule.semester === currentSemester &&
                            schedule.tahun === getCurrentAcademicYear()
                    );

                    // If not occupied, add to free slots
                    if (!isOccupied) {
                        dayFreeSlots.push({
                            day: currentDay,
                            shift: {
                                id: shift.id,
                                startTime: shift.startTime,
                                endTime: shift.endTime,
                            },
                            room: {
                                id: room.id,
                                name: room.nama,
                            },
                            semester: currentSemester,
                            tahun: currentYear,
                        });
                    }
                }
            }

            // Add free slots for this day to overall list
            allFreeSlots.push(...dayFreeSlots);

            // Calculate stats for this day
            const totalPossibleSlots = allShifts.length * allRooms.length;

            // Filter occupied slots by day and optionally by semester/year
            const occupiedSlotsForDay = existingSchedules.filter(
                (s) =>
                    s.hari === currentDay &&
                    s.semester === currentSemester &&
                    s.tahun === getCurrentAcademicYear()
            );

            const occupiedSlotCount = occupiedSlotsForDay.length;
            const freeSlotCount = dayFreeSlots.length;

            dayStats[currentDay] = {
                totalPossibleSlots,
                occupiedSlotCount,
                freeSlotCount,
                occupancyRate:
                    Math.round((occupiedSlotCount / totalPossibleSlots) * 100) +
                    "%",
                // Additional stats for overrides and assistants
                overrideCount: occupiedSlotsForDay.filter(
                    (s) => s.isOverride === true
                ).length,
                withAssistantCount: occupiedSlotsForDay.filter(
                    (s) => s.asisten.length > 0
                ).length,
                withStudentCount: occupiedSlotsForDay.filter(
                    (s) => s.mahasiswa.length > 0
                ).length,
            };
        }

        // Sort all slots by day (using day order in HARI_LIST), then shift start time, then room name
        allFreeSlots.sort((a, b) => {
            // Sort by day according to the order in HARI_LIST
            const dayAIndex = HARI_LIST.indexOf(a.day as HARI);
            const dayBIndex = HARI_LIST.indexOf(b.day as HARI);
            if (dayAIndex !== dayBIndex) return dayAIndex - dayBIndex;

            // Then sort by shift start time
            if (a.shift.startTime !== b.shift.startTime)
                return a.shift.startTime.localeCompare(b.shift.startTime);

            // Finally sort by room name
            return a.room.name.localeCompare(b.room.name);
        });

        // Giving ID to allFreeSlots
        const slotsWithIds = allFreeSlots.map((slot) => ({
            ...slot,
            id: ulid(),
        }));

        // Apply pagination to the sorted results
        const totalData = slotsWithIds.length;
        const paginatedSlots = slotsWithIds.slice(
            usedFilters.skip,
            usedFilters.skip + usedFilters.take
        );

        // Calculate total pages
        let totalPage = 1;
        if (totalData > usedFilters.take)
            totalPage = Math.ceil(totalData / usedFilters.take);

        // Filter existing schedules by semester and year if provided
        const filteredExistingSchedules = existingSchedules.filter(
            (s) =>
                s.semester === currentSemester &&
                s.tahun === getCurrentAcademicYear()
        );

        // Calculate overall stats
        const shiftCount = allShifts.length;
        const roomCount = allRooms.length;
        const totalPossibleSlots = shiftCount * roomCount * daysToCheck.length;
        const occupiedSlotCount = filteredExistingSchedules.length;
        const freeSlotCount = slotsWithIds.length;

        return {
            status: true,
            data: {
                availableSchedules: {
                    entries: paginatedSlots,
                    totalData,
                    totalPage,
                },
                stats: {
                    totalDays: daysToCheck.length,
                    totalShifts: shiftCount,
                    totalRooms: roomCount,
                    totalPossibleSlots,
                    occupiedSlotCount,
                    freeSlotCount,
                    occupancyRate:
                        Math.round(
                            (occupiedSlotCount / totalPossibleSlots) * 100
                        ) + "%",
                    // Additional stats for new fields
                    overrideCount: filteredExistingSchedules.filter(
                        (s) => s.isOverride === true
                    ).length,
                    withAssistantCount: filteredExistingSchedules.filter(
                        (s) => s.asisten.length > 0
                    ).length,
                    withStudentCount: filteredExistingSchedules.filter(
                        (s) => s.mahasiswa.length > 0
                    ).length,
                    dayStats,
                },
                days: daysToCheck,
                semester: currentSemester,
                tahun: currentYear,
            },
        };
    } catch (err) {
        Logger.error(`JadwalService.getAvailableSchedule : ${err}`);
        return {
            status: false,
            err: { message: (err as Error).message, code: 500 },
            data: [],
        };
    }
}

/**
 * Generate schedules for ALL available matakuliah that don't have jadwal yet
 * @param preferredDay - Optional preferred day for scheduling
 * @returns Promise<ServiceResponse<any>> Response containing all generated schedules
 */
export async function generateAllAvailableSchedules(
    preferredDay?: string
): Promise<ServiceResponse<any>> {
    try {
        // First, get the count of available matakuliah
        const existingSchedules =
            await jadwalGeneticService.getExistingSchedules();
        const allMatakuliah = await prisma.matakuliah.findMany({
            select: { id: true, nama: true },
        });

        // Filter out matakuliah that already have schedules
        const availableMatakuliah = allMatakuliah.filter(
            (mk) =>
                !existingSchedules.some(
                    (existing) => existing.matakuliahId === mk.id
                )
        );

        if (availableMatakuliah.length === 0) {
            return BadRequestWithMessage(
                "No available matakuliah found. All matakuliah already have schedules."
            );
        }

        // Convert string day to HARI type if provided
        const dayFilter = preferredDay
            ? (preferredDay.toUpperCase() as any)
            : undefined;

        // Generate schedules for ALL available matakuliah using the dedicated function
        const schedules =
            await jadwalGeneticService.generateSchedulesForAllAvailableMatakuliah(
                dayFilter
            );

        // If no valid schedules could be generated, return early
        if (schedules.length === 0) {
            return BadRequestWithMessage(
                "No schedules could be generated. This could be due to: no valid lecturer-course combinations based on bidang minat, no available time slots, or other scheduling constraints."
            );
        }

        // Validate the generated schedule set for rule compliance
        const validation = await jadwalGeneticService.validateScheduleSet(
            schedules
        );

        if (!validation.isValid) {
            Logger.warn(
                `Generated schedules have rule violations: ${validation.violations.join(
                    ", "
                )}`
            );
        }

        // Save each schedule and generate meetings
        const savedResults = await Promise.all(
            schedules.map(async (schedule, index) => {
                try {
                    return await jadwalGeneticService.saveSchedule(schedule);
                } catch (saveError) {
                    Logger.error(
                        `Error saving schedule ${schedule.id}: ${saveError}`
                    );
                    return null;
                }
            })
        );

        // Filter out failed saves and extract jadwal records
        const successfulSaves = savedResults.filter(
            (result) => result !== null
        );
        const savedSchedules = successfulSaves.map((result) => result.jadwal);

        // Get the names of matakuliah that were successfully scheduled
        const scheduledMatakuliahIds = savedSchedules.map(
            (schedule) => schedule.matakuliahId
        );
        const scheduledMatakuliah = allMatakuliah.filter((mk) =>
            scheduledMatakuliahIds.includes(mk.id)
        );
        const unscheduledMatakuliah = availableMatakuliah.filter(
            (mk) => !scheduledMatakuliahIds.includes(mk.id)
        );

        // Prepare detailed response
        const response = {
            schedules: savedSchedules,
            summary: {
                totalAvailableMatakuliah: availableMatakuliah.length,
                totalGenerated: schedules.length,
                totalSaved: savedSchedules.length,
                successRate: Math.round(
                    (savedSchedules.length / availableMatakuliah.length) * 100
                ),
            },
            scheduledMatakuliah: scheduledMatakuliah.map((mk) => ({
                id: mk.id,
                nama: mk.nama,
            })),
            unscheduledMatakuliah: unscheduledMatakuliah.map((mk) => ({
                id: mk.id,
                nama: mk.nama,
                reason: "Could not find valid time slot or lecturer combination",
            })),
            fitnessScores: schedules.map((s) => ({
                matakuliahId: s.matakuliahId,
                fitness: s.fitness,
            })),
            validation: {
                isValid: validation.isValid,
                violationCount: validation.violations.length,
                violations: validation.violations,
            },
            preferredDay: dayFilter,
            generationStats: {
                averageFitness:
                    Math.round(
                        (schedules.reduce((sum, s) => sum + s.fitness, 0) /
                            schedules.length) *
                            100
                    ) / 100,
                bestFitness: Math.max(...schedules.map((s) => s.fitness)),
                worstFitness: Math.min(...schedules.map((s) => s.fitness)),
            },
            timestamp: new Date().toISOString(),
        };

        return {
            status: true,
            data: response,
        };
    } catch (err) {
        Logger.error(`JadwalService.generateAllAvailableSchedules : ${err}`);
        return {
            status: false,
            err: { message: (err as Error).message, code: 500 },
            data: [],
        };
    }
}

export async function getAllParticipantsAndMeetingsByJadwalId(
    jadwalId: string
): Promise<ServiceResponse<{}>> {
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
                meeting: {
                    jadwalId: jadwalId,
                },
            },
            include: {
                meeting: true,
            },
        });

        // Process dosen with their meeting attendance
        const dosenWithMeetings = dosenList.map((dosen) => {
            const dosenMeetings = meetings.map((meeting) => {
                // Find absensi record for this dosen and meeting
                const absensi = absensiRecords.find(
                    (record) =>
                        record.dosenId === dosen.id &&
                        record.meetingId === meeting.id
                );

                return {
                    id: meeting.id,
                    pertemuan: meeting.pertemuan,
                    tanggal: meeting.tanggal,
                    isPresent: absensi?.isPresent,
                    keterangan: absensi ? absensi.keterangan : null,
                    waktuAbsen: absensi ? absensi.waktuAbsen : null,
                };
            });

            // Calculate total absences and percentage
            const totalMeetings = meetings.length;
            const totalAbsent = dosenMeetings.filter(
                (meeting) => !meeting.isPresent
            ).length;
            const percentageAbsent =
                totalMeetings > 0 ? (totalAbsent / totalMeetings) * 100 : 0;

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
                const absensi = absensiRecords.find(
                    (record) =>
                        record.mahasiswaId === mahasiswa.id &&
                        record.meetingId === meeting.id
                );

                return {
                    id: meeting.id,
                    pertemuan: meeting.pertemuan,
                    tanggal: meeting.tanggal,
                    isPresent: absensi?.isPresent,
                    keterangan: absensi ? absensi.keterangan : null,
                    waktuAbsen: absensi ? absensi.waktuAbsen : null,
                };
            });

            // Calculate total absences and percentage
            const totalMeetings = meetings.length;
            const totalAbsent = mahasiswaMeetings.filter(
                (meeting) => !meeting.isPresent
            ).length;
            const percentageAbsent =
                totalMeetings > 0 ? (totalAbsent / totalMeetings) * 100 : 0;

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

export async function getAbsentNow(
    user: UserJWTDAO
): Promise<ServiceResponse<{}>> {
    try {
        // Get current time
        const currentTime = DateTime.now();

        // Get all meetings that are ready for attendance (current time is within the meeting time window)
        const meetings = await prisma.meeting.findMany({
            where: {
                tanggal: currentTime.toFormat("yyyy-MM-dd"),
                jadwal: {
                    shift: {
                        startTime: {
                            lte: currentTime.toFormat("HH:mm"),
                        },
                        endTime: {
                            gte: currentTime.toFormat("HH:mm"),
                        },
                    },
                    mahasiswa: {
                        some: {
                            id: user.id,
                        },
                    },
                    dosen: {
                        some: {
                            id: user.id,
                        },
                    },
                },
            },
            include: {
                jadwal: {
                    include: {
                        mahasiswa: {
                            select: {
                                nama: true,
                                id: true,
                                npm: true,
                            },
                        },
                        dosen: {
                            select: {
                                id: true,
                                nama: true,
                                nip: true,
                            },
                        },
                        ruangan: true,
                        matakuliah: true,
                    },
                },
            },
        });

        if (!meetings)
            return BadRequestWithMessage("Belum Ada jadwal yang tersedia!");

        return {
            status: true,
            data: meetings,
        };
    } catch (err) {
        Logger.error(`JadwalService.getAbsentNow : ${err}`);

        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export type AbsentResponse = Absensi | {};
export async function absent(
    data: AbsentDTO
): Promise<ServiceResponse<AbsentResponse>> {
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

        let absent: Absensi | null = null;

        // Check existing absent record based on user type
        if (mahasiswa) {
            // For mahasiswa, use the unique constraint
            absent = await prisma.absensi.findUnique({
                where: {
                    mahasiswaId_meetingId: {
                        mahasiswaId: data.userId,
                        meetingId: data.meetingId,
                    },
                },
            });
        } else if (dosen) {
            // For dosen, use findFirst since there's no unique constraint
            absent = await prisma.absensi.findFirst({
                where: {
                    dosenId: data.userId,
                    meetingId: data.meetingId,
                },
            });
        }

        let absensi: Absensi | {} = {};

        // If Absent exists, update the absent
        if (absent) {
            absensi = await prisma.absensi.update({
                where: {
                    id: absent.id,
                },
                data: {
                    isPresent: data.isPresent,
                    keterangan: `melakukan absensi pada waktu ${DateTime.now().toFormat(
                        "dd MMMM yyyy HH:mm:ss"
                    )}`,
                    waktuAbsen: DateTime.now().toJSDate(),
                },
            });
        } else {
            // If Absent doesn't exist, create new absent record
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
        Logger.error(`JadwalService.Absent : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function getAllScheduleToday(
    user: UserJWTDAO
): Promise<ServiceResponse<{}>> {
    try {
        // Get current time
        const currentTime = DateTime.now();

        const meetings = await prisma.meeting.findMany({
            where: {
                tanggal: currentTime.toFormat("yyyy-MM-dd"),
                jadwal: {
                    OR: [
                        {
                            mahasiswa: {
                                some: {
                                    id: user.id,
                                },
                            },
                        },
                        {
                            dosen: {
                                some: {
                                    id: user.id,
                                },
                            },
                        },
                    ],
                },
            },
            include: {
                jadwal: {
                    include: {
                        mahasiswa: {
                            select: {
                                nama: true,
                                id: true,
                                npm: true,
                            },
                        },
                        dosen: {
                            select: {
                                id: true,
                                nama: true,
                                nip: true,
                            },
                        },
                        ruangan: true,
                        matakuliah: true,
                    },
                },
            },
        });

        if (!meetings || meetings.length === 0)
            return BadRequestWithMessage("Belum Ada jadwal yang tersedia!");

        return {
            status: true,
            data: meetings,
        };
    } catch (err) {
        Logger.error(`JadwalService.getAbsentNow : ${err}`);

        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

async function readExcelFile(file: File): Promise<JadwalExcelRow[]> {
    const XLSX = await import("xlsx");

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), {
        type: "array",
    });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const excelData = XLSX.utils.sheet_to_json<JadwalExcelRow>(worksheet);

    return excelData;
}

export async function processExcelForTeoriJadwal(
    file: File
): Promise<ServiceResponse<{}>> {
    try {
        // Read File Excel
        const excelData = await readExcelFile(file);

        if (excelData.length === 0) {
            return BadRequestWithMessage(
                "Tidak ada data dalam file tersebut, silakan cek kembali file yang anda masukan"
            );
        }

        const result: JadwalExcelResult = {
            totalRows: excelData.length,
            processedRows: 0,
            successCount: 0,
            errorCount: 0,
            errors: [],
            createdSchedules: [],
        };

        // Process each row
        for (let i = 0; i < excelData.length; i++) {
            const row = excelData[i];
            result.processedRows++;

            try {
                // Validate required fields
                if (
                    !row.Kode ||
                    !row.Nama ||
                    !row.Kelas ||
                    !row["Koordinator Kelas"] ||
                    !row.Ruang ||
                    !row.Hari ||
                    !row.Waktu
                ) {
                    result.errors.push({
                        row: i + 1,
                        message: "Missing required fields",
                        data: row,
                    });
                    result.errorCount++;
                    continue;
                }

                // Find matakuliah by kode and check if it's TEORI
                const matakuliah = await prisma.matakuliah.findFirst({
                    where: {
                        kode: row.Kode.trim(),
                        isTeori: true,
                    },
                });

                if (!matakuliah) {
                    Logger.error(
                        `JadwalService.ProcessExcelForTeoriJadwal : Matakuliah with kode '${row.Kode}' not found or is not TEORI`
                    );
                    continue;
                }

                // Extract NIP and name from KOORDINATOR_KELAS field
                // Format: "Name, S.Kom., M.ScNIP. 19930407..."
                const coordinatorText = row["Koordinator Kelas"].trim();
                const nipMatch = coordinatorText.match(/NIP\.\s*(\d+)/);

                if (!nipMatch) {
                    Logger.error(
                        `JadwalService.ProcessExcelForTeoriJadwal : Could not extract NIP from Koordinator Kelas: '${coordinatorText}'`
                    );
                    continue;
                }

                const dosenNip = nipMatch[1];

                // Extract name from the beginning of the text (before NIP)
                const nameMatch = coordinatorText.match(/^([^NIP]+)/);
                const dosenName = nameMatch
                    ? nameMatch[1].trim().replace(/,\s*$/, "")
                    : "";

                // Find dosen by NIP first
                let dosen = await prisma.dosen.findUnique({
                    where: {
                        nip: dosenNip,
                    },
                });

                if (!dosen) {
                    // If not found by NIP, try to find by name and update NIP
                    const dosenNameExist = await prisma.dosen.findFirst({
                        where: {
                            nama: {
                                contains: dosenName.split(",")[0].trim(),
                            },
                        },
                    });

                    if (dosenNameExist) {
                        // Update the dosen's NIP
                        try {
                            dosen = await prisma.dosen.update({
                                where: { id: dosenNameExist.id },
                                data: { nip: dosenNip },
                            });
                            Logger.info(
                                `Updated NIP for dosen ${dosenNameExist.nama} to ${dosenNip}`
                            );
                        } catch (updateError) {
                            Logger.error(
                                `JadwalService.ProcessExcelForTeoriJadwal : Failed to update NIP for dosen '${
                                    dosenNameExist.nama
                                } : ${(updateError as Error).message}`
                            );

                            continue;
                        }
                    } else {
                        // If dosen is still not found, create a new one
                        const userLevel = await prisma.userLevels.findFirst({
                            where: {
                                name: "DOSEN",
                            },
                        });

                        try {
                            await prisma.dosen.create({
                                data: {
                                    id: ulid(),
                                    nama: dosenName,
                                    nip: dosenNip,
                                    email:
                                        dosenName
                                            .split(",")[0]
                                            .trim()
                                            .toLowerCase() + "@gmail.com",
                                    password: await bcrypt.hash(
                                        dosenName
                                            .split(",")[0]
                                            .trim()
                                            .toLowerCase(),
                                        10
                                    ),
                                    bidangMinat: BIDANG_MINAT.UMUM,
                                    userLevel: {
                                        connect: {
                                            id: userLevel?.id,
                                        },
                                    },
                                },
                            });
                        } catch (createError) {
                            Logger.error(
                                `JadwalService.ProcessExcelForTeoriJadwal : Failed to create dosen with NIP '${dosenNip}`
                            );
                            continue;
                        }
                    }
                }

                if (!dosen) {
                    result.errors.push({
                        row: i + 1,
                        message: `Dosen with NIP '${dosenNip}' or name '${dosenName}' not found`,
                        data: row,
                    });
                    result.errorCount++;
                    continue;
                }

                // Find ruangan by nama - if not found, create it
                let ruangan = await prisma.ruanganLaboratorium.findFirst({
                    where: {
                        nama: {
                            contains: row.Ruang.trim(),
                        },
                    },
                });

                if (!ruangan) {
                    // Create new ruangan
                    try {
                        ruangan = await prisma.ruanganLaboratorium.create({
                            data: {
                                id: ulid(),
                                nama: row.Ruang.trim(),
                                lokasi: "Auto-generated from Excel",
                                isActive: true,
                            },
                        });
                        Logger.info(`Created new ruangan: ${row.Ruang.trim()}`);
                    } catch (createError) {
                        result.errors.push({
                            row: i + 1,
                            message: `Failed to create ruangan '${
                                row.Ruang
                            }': ${(createError as Error).message}`,
                            data: row,
                        });
                        result.errorCount++;
                        continue;
                    }
                }

                // Find shift by time (assuming format like "08.00-09.40")
                const shift = await prisma.shift.findFirst({
                    where: {
                        OR: [
                            {
                                startTime: {
                                    contains: row.Waktu.trim()
                                        .split("-")[0]
                                        ?.trim(),
                                },
                            },
                            {
                                endTime: {
                                    contains: row.Waktu.trim()
                                        .split("-")[1]
                                        ?.trim(),
                                },
                            },
                        ],
                    },
                });

                if (!shift) {
                    result.errors.push({
                        row: i + 1,
                        message: `Shift '${row.Waktu}' not found`,
                        data: row,
                    });
                    result.errorCount++;
                    continue;
                }

                // Validate hari and convert Indonesian to English format
                const indonesianToEnglishDay: Record<string, HARI> = {
                    senin: "SENIN",
                    selasa: "SELASA",
                    rabu: "RABU",
                    kamis: "KAMIS",
                    jumat: "JUMAT",
                    sabtu: "SABTU",
                    SENIN: "SENIN",
                    SELASA: "SELASA",
                    RABU: "RABU",
                    KAMIS: "KAMIS",
                    JUMAT: "JUMAT",
                    SABTU: "SABTU",
                };

                const rawHari = row.Hari.trim();
                const hari =
                    indonesianToEnglishDay[rawHari.toLowerCase()] ||
                    rawHari.toUpperCase();

                Logger.info(`Hari conversion: "${rawHari}" -> "${hari}"`);

                if (!HARI_LIST.includes(hari as HARI)) {
                    result.errors.push({
                        row: i + 1,
                        message: `Invalid hari '${
                            row.Hari
                        }'. Must be one of: ${HARI_LIST.join(", ")}`,
                        data: row,
                    });
                    result.errorCount++;
                    continue;
                }

                // Check if schedule already exists for this matakuliah
                const existingSchedule = await prisma.jadwal.findFirst({
                    where: {
                        matakuliahId: matakuliah.id,
                        semester: isGanjilSemester()
                            ? SEMESTER.GENAP
                            : SEMESTER.GANJIL,
                        tahun: getCurrentAcademicYear(),
                        deletedAt: null,
                    },
                });

                if (existingSchedule) {
                    result.successCount++;
                    continue;
                }

                // Create the jadwal
                const jadwalData: JadwalDTO = {
                    id: ulid(),
                    matakuliahId: matakuliah.id,
                    dosenIds: [dosen.id],
                    ruanganId: ruangan.id,
                    shiftId: shift.id,
                    hari: hari as HARI,
                    kelas: row.Kelas?.trim(),
                    isOverride: false,
                };

                // Use existing create function
                const createResult = await createTeori(jadwalData);

                if (!createResult.status) {
                    result.errors.push({
                        row: i + 1,
                        message: `Failed to create schedule: ${createResult.err?.message}`,
                        data: row,
                    });
                    result.errorCount++;
                    continue;
                }

                // Add to success list
                result.createdSchedules.push({
                    matakuliahKode: matakuliah.kode,
                    matakuliahNama: matakuliah.nama,
                    dosenNama: dosen.nama,
                    ruanganNama: ruangan.nama,
                    shiftTime: `${shift.startTime}-${shift.endTime}`,
                    hari: hari,
                    kelas: row.Kelas,
                });

                result.successCount++;

                Logger.info(
                    `Successfully created schedule for ${matakuliah.nama} with dosen ${dosen.nama}`
                );
            } catch (rowError) {
                Logger.error(`Error processing row ${i + 1}: ${rowError}`);
                result.errors.push({
                    row: i + 1,
                    message: `Unexpected error: ${(rowError as Error).message}`,
                    data: row,
                });
                result.errorCount++;
            }
        }

        Logger.info(
            `Excel processing completed. Success: ${result.successCount}, Errors: ${result.errorCount}`
        );

        return {
            status: true,
            data: result,
        };
    } catch (err) {
        Logger.error(`JadwalService.processExcelForTeoriJadwal : ${err}`);
        return {
            status: false,
            err: {
                message: "Internal server error",
                code: 500,
            },
        } as ServiceResponse<JadwalExcelResult>;
    }
}

export type CreateTeoriResponse = Jadwal | {};
export async function createTeori(
    data: JadwalDTO
): Promise<ServiceResponse<CreateResponse>> {
    try {
        // Get matakuliah details to determine course type
        const matakuliah = await prisma.matakuliah.findUnique({
            where: { id: data.matakuliahId },
        });

        if (!matakuliah) {
            return BadRequestWithMessage("Matakuliah tidak ditemukan!");
        }

        // Automatically assign students and dosen if not provided
        let assignedMahasiswaIds = data.mahasiswaIds || [];
        let assignedDosenIds = data.dosenIds || [];

        const existingSchedules =
            await jadwalGeneticService.getExistingSchedules();

        if (!existingSchedules)
            return BadRequestWithMessage("Tidak ada Jadwal yang ditemukan!");

        const scheduleForValidation = {
            id: data.id,
            matakuliahId: data.matakuliahId,
            ruanganId: data.ruanganId,
            shiftId: data.shiftId,
            dosenIds: assignedDosenIds,
            hari: data.hari,
            semester: isGanjilSemester() ? SEMESTER.GENAP : SEMESTER.GANJIL,
            tahun: getCurrentAcademicYear(),
            mahasiswaIds: assignedMahasiswaIds,
            asistenLabIds: data.asistenLabIds || [],
            fitness: 0,
        };

        const isConflict = jadwalGeneticService.hasScheduleConflicts(
            scheduleForValidation,
            existingSchedules
        );

        if (isConflict) {
            if (!data.isOverride)
                return {
                    status: false,
                    err: {
                        message: "Terjadi Konflik dengan jadwal lainnya!",
                        code: 409,
                    },
                };
        }

        const { dosenIds, mahasiswaIds, asistenLabIds, ...jadwalData } = data;

        const jadwal = await prisma.jadwal.create({
            data: {
                ...jadwalData,
                semester: isGanjilSemester() ? SEMESTER.GENAP : SEMESTER.GANJIL,
                tahun: getCurrentAcademicYear(),
                dosen: {
                    connect: assignedDosenIds.map((dosenId) => ({
                        id: dosenId,
                    })),
                },
                mahasiswa: {
                    connect: assignedMahasiswaIds.map((mahasiswaId) => ({
                        id: mahasiswaId,
                    })),
                },
                asisten: {
                    connect: (asistenLabIds || []).map((asistenId) => ({
                        id: asistenId,
                    })),
                },
            },
            include: {
                dosen: true,
                mahasiswa: true,
                asisten: true,
                matakuliah: true,
                ruangan: true,
                shift: true,
                Meeting: true,
            },
        });

        const meetingDates = await jadwalGeneticService.generateMeetingDates(
            jadwal.id,
            12
        );

        // Create meeting records
        await Promise.all(
            meetingDates.map((dateStr, index) =>
                prisma.meeting.create({
                    data: {
                        id: ulid(),
                        jadwalId: jadwal.id,
                        tanggal: dateStr, // Using string instead of Date
                        pertemuan: index + 1,
                    },
                })
            )
        );

        return {
            status: true,
            data: jadwal,
        };
    } catch (err) {
        Logger.error(`JadwalService.create : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function deleteAll(): Promise<ServiceResponse<{}>> {
    try {
        await prisma.jadwal.deleteMany();

        return {
            status: true,
            data: {},
        };
    } catch (error) {
        Logger.error(`JadwalService.DeleteAll : ${error}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}
