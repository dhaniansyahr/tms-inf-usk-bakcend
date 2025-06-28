import { FilteringQueryV2, PagedList } from "$entities/Query";
import { BadRequestWithMessage, INTERNAL_SERVER_ERROR_SERVICE_RESPONSE, INVALID_ID_SERVICE_RESPONSE, ServiceResponse } from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { Jadwal, Matakuliah, SEMESTER } from "@prisma/client";
import { JadwalDTO } from "$entities/Jadwal";
import { buildFilterQueryLimitOffsetV2 } from "./helpers/FilterQueryV2";
import { HARI, HARI_LIST, jadwalGeneticService } from "./JadwalGeneticService";
import { getCurrentAcademicYear, isGanjilSemester } from "$utils/strings.utils";
import { UserJWTDAO } from "$entities/User";
import { ulid } from "ulid";

export type CreateResponse = Jadwal | {};
export async function create(data: JadwalDTO): Promise<ServiceResponse<CreateResponse>> {
        try {
                const existingSchedules = await jadwalGeneticService.getExistingSchedules();

                if (!existingSchedules) return BadRequestWithMessage("Tidak ada Jadwal yang ditemukan!");

                const scheduleForValidation = {
                        id: data.id,
                        matakuliahId: data.matakuliahId,
                        ruanganId: data.ruanganId,
                        shiftId: data.shiftId,
                        dosenIds: data.dosenIds,
                        hari: data.hari,
                        semester: isGanjilSemester() ? SEMESTER.GANJIL : SEMESTER.GENAP,
                        tahun: getCurrentAcademicYear(),
                        mahasiswaIds: data.mahasiswaIds || [],
                        asistenLabIds: data.asistenLabIds || [],
                        fitness: 0,
                };

                const isConflict = jadwalGeneticService.hasScheduleConflicts(scheduleForValidation, existingSchedules);

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
                                semester: isGanjilSemester() ? SEMESTER.GANJIL : SEMESTER.GENAP,
                                tahun: getCurrentAcademicYear(),
                                dosen: {
                                        connect: dosenIds.map((dosenId) => ({ id: dosenId })),
                                },
                                mahasiswa: {
                                        connect: (mahasiswaIds || []).map((mahasiswaId) => ({ id: mahasiswaId })),
                                },
                                asisten: {
                                        connect: (asistenLabIds || []).map((asistenId) => ({ id: asistenId })),
                                },
                        },
                        include: {
                                dosen: true,
                                mahasiswa: true,
                                asisten: true,
                                matakuliah: true,
                                ruangan: true,
                                shift: true,
                        },
                });

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
export async function getAll(filters: FilteringQueryV2, type: string, user: UserJWTDAO): Promise<ServiceResponse<GetAllResponse>> {
        try {
                const usedFilters = buildFilterQueryLimitOffsetV2(filters);

                usedFilters.include = {
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
                };

                // if not Operator, filter jadwal where they are assigned to them
                if (user.userLevel.name === "DOSEN") {
                        usedFilters.where.dosen = {
                                id: { in: user.id },
                        };
                }

                if (user.userLevel.name === "MAHASISWA") {
                        usedFilters.where.mahasiswa = {
                                id: { in: user.id },
                        };
                }

                const [jadwal, totalData] = await Promise.all([
                        prisma.jadwal.findMany({
                                ...usedFilters,
                                orderBy: {
                                        hari: "desc",
                                },
                        }),
                        prisma.jadwal.count({
                                where: usedFilters.where,
                        }),
                ]);

                let totalPage = 1;
                if (totalData > usedFilters.take) totalPage = Math.ceil(totalData / usedFilters.take);

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
export async function getById(id: string): Promise<ServiceResponse<GetByIdResponse>> {
        try {
                let jadwal = await prisma.jadwal.findUnique({
                        where: {
                                id,
                        },
                        include: {
                                dosen: true,
                                ruangan: true,
                                shift: true,
                                asisten: true,
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
export async function update(id: string, data: Partial<JadwalDTO>): Promise<ServiceResponse<UpdateResponse>> {
        try {
                let jadwal = await prisma.jadwal.findUnique({
                        where: {
                                id,
                        },
                });

                if (!jadwal) return INVALID_ID_SERVICE_RESPONSE;

                jadwal = await prisma.jadwal.update({
                        where: {
                                id,
                        },
                        data,
                });

                return {
                        status: true,
                        data: jadwal,
                };
        } catch (err) {
                Logger.error(`JadwalService.update : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

export async function deleteByIds(ids: string): Promise<ServiceResponse<{}>> {
        try {
                const idArray: string[] = JSON.parse(ids);

                idArray.forEach(async (id) => {
                        await prisma.jadwal.delete({
                                where: {
                                        id,
                                },
                        });
                });

                return {
                        status: true,
                        data: {},
                };
        } catch (err) {
                Logger.error(`JadwalService.deleteByIds : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}

/**
 * Checks for free schedule slots based on day, semester, and year
 *
 * @param day Optional day of week to check (SENIN, SELASA, etc.)
 * @param semester Optional semester to filter by
 * @param tahun Optional year to filter by
 * @returns Service response with free schedule slots and statistics
 */

/**
 * Validates existing schedules against business rules
 * @returns Promise<ServiceResponse<any>> Response containing validation results
 */
export async function validateExistingSchedules(): Promise<ServiceResponse<any>> {
        try {
                const existingSchedules = await prisma.jadwal.findMany({
                        where: {
                                semester: isGanjilSemester() ? SEMESTER.GANJIL : SEMESTER.GENAP,
                                tahun: getCurrentAcademicYear(),
                                deletedAt: null,
                        },
                        include: {
                                matakuliah: true,
                                dosen: true,
                                mahasiswa: true,
                                asisten: true,
                                ruangan: true,
                                shift: true,
                        },
                });

                // Convert to Schedule format for validation
                const scheduleData = existingSchedules.map((jadwal) => ({
                        id: jadwal.id,
                        matakuliahId: jadwal.matakuliahId,
                        ruanganId: jadwal.ruanganId,
                        shiftId: jadwal.shiftId,
                        dosenIds: jadwal.dosen.map((d) => d.id),
                        hari: jadwal.hari as any,
                        semester: jadwal.semester,
                        tahun: jadwal.tahun,
                        mahasiswaIds: jadwal.mahasiswa.map((m) => m.id),
                        asistenLabIds: jadwal.asisten.map((a) => a.id),
                        fitness: 0,
                }));

                const validation = await jadwalGeneticService.validateScheduleSet(scheduleData);

                // Additional analysis
                const ruleViolations = {
                        dosenFieldMismatch: 0,
                        studentSemesterViolation: 0,
                        roomConflicts: 0,
                        dosenConflicts: 0,
                        mahasiswaConflicts: 0,
                        duplicateMatakuliah: 0,
                };

                // Analyze violations by type
                validation.violations.forEach((violation) => {
                        if (violation.includes("bidang minat mismatch")) {
                                ruleViolations.dosenFieldMismatch++;
                        } else if (violation.includes("semester restriction")) {
                                ruleViolations.studentSemesterViolation++;
                        } else if (violation.includes("Room conflict")) {
                                ruleViolations.roomConflicts++;
                        } else if (violation.includes("Dosen conflict")) {
                                ruleViolations.dosenConflicts++;
                        } else if (violation.includes("Mahasiswa conflict")) {
                                ruleViolations.mahasiswaConflicts++;
                        } else if (violation.includes("Duplicate matakuliah")) {
                                ruleViolations.duplicateMatakuliah++;
                        }
                });

                return {
                        status: true,
                        data: {
                                totalSchedules: existingSchedules.length,
                                validation: {
                                        isValid: validation.isValid,
                                        totalViolations: validation.violations.length,
                                        violations: validation.violations,
                                        violationsByType: ruleViolations,
                                },
                                scheduleDetails: existingSchedules.map((jadwal) => ({
                                        id: jadwal.id,
                                        matakuliah: jadwal.matakuliah.nama,
                                        dosen: jadwal.dosen.map((d) => d.nama).join(", ") || "Not assigned",
                                        mahasiswa: jadwal.mahasiswa.map((m) => m.nama).join(", ") || "Not assigned",
                                        asisten: jadwal.asisten.map((a) => a.id).join(", ") || "Not assigned",
                                        ruangan: jadwal.ruangan.nama,
                                        shift: `${jadwal.shift.startTime} - ${jadwal.shift.endTime}`,
                                        hari: jadwal.hari,
                                        totalStudents: jadwal.mahasiswa.length,
                                })),
                        },
                };
        } catch (err) {
                Logger.error(`JadwalService.validateExistingSchedules : ${err}`);
                return {
                        status: false,
                        err: { message: (err as Error).message, code: 500 },
                        data: null,
                };
        }
}

export async function getAvailableSchedule(filters: FilteringQueryV2, day?: string): Promise<ServiceResponse<any>> {
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
                                semester: isGanjilSemester() ? SEMESTER.GANJIL : SEMESTER.GENAP,
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
                const currentSemester = isGanjilSemester() ? SEMESTER.GANJIL : SEMESTER.GENAP;
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
                                (s) => s.hari === currentDay && s.semester === currentSemester && s.tahun === getCurrentAcademicYear()
                        );

                        const occupiedSlotCount = occupiedSlotsForDay.length;
                        const freeSlotCount = dayFreeSlots.length;

                        dayStats[currentDay] = {
                                totalPossibleSlots,
                                occupiedSlotCount,
                                freeSlotCount,
                                occupancyRate: Math.round((occupiedSlotCount / totalPossibleSlots) * 100) + "%",
                                // Additional stats for overrides and assistants
                                overrideCount: occupiedSlotsForDay.filter((s) => s.isOverride === true).length,
                                withAssistantCount: occupiedSlotsForDay.filter((s) => s.asisten.length > 0).length,
                                withStudentCount: occupiedSlotsForDay.filter((s) => s.mahasiswa.length > 0).length,
                        };
                }

                // Sort all slots by day (using day order in HARI_LIST), then shift start time, then room name
                allFreeSlots.sort((a, b) => {
                        // Sort by day according to the order in HARI_LIST
                        const dayAIndex = HARI_LIST.indexOf(a.day as HARI);
                        const dayBIndex = HARI_LIST.indexOf(b.day as HARI);
                        if (dayAIndex !== dayBIndex) return dayAIndex - dayBIndex;

                        // Then sort by shift start time
                        if (a.shift.startTime !== b.shift.startTime) return a.shift.startTime.localeCompare(b.shift.startTime);

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
                const paginatedSlots = slotsWithIds.slice(usedFilters.skip, usedFilters.skip + usedFilters.take);

                // Calculate total pages
                let totalPage = 1;
                if (totalData > usedFilters.take) totalPage = Math.ceil(totalData / usedFilters.take);

                // Filter existing schedules by semester and year if provided
                const filteredExistingSchedules = existingSchedules.filter((s) => s.semester === currentSemester && s.tahun === getCurrentAcademicYear());

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
                                        occupancyRate: Math.round((occupiedSlotCount / totalPossibleSlots) * 100) + "%",
                                        // Additional stats for new fields
                                        overrideCount: filteredExistingSchedules.filter((s) => s.isOverride === true).length,
                                        withAssistantCount: filteredExistingSchedules.filter((s) => s.asisten.length > 0).length,
                                        withStudentCount: filteredExistingSchedules.filter((s) => s.mahasiswa.length > 0).length,
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
 * Diagnostic function to analyze scheduling constraints and provide insights
 * @returns Promise<ServiceResponse<any>> Response containing detailed analysis
 */
export async function diagnoseScheduling(): Promise<ServiceResponse<any>> {
        try {
                const diagnostics = await jadwalGeneticService.diagnoseSchedulingConstraints();

                return {
                        status: true,
                        data: diagnostics,
                };
        } catch (err) {
                Logger.error(`JadwalService.diagnoseScheduling : ${err}`);
                return {
                        status: false,
                        err: { message: (err as Error).message, code: 500 },
                        data: null,
                };
        }
}

/**
 * Generate schedules for ALL available matakuliah that don't have jadwal yet
 * @param preferredDay - Optional preferred day for scheduling
 * @returns Promise<ServiceResponse<any>> Response containing all generated schedules
 */
export async function generateAllAvailableSchedules(preferredDay?: string): Promise<ServiceResponse<any>> {
        try {
                // First, get the count of available matakuliah
                const existingSchedules = await jadwalGeneticService.getExistingSchedules();
                const allMatakuliah = await prisma.matakuliah.findMany({
                        select: { id: true, nama: true },
                });

                // Filter out matakuliah that already have schedules
                const availableMatakuliah = allMatakuliah.filter((mk) => !existingSchedules.some((existing) => existing.matakuliahId === mk.id));

                if (availableMatakuliah.length === 0) {
                        return BadRequestWithMessage("No available matakuliah found. All matakuliah already have schedules.");
                }

                // Convert string day to HARI type if provided
                const dayFilter = preferredDay ? (preferredDay.toUpperCase() as any) : undefined;

                // Generate schedules for ALL available matakuliah using the dedicated function
                const schedules = await jadwalGeneticService.generateSchedulesForAllAvailableMatakuliah(dayFilter);

                // If no valid schedules could be generated, return early
                if (schedules.length === 0) {
                        return BadRequestWithMessage(
                                "No schedules could be generated. This could be due to: no valid lecturer-course combinations based on bidang minat, no available time slots, or other scheduling constraints."
                        );
                }

                // Validate the generated schedule set for rule compliance
                const validation = await jadwalGeneticService.validateScheduleSet(schedules);

                if (!validation.isValid) {
                        Logger.warn(`Generated schedules have rule violations: ${validation.violations.join(", ")}`);
                }

                // Save each schedule and generate meetings
                const savedResults = await Promise.all(
                        schedules.map(async (schedule, index) => {
                                try {
                                        return await jadwalGeneticService.saveSchedule(schedule);
                                } catch (saveError) {
                                        Logger.error(`Error saving schedule ${schedule.id}: ${saveError}`);
                                        return null;
                                }
                        })
                );

                // Filter out failed saves and extract jadwal records
                const successfulSaves = savedResults.filter((result) => result !== null);
                const savedSchedules = successfulSaves.map((result) => result.jadwal);

                // Get the names of matakuliah that were successfully scheduled
                const scheduledMatakuliahIds = savedSchedules.map((schedule) => schedule.matakuliahId);
                const scheduledMatakuliah = allMatakuliah.filter((mk) => scheduledMatakuliahIds.includes(mk.id));
                const unscheduledMatakuliah = availableMatakuliah.filter((mk) => !scheduledMatakuliahIds.includes(mk.id));

                // Prepare detailed response
                const response = {
                        schedules: savedSchedules,
                        summary: {
                                totalAvailableMatakuliah: availableMatakuliah.length,
                                totalGenerated: schedules.length,
                                totalSaved: savedSchedules.length,
                                successRate: Math.round((savedSchedules.length / availableMatakuliah.length) * 100),
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
                                averageFitness: Math.round((schedules.reduce((sum, s) => sum + s.fitness, 0) / schedules.length) * 100) / 100,
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

export type GetAllMatakuliahResponse = PagedList<Matakuliah[]> | {};
export async function getAllMatakuliah(filters: FilteringQueryV2): Promise<ServiceResponse<GetAllMatakuliahResponse>> {
        try {
                const usedFilters = buildFilterQueryLimitOffsetV2(filters);

                const [matakuliah, totalData] = await Promise.all([
                        prisma.matakuliah.findMany(usedFilters),
                        prisma.matakuliah.count({
                                where: usedFilters.where,
                        }),
                ]);

                let totalPage = 1;
                if (totalData > usedFilters.take) totalPage = Math.ceil(totalData / usedFilters.take);

                return {
                        status: true,
                        data: {
                                entries: matakuliah,
                                totalData,
                                totalPage,
                        },
                };
        } catch (err) {
                Logger.error(`JadwalService.getAllMatakuliah : ${err} `);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}
