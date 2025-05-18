import { prisma } from "$utils/prisma.utils";
import { isGanjilSemester } from "$utils/strings.utils";
import { SEMESTER } from "@prisma/client";
import { ulid } from "ulid";

// Days of the week in Indonesian
export type HARI = "SENIN" | "SELASA" | "RABU" | "KAMIS" | "JUMAT" | "SABTU";
export const HARI_LIST: HARI[] = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT", "SABTU"];

interface Schedule {
        id: string;
        matakuliahId: string;
        ruanganId: string;
        shiftId: string;
        dosenId: string;
        hari: HARI;
        semester: SEMESTER;
        tahun: string;
        mahasiswaId?: string;
        asistenLabId?: string;
        fitness: number;
}

interface GeneticAlgorithmConfig {
        populationSize: number;
        generations: number;
        mutationRate: number;
        eliteSize: number;
}

const DEFAULT_CONFIG: GeneticAlgorithmConfig = {
        populationSize: 50,
        generations: 50,
        mutationRate: 0.1,
        eliteSize: 10,
};

/**
 * Gets the total count of matakuliah from the database
 * @returns Promise<number> The total number of matakuliah records
 */
async function getMatakuliahCount(): Promise<number> {
        return prisma.matakuliah.count();
}

/**
 * Retrieves initial data needed for schedule generation
 * @returns Promise<{matakuliah: any[], ruangan: any[], shift: any[], dosen: any[], aslab: any[]}>
 */
async function getInitialData() {
        const [matakuliah, ruangan, shift, dosen, aslab] = await Promise.all([
                prisma.matakuliah.findMany(),
                prisma.ruanganLaboratorium.findMany(),
                prisma.shift.findMany({ where: { isActive: true } }),
                prisma.dosen.findMany(),
                prisma.asistenLab.findMany(),
        ]);

        return { matakuliah, ruangan, shift, dosen, aslab };
}

/**
 * Gets the current semester and academic year
 * @returns {semester: SEMESTER, tahun: string}
 */
function getCurrentSemesterAndYear(): { semester: SEMESTER; tahun: string } {
        const now = new Date();
        const month = now.getMonth() + 1; // JavaScript months are 0-indexed

        // Determine semester based on month
        // Assume: January-June is GENAP, July-December is GANJIL
        const semester = isGanjilSemester() ? SEMESTER.GANJIL : SEMESTER.GENAP;

        // Get the academic year
        const year = now.getFullYear();
        const nextYear = year + 1;
        const tahun = month >= 7 ? `${year}/${nextYear}` : `${year - 1}/${year}`;

        return { semester, tahun };
}

/**
 * Creates a random schedule with random assignments for matakuliah, ruangan, shift, dosen, and day
 * @param matakuliah - Array of available matakuliah
 * @param ruangan - Array of available ruangan
 * @param shift - Array of available shifts
 * @param dosen - Array of available dosen
 * @param aslab - Array of available asisten lab
 * @returns Schedule A randomly generated schedule
 */
function createRandomSchedule(matakuliah: any[], ruangan: any[], shift: any[], dosen: any[], aslab: any[]): Schedule {
        const randomMatakuliah = matakuliah[Math.floor(Math.random() * matakuliah.length)];
        const randomRuangan = ruangan[Math.floor(Math.random() * ruangan.length)];
        const randomShift = shift[Math.floor(Math.random() * shift.length)];
        const randomDosen = dosen[Math.floor(Math.random() * dosen.length)];
        const randomHari = HARI_LIST[Math.floor(Math.random() * HARI_LIST.length)];

        // Randomly decide whether to assign an asisten lab (30% chance)
        const assignAslab = Math.random() < 0.3 && aslab.length > 0;
        const randomAslab = assignAslab ? aslab[Math.floor(Math.random() * aslab.length)] : null;

        const { semester, tahun } = getCurrentSemesterAndYear();

        return {
                id: ulid(),
                matakuliahId: randomMatakuliah.id,
                ruanganId: randomRuangan.id,
                shiftId: randomShift.id,
                dosenId: randomDosen.id,
                hari: randomHari,
                semester,
                tahun,
                asistenLabId: randomAslab ? randomAslab.id : undefined,
                fitness: 0,
        };
}

/**
 * Calculates the fitness score for a schedule based on conflicts with other schedules
 * @param schedule - The schedule to evaluate
 * @param allSchedules - Array of all schedules to check for conflicts
 * @returns number The fitness score (0-100)
 */
function calculateFitness(schedule: Schedule, allSchedules: Schedule[]): number {
        let fitness = 100; // Start with perfect score

        // Check for conflicts
        for (const otherSchedule of allSchedules) {
                if (schedule.id === otherSchedule.id) continue;

                // Check for room conflicts on the same day and shift
                if (schedule.ruanganId === otherSchedule.ruanganId && schedule.shiftId === otherSchedule.shiftId && schedule.hari === otherSchedule.hari) {
                        fitness -= 20;
                }

                // Check for dosen conflicts on the same day and shift
                if (schedule.dosenId === otherSchedule.dosenId && schedule.shiftId === otherSchedule.shiftId && schedule.hari === otherSchedule.hari) {
                        fitness -= 20;
                }

                // Check for matakuliah conflicts (same course scheduled multiple times)
                if (schedule.matakuliahId === otherSchedule.matakuliahId) {
                        fitness -= 20;
                }

                // Check for asisten lab conflicts on the same day and shift
                if (
                        schedule.asistenLabId &&
                        schedule.asistenLabId === otherSchedule.asistenLabId &&
                        schedule.shiftId === otherSchedule.shiftId &&
                        schedule.hari === otherSchedule.hari
                ) {
                        fitness -= 15;
                }
        }

        return Math.max(0, fitness);
}

/**
 * Performs crossover between two parent schedules to create a child schedule
 * @param parent1 - First parent schedule
 * @param parent2 - Second parent schedule
 * @returns Schedule A new schedule created from the parents
 */
function crossover(parent1: Schedule, parent2: Schedule): Schedule {
        // For current semester and year, we always use the current values
        const { semester, tahun } = getCurrentSemesterAndYear();

        return {
                id: ulid(),
                matakuliahId: Math.random() < 0.5 ? parent1.matakuliahId : parent2.matakuliahId,
                ruanganId: Math.random() < 0.5 ? parent1.ruanganId : parent2.ruanganId,
                shiftId: Math.random() < 0.5 ? parent1.shiftId : parent2.shiftId,
                dosenId: Math.random() < 0.5 ? parent1.dosenId : parent2.dosenId,
                hari: Math.random() < 0.5 ? parent1.hari : parent2.hari,
                semester,
                tahun,
                asistenLabId: Math.random() < 0.5 ? parent1.asistenLabId : parent2.asistenLabId,
                fitness: 0,
        };
}

/**
 * Mutates a schedule by randomly changing one of its properties
 * @param schedule - The schedule to mutate
 * @param matakuliah - Array of available matakuliah
 * @param ruangan - Array of available ruangan
 * @param shift - Array of available shifts
 * @param dosen - Array of available dosen
 * @param aslab - Array of available asisten lab
 * @param mutationRate - Probability of mutation occurring
 * @returns Schedule The potentially mutated schedule
 */
function mutate(schedule: Schedule, matakuliah: any[], ruangan: any[], shift: any[], dosen: any[], aslab: any[], mutationRate: number): Schedule {
        if (Math.random() < mutationRate) {
                const mutatedSchedule = { ...schedule };
                const mutationType = Math.floor(Math.random() * 6); // Added hari and aslab to mutation types

                switch (mutationType) {
                        case 0:
                                mutatedSchedule.matakuliahId = matakuliah[Math.floor(Math.random() * matakuliah.length)].id;
                                break;
                        case 1:
                                mutatedSchedule.ruanganId = ruangan[Math.floor(Math.random() * ruangan.length)].id;
                                break;
                        case 2:
                                mutatedSchedule.shiftId = shift[Math.floor(Math.random() * shift.length)].id;
                                break;
                        case 3:
                                mutatedSchedule.dosenId = dosen[Math.floor(Math.random() * dosen.length)].id;
                                break;
                        case 4:
                                mutatedSchedule.hari = HARI_LIST[Math.floor(Math.random() * HARI_LIST.length)];
                                break;
                        case 5:
                                // 30% chance to have an aslab, 70% chance to have none
                                if (Math.random() < 0.3 && aslab.length > 0) {
                                        mutatedSchedule.asistenLabId = aslab[Math.floor(Math.random() * aslab.length)].id;
                                } else {
                                        mutatedSchedule.asistenLabId = undefined;
                                }
                                break;
                }

                return mutatedSchedule;
        }
        return schedule;
}

/**
 * Generates a schedule using genetic algorithm
 * @returns Promise<Schedule[]> Array of generated schedules sorted by fitness
 */
async function generateSchedule(): Promise<Schedule[]> {
        // Get the number of matakuliah to determine population size
        const matakuliahCount = await getMatakuliahCount();
        const config = { ...DEFAULT_CONFIG, populationSize: matakuliahCount };

        const { matakuliah, ruangan, shift, dosen, aslab } = await getInitialData();
        let population: Schedule[] = [];

        // Initialize population with size equal to matakuliah count
        for (let i = 0; i < matakuliahCount; i++) {
                population.push(createRandomSchedule(matakuliah, ruangan, shift, dosen, aslab));
        }

        // Evolution process
        for (let generation = 0; generation < config.generations; generation++) {
                // Calculate fitness for all schedules
                population = population.map((schedule) => ({
                        ...schedule,
                        fitness: calculateFitness(schedule, population),
                }));

                // Sort by fitness
                population.sort((a, b) => b.fitness - a.fitness);

                // Keep elite schedules
                const newPopulation = population.slice(0, config.eliteSize);

                // Create new population through crossover and mutation
                while (newPopulation.length < matakuliahCount) {
                        const parent1 = population[Math.floor(Math.random() * population.length)];
                        const parent2 = population[Math.floor(Math.random() * population.length)];
                        let child = crossover(parent1, parent2);
                        child = mutate(child, matakuliah, ruangan, shift, dosen, aslab, config.mutationRate);
                        newPopulation.push(child);
                }

                population = newPopulation;
        }

        // Sort final population by fitness
        population.sort((a, b) => b.fitness - a.fitness);

        return population;
}

/**
 * Retrieves existing schedules from the database
 * @returns Promise<any[]> Array of existing schedules
 */
async function getExistingSchedules(): Promise<any[]> {
        const { semester, tahun } = getCurrentSemesterAndYear();

        return prisma.jadwal.findMany({
                where: {
                        semester,
                        tahun,
                        deletedAt: null,
                },
                select: {
                        shiftId: true,
                        ruanganId: true,
                        hari: true,
                        matakuliahId: true,
                        dosenId: true,
                        asistenLabId: true,
                },
        });
}

/**
 * Checks if a schedule would create conflicts with existing schedules
 * @param schedule - The proposed schedule
 * @param existingSchedules - Array of existing schedules
 * @returns boolean - True if there are conflicts, false otherwise
 */
function hasScheduleConflicts(schedule: Schedule, existingSchedules: any[]): boolean {
        // Check for room-shift-day conflict (same room at same time on same day)
        const roomConflict = existingSchedules.some(
                (existing) => existing.ruanganId === schedule.ruanganId && existing.shiftId === schedule.shiftId && existing.hari === schedule.hari
        );

        // Check if this matakuliah already has a schedule
        const matakuliahConflict = existingSchedules.some((existing) => existing.matakuliahId === schedule.matakuliahId);

        // Check for dosen-shift-day conflict (same dosen at same time on same day)
        const dosenConflict = existingSchedules.some(
                (existing) => existing.dosenId === schedule.dosenId && existing.shiftId === schedule.shiftId && existing.hari === schedule.hari
        );

        // Check for asisten lab conflicts on the same day and shift
        const aslabConflict =
                schedule.asistenLabId &&
                existingSchedules.some((existing) => existing.asistenLabId === schedule.asistenLabId && existing.shiftId === schedule.shiftId && existing.hari === schedule.hari);

        return roomConflict || matakuliahConflict || dosenConflict || !!aslabConflict;
}

/**
 * Improved method for generating a schedule using genetic algorithm with conflict validation
 * @param preferredDay - Optional preferred day for scheduling (SENIN, SELASA, etc.)
 * @returns Promise<Schedule[]> Array of generated schedules that don't conflict with existing ones
 */
async function generateScheduleWithValidation(preferredDay?: HARI): Promise<Schedule[]> {
        // Get the number of matakuliah to determine population size
        const matakuliahCount = await getMatakuliahCount();
        const config = { ...DEFAULT_CONFIG, populationSize: matakuliahCount };

        const { matakuliah, ruangan, shift, dosen, aslab } = await getInitialData();
        const existingSchedules = await getExistingSchedules();

        // Filter out matakuliah that already have schedules
        const availableMatakuliah = matakuliah.filter((mk) => !existingSchedules.some((existing) => existing.matakuliahId === mk.id));

        if (availableMatakuliah.length === 0) {
                // All matakuliah already have schedules
                return [];
        }

        let population: Schedule[] = [];
        const targetPopulationSize = Math.min(matakuliahCount, availableMatakuliah.length);
        const maxAttempts = 1000; // Limit attempts to prevent infinite loop
        let attempts = 0;

        // Initialize population with valid schedules
        while (population.length < targetPopulationSize && attempts < maxAttempts) {
                attempts++;
                const schedule = createRandomSchedule(availableMatakuliah, ruangan, shift, dosen, aslab);

                // If a preferred day is specified, set the schedule to that day
                if (preferredDay) {
                        schedule.hari = preferredDay;
                }

                // Only add schedules that don't conflict with existing ones
                if (!hasScheduleConflicts(schedule, existingSchedules)) {
                        population.push(schedule);
                }
        }

        // If we couldn't generate enough valid schedules, proceed with what we have
        if (population.length === 0) {
                return [];
        }

        // Evolution process
        for (let generation = 0; generation < config.generations; generation++) {
                // Calculate fitness for all schedules
                population = population.map((schedule) => ({
                        ...schedule,
                        fitness: calculateFitness(schedule, population),
                }));

                // Sort by fitness
                population.sort((a, b) => b.fitness - a.fitness);

                // Keep elite schedules
                const newPopulation = population.slice(0, Math.min(config.eliteSize, population.length));

                // Create new population through crossover and mutation
                let newPopulationAttempts = 0;
                const maxNewPopulationAttempts = 1000; // Limit attempts for new population

                while (newPopulation.length < targetPopulationSize && newPopulationAttempts < maxNewPopulationAttempts) {
                        newPopulationAttempts++;
                        const parent1 = population[Math.floor(Math.random() * population.length)];
                        const parent2 = population[Math.floor(Math.random() * population.length)];
                        let child = crossover(parent1, parent2);
                        child = mutate(child, availableMatakuliah, ruangan, shift, dosen, aslab, config.mutationRate);

                        // If preferred day is specified, ensure all schedules use that day
                        if (preferredDay) {
                                child.hari = preferredDay;
                        }

                        // Only add valid schedules that don't conflict with existing ones
                        if (!hasScheduleConflicts(child, existingSchedules)) {
                                newPopulation.push(child);
                        }
                }

                population = newPopulation;

                // If population becomes empty due to constraints, break the loop
                if (population.length === 0) {
                        break;
                }
        }

        // Sort final population by fitness
        population.sort((a, b) => b.fitness - a.fitness);

        return population;
}

/**
 * Generate meeting dates for a schedule based on semester start and end dates
 * @param schedule - The schedule to generate meeting dates for
 * @param numberOfMeetings - Number of meetings to generate (default: 12, maximum: 12)
 * @returns Array of meeting dates as strings in YYYY-MM-DD format
 */
async function generateMeetingDates(jadwalId: string, numberOfMeetings: number = 12): Promise<string[]> {
        // Ensure number of meetings doesn't exceed 12
        numberOfMeetings = Math.min(numberOfMeetings, 12);

        // Get the schedule
        const jadwal = await prisma.jadwal.findUnique({
                where: { id: jadwalId },
                select: { hari: true, semester: true, tahun: true },
        });

        if (!jadwal) {
                throw new Error(`Schedule with ID ${jadwalId} not found`);
        }

        // Determine semester start and end dates based on current year and semester
        const [startYear] = jadwal.tahun.split("/").map(Number);

        let semesterStartDate: Date;
        if (jadwal.semester === SEMESTER.GANJIL) {
                // Ganjil semester typically starts in September
                semesterStartDate = new Date(startYear, 8, 1); // September 1st
        } else {
                // Genap semester typically starts in February
                semesterStartDate = new Date(startYear, 1, 1); // February 1st
        }

        // Find the first occurrence of the desired day of the week
        const dayMap: Record<HARI, number> = {
                SENIN: 1,
                SELASA: 2,
                RABU: 3,
                KAMIS: 4,
                JUMAT: 5,
                SABTU: 6,
                // Sunday is 0 but we're not using it
        };

        const targetDayNumber = dayMap[jadwal.hari as HARI];
        let currentDate = new Date(semesterStartDate);

        // Adjust to first occurrence of the target day
        while (currentDate.getDay() !== targetDayNumber) {
                currentDate.setDate(currentDate.getDate() + 1);
        }

        // Generate meeting dates (one week apart) as strings in YYYY-MM-DD format
        const meetingDates: string[] = [];
        for (let i = 0; i < numberOfMeetings; i++) {
                const dateStr = currentDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD
                meetingDates.push(dateStr);
                currentDate.setDate(currentDate.getDate() + 7); // Next week
        }

        return meetingDates;
}

/**
 * Save a generated schedule to the database
 * @param schedule - The schedule to save
 * @returns Promise<any> The saved schedule record
 */
async function saveSchedule(schedule: Schedule): Promise<any> {
        // Extract just the fields needed for saving to the database
        const { id, matakuliahId, ruanganId, shiftId, dosenId, hari, semester, tahun, asistenLabId, mahasiswaId } = schedule;

        // Create the jadwal record
        const jadwal = await prisma.jadwal.create({
                data: {
                        id,
                        matakuliahId,
                        ruanganId,
                        shiftId,
                        dosenId,
                        hari,
                        semester,
                        tahun,
                        asistenLabId,
                        mahasiswaId,
                },
        });

        // Generate and save meeting dates (maximum 12 meetings)
        const meetingDates = await generateMeetingDates(jadwal.id, 12);

        // Create meeting records
        const meetings = await Promise.all(
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
                jadwal,
                meetings,
        };
}

// Export the updated service
export const jadwalGeneticService = {
        generateSchedule,
        generateScheduleWithValidation,
        saveSchedule,
        generateMeetingDates,
        getExistingSchedules,
        hasScheduleConflicts,
};
