import { FilteringQueryV2, PagedList } from "$entities/Query";
import { BadRequestWithMessage, INTERNAL_SERVER_ERROR_SERVICE_RESPONSE, INVALID_ID_SERVICE_RESPONSE, ServiceResponse } from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { Jadwal, SEMESTER } from "@prisma/client";
import { JadwalDTO } from "$entities/Jadwal";
import { buildFilterQueryLimitOffsetV2 } from "./helpers/FilterQueryV2";
import { HARI, HARI_LIST, jadwalGeneticService } from "./JadwalGeneticService";
import { getCurrentAcademicYear, isGanjilSemester } from "$utils/strings.utils";

export type CreateResponse = Jadwal | {};
export async function create(data: JadwalDTO): Promise<ServiceResponse<CreateResponse>> {
        try {
                data.semester = isGanjilSemester() ? SEMESTER.GANJIL : SEMESTER.GENAP;
                data.tahun = getCurrentAcademicYear();

                const existingSchedules = await prisma.jadwal.findMany();

                if (!existingSchedules) return BadRequestWithMessage("Tidak ada Jadwal yang ditemukan!");

                const isConflict = jadwalGeneticService.hasScheduleConflicts({ ...data, fitness: 0 }, existingSchedules);

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

                const jadwal = await prisma.jadwal.create({
                        data,
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
export async function getAll(filters: FilteringQueryV2): Promise<ServiceResponse<GetAllResponse>> {
        try {
                const usedFilters = buildFilterQueryLimitOffsetV2(filters);

                usedFilters.include = {
                        ruangan: true,
                        shift: true,
                        dosen: true,
                        matakuliah: true,
                };

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
                                Meeting: true,
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
export async function update(id: string, data: JadwalDTO): Promise<ServiceResponse<UpdateResponse>> {
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
 * Generate schedules using genetic algorithm with validation for existing schedules
 * @returns Promise<ServiceResponse<Jadwal[]>> Response containing the saved schedules
 */
export async function generateScheduleWithGenetic(): Promise<ServiceResponse<any>> {
        try {
                // Generate schedules using genetic algorithm with validation
                const schedules = await jadwalGeneticService.generateScheduleWithValidation();

                // If no valid schedules could be generated, return early
                if (schedules.length === 0) {
                        return BadRequestWithMessage("No new schedules could be generated. All matakuliah already have schedules or no valid slots are available.");
                }

                // Save each schedule and generate meetings
                const savedResults = await Promise.all(
                        schedules.map(async (schedule) => {
                                // Use the new saveSchedule function to save jadwal and create meetings
                                return jadwalGeneticService.saveSchedule(schedule);
                        })
                );

                // Extract just the jadwal records for the response
                const savedSchedules = savedResults.map((result) => result.jadwal);

                return {
                        status: true,
                        data: savedSchedules,
                };
        } catch (err) {
                Logger.error(`JadwalService.generateScheduleWithGenetic : ${err}`);
                return {
                        status: false,
                        err: { message: (err as Error).message, code: 500 },
                        data: [],
                };
        }
}

export async function getScheduleSummary(): Promise<ServiceResponse<any>> {
        try {
                const existingSchedules = await jadwalGeneticService.getExistingSchedules();

                // Count schedules by day
                const countByDay = existingSchedules.reduce((acc: Record<string, number>, schedule) => {
                        const day = schedule.hari;
                        acc[day] = (acc[day] || 0) + 1;
                        return acc;
                }, {});

                return {
                        status: true,
                        data: {
                                totalSchedules: existingSchedules.length,
                                countByDay,
                                semester: isGanjilSemester() ? SEMESTER.GANJIL : SEMESTER.GENAP,
                                academicYear: getCurrentAcademicYear(),
                        },
                };
        } catch (err) {
                Logger.error(`JadwalService.getScheduleSummary : ${err}`);
                return {
                        status: false,
                        err: { message: (err as Error).message, code: 500 },
                        data: null,
                };
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

export async function checkFreeSchedule(day?: string): Promise<ServiceResponse<any>> {
        try {
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
                                dosenId: true,
                                matakuliahId: true,
                                semester: true,
                                tahun: true,
                                asistenLabId: true,
                                mahasiswaId: true,
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
                                withAssistantCount: occupiedSlotsForDay.filter((s) => s.asistenLabId !== null).length,
                                withStudentCount: occupiedSlotsForDay.filter((s) => s.mahasiswaId !== null).length,
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

                // Filter existing schedules by semester and year if provided
                const filteredExistingSchedules = existingSchedules.filter((s) => s.semester === currentSemester && s.tahun === getCurrentAcademicYear());

                // Calculate overall stats
                const shiftCount = allShifts.length;
                const roomCount = allRooms.length;
                const totalPossibleSlots = shiftCount * roomCount * daysToCheck.length;
                const occupiedSlotCount = filteredExistingSchedules.length;
                const freeSlotCount = allFreeSlots.length;

                return {
                        status: true,
                        data: {
                                freeScheduleSlots: allFreeSlots,
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
                                        withAssistantCount: filteredExistingSchedules.filter((s) => s.asistenLabId !== null).length,
                                        withStudentCount: filteredExistingSchedules.filter((s) => s.mahasiswaId !== null).length,
                                        dayStats,
                                },
                                days: daysToCheck,
                                semester: currentSemester,
                                tahun: currentYear,
                        },
                };
        } catch (err) {
                Logger.error(`JadwalService.checkFreeSchedule : ${err}`);
                return {
                        status: false,
                        err: { message: (err as Error).message, code: 500 },
                        data: [],
                };
        }
}
