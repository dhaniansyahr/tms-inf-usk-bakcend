import { FilteringQueryV2, PagedList } from "$entities/Query";
import {
    BadRequestWithMessage,
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
    ServiceResponse,
} from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { Absensi, Jadwal, SEMESTER } from "@prisma/client";
import { AbsentDTO, JadwalDTO, UpdateMeetingDTO } from "$entities/Jadwal";
import { buildFilterQueryLimitOffsetV2 } from "./helpers/FilterQueryV2";
import { HARI, HARI_LIST, jadwalGeneticService } from "./JadwalGeneticService";
import { getCurrentAcademicYear, isGanjilSemester } from "$utils/strings.utils";
import { UserJWTDAO } from "$entities/User";
import { ulid } from "ulid";
import { DateTime } from "luxon";

/**
 * Automatically assign students and dosen for practical courses from corresponding theory course
 */
async function assignStudentsAndDosenForPracticalCourse(
    matakuliahId: string,
    kelas?: string
): Promise<{ mahasiswaIds: string[]; dosenIds: string[] }> {
    try {
        // Get practical course details
        const praktikumMatakuliah = await prisma.matakuliah.findUnique({
            where: { id: matakuliahId },
        });

        if (!praktikumMatakuliah) return { mahasiswaIds: [], dosenIds: [] };

        // Find corresponding theory course by removing "PRAKTIKUM" from name
        const theoryCourseName = praktikumMatakuliah.nama
            .replace(/\s*PRAKTIKUM\s*/i, "")
            .trim();
        console.log(theoryCourseName);

        const theoryMatakuliah = await prisma.matakuliah.findFirst({
            where: {
                nama: theoryCourseName,
                isTeori: true,
                semester: praktikumMatakuliah.semester,
            },
        });

        if (!theoryMatakuliah) {
            Logger.warn(
                `No corresponding theory course found for: ${praktikumMatakuliah.nama}`
            );
            return { mahasiswaIds: [], dosenIds: [] };
        }

        // Get current semester and year
        const currentSemester = isGanjilSemester()
            ? SEMESTER.GENAP
            : SEMESTER.GANJIL;
        const currentYear = getCurrentAcademicYear();

        // Find students and dosen enrolled in the theory course for current semester
        const theoryJadwal = await prisma.jadwal.findMany({
            where: {
                matakuliahId: theoryMatakuliah.id,
                semester: currentSemester,
                tahun: currentYear,
                deletedAt: null,
            },
            include: {
                mahasiswa: true,
                dosen: true,
            },
        });

        if (theoryJadwal.length === 0) {
            Logger.warn(
                `No theory course schedule found for: ${theoryMatakuliah.nama}`
            );
            return { mahasiswaIds: [], dosenIds: [] };
        }

        // Collect all students from theory course schedules
        const theoryStudents = theoryJadwal.flatMap(
            (jadwal) => jadwal.mahasiswa
        );

        // Remove duplicates based on student ID
        const uniqueStudents = theoryStudents.filter(
            (student, index, self) =>
                index === self.findIndex((s) => s.id === student.id)
        );

        // For practical courses, maximum 25 students per class
        const maxStudentsPerClass = 25;
        const shuffled = uniqueStudents.sort(() => 0.5 - Math.random());
        const selectedStudents = shuffled.slice(0, maxStudentsPerClass);

        // Collect all dosen from theory course schedules
        const theoryDosen = theoryJadwal.flatMap((jadwal) => jadwal.dosen);

        // Remove duplicates based on dosen ID
        const uniqueDosen = theoryDosen.filter(
            (dosen, index, self) =>
                index === self.findIndex((d) => d.id === dosen.id)
        );

        Logger.info(
            `Assigned ${selectedStudents.length} students and ${
                uniqueDosen.length
            } dosen from theory course "${
                theoryMatakuliah.nama
            }" to practical course: ${praktikumMatakuliah.nama} ${
                kelas ? `- Kelas ${kelas}` : ""
            }`
        );

        return {
            mahasiswaIds: selectedStudents.map((s) => s.id),
            dosenIds: uniqueDosen.map((d) => d.id),
        };
    } catch (error) {
        Logger.error(
            `Error assigning students and dosen for practical course: ${error}`
        );
        return { mahasiswaIds: [], dosenIds: [] };
    }
}

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

        // Automatically assign students and dosen if not provided
        let assignedMahasiswaIds = data.mahasiswaIds || [];
        let assignedDosenIds = data.dosenIds || [];

        if (assignedMahasiswaIds.length === 0) {
            // Determine if this is a theory or practical course
            const isTheoryCourse = matakuliah.isTeori === true;
            const isPracticalCourse =
                matakuliah.isTeori === false ||
                matakuliah.nama.toUpperCase().includes("PRAKTIKUM");

            if (isTheoryCourse) {
                return BadRequestWithMessage(
                    "Tidak dapat membuat jadwal untuk mata kuliah teori!"
                );
            }

            if (isPracticalCourse) {
                // Automatically assign students and dosen from corresponding theory course
                const practicalAssignment =
                    await assignStudentsAndDosenForPracticalCourse(
                        data.matakuliahId,
                        data.kelas
                    );
                assignedMahasiswaIds = practicalAssignment.mahasiswaIds;

                // Only auto-assign dosen if not provided
                if (assignedDosenIds.length === 0) {
                    assignedDosenIds = practicalAssignment.dosenIds;
                    Logger.info(
                        `Auto-assigned ${assignedDosenIds.length} dosen from theory course for practical course: ${matakuliah.nama}`
                    );
                }

                Logger.info(
                    `Auto-assigned ${assignedMahasiswaIds.length} students for practical course: ${matakuliah.nama}`
                );
            }
        }

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
        if (data.tanggal) {
            const newMeetingDate = new Date(data.tanggal + "T00:00:00.000Z");
            newMeetingDate.setHours(0, 0, 0, 0);

            const newTimeDifference =
                newMeetingDate.getTime() - currentDate.getTime();
            const newDaysDifference = Math.ceil(
                newTimeDifference / (1000 * 3600 * 24)
            );

            if (newDaysDifference < 1) {
                return BadRequestWithMessage(
                    `Cannot set meeting date to ${data.tanggal}. The new meeting date must be at least 1 day from today.`
                );
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
                    },
                },
            },
        });

        if (!meetings)
            return BadRequestWithMessage("Belum Ada jadwal yang tersedia!");

        return {
            status: true,
            data: {
                entries: meetings,
            },
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
