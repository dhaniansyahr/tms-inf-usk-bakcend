import { prisma } from "$utils/prisma.utils";
import { isGanjilSemester } from "$utils/strings.utils";
import { SEMESTER } from "@prisma/client";
import { ulid } from "ulid";
import Logger from "$pkg/logger";

// Days of the week in Indonesian
export type HARI = "SENIN" | "SELASA" | "RABU" | "KAMIS" | "JUMAT" | "SABTU";
export const HARI_LIST: HARI[] = [
    "SENIN",
    "SELASA",
    "RABU",
    "KAMIS",
    "JUMAT",
    "SABTU",
];

interface Schedule {
    id: string;
    matakuliahId: string;
    ruanganId: string;
    shiftId: string;
    dosenIds: string[];
    hari: HARI;
    semester: SEMESTER;
    tahun: string;
    mahasiswaIds: string[];
    asistenLabIds: string[];
    kelas: string; // Class name from theory schedule
    fitness: number;
}

interface TheoryClass {
    kelas: string;
    mahasiswa: any[];
    dosen: any[];
    jadwalId: string;
}

interface GeneticAlgorithmConfig {
    populationSize: number;
    generations: number;
    mutationRate: number;
    eliteSize: number;
}

const DEFAULT_CONFIG: GeneticAlgorithmConfig = {
    populationSize: 30,
    generations: 50,
    mutationRate: 0.2,
    eliteSize: 10,
};

/**
 * Gets the current semester and academic year
 */
function getCurrentSemesterAndYear(): { semester: SEMESTER; tahun: string } {
    const now = new Date();
    const month = now.getMonth() + 1;

    const semester = isGanjilSemester() ? SEMESTER.GENAP : SEMESTER.GANJIL;

    const year = now.getFullYear();
    const nextYear = year + 1;
    const tahun = month >= 7 ? `${year}/${nextYear}` : `${year - 1}/${year}`;

    return { semester, tahun };
}

/**
 * Retrieves existing schedules from the database
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
            kelas: true,
            dosen: {
                select: { id: true },
            },
        },
    });
}

/**
 * Checks for conflicts based on simplified constraints:
 * - Same shift + same ruangan
 * - Same shift + same hari + same dosen
 */
function hasScheduleConflicts(
    schedule: Schedule,
    existingSchedules: any[]
): boolean {
    if (!existingSchedules || !Array.isArray(existingSchedules)) {
        return false;
    }

    return existingSchedules.some((existing) => {
        if (!existing) return false;

        // Same shift conflicts
        if (existing.shiftId === schedule.shiftId) {
            // Room conflict (same room at same shift)
            if (existing.ruanganId === schedule.ruanganId) {
                return true;
            }

            // Dosen conflict (same dosen at same shift and day)
            if (existing.hari === schedule.hari) {
                // Ensure arrays exist before checking
                if (!schedule.dosenIds || !Array.isArray(schedule.dosenIds)) {
                    return false;
                }

                if (!existing.dosen || !Array.isArray(existing.dosen)) {
                    return false;
                }

                const dosenConflict = schedule.dosenIds.some((dosenId) =>
                    existing.dosen.some((d: any) => d && d.id === dosenId)
                );
                if (dosenConflict) {
                    return true;
                }
            }
        }

        return false;
    });
}

/**
 * Simplified fitness calculation focusing on main constraints
 */
function calculateFitness(
    schedule: Schedule,
    allSchedules: Schedule[]
): number {
    let fitness = 100;

    if (!allSchedules || !Array.isArray(allSchedules)) {
        return fitness;
    }

    // Check for conflicts with other schedules in the population
    for (const otherSchedule of allSchedules) {
        if (!otherSchedule || schedule.id === otherSchedule.id) continue;

        // Same shift conflicts
        if (schedule.shiftId === otherSchedule.shiftId) {
            // Room conflicts
            if (schedule.ruanganId === otherSchedule.ruanganId) {
                fitness -= 30;
            }

            // Dosen conflicts on same day
            if (schedule.hari === otherSchedule.hari) {
                // Ensure arrays exist before checking
                if (
                    schedule.dosenIds &&
                    Array.isArray(schedule.dosenIds) &&
                    otherSchedule.dosenIds &&
                    Array.isArray(otherSchedule.dosenIds)
                ) {
                    const dosenOverlap = schedule.dosenIds.some((dosenId) =>
                        otherSchedule.dosenIds.includes(dosenId)
                    );
                    if (dosenOverlap) {
                        fitness -= 25;
                    }
                }
            }
        }
    }

    return Math.max(0, fitness);
}

/**
 * Mutation function
 */
function mutate(
    schedule: Schedule,
    ruangan: any[],
    shift: any[],
    mutationRate: number
): Schedule {
    if (Math.random() < mutationRate) {
        const mutatedSchedule = { ...schedule };
        const mutationType = Math.floor(Math.random() * 3);

        switch (mutationType) {
            case 0:
                mutatedSchedule.ruanganId =
                    ruangan[Math.floor(Math.random() * ruangan.length)].id;
                break;
            case 1:
                mutatedSchedule.shiftId =
                    shift[Math.floor(Math.random() * shift.length)].id;
                break;
            case 2:
                mutatedSchedule.hari =
                    HARI_LIST[Math.floor(Math.random() * HARI_LIST.length)];
                break;
        }

        return mutatedSchedule;
    }
    return schedule;
}

/**
 * Crossover function
 */
function crossover(parent1: Schedule, parent2: Schedule): Schedule {
    return {
        ...parent1,
        id: ulid(),
        ruanganId: Math.random() < 0.5 ? parent1.ruanganId : parent2.ruanganId,
        shiftId: Math.random() < 0.5 ? parent1.shiftId : parent2.shiftId,
        hari: Math.random() < 0.5 ? parent1.hari : parent2.hari,
        fitness: 0,
    };
}

/**
 * Tournament selection
 */
function tournamentSelection(
    population: Schedule[],
    tournamentSize: number
): Schedule {
    const tournament = [];
    for (let i = 0; i < tournamentSize; i++) {
        const randomIndex = Math.floor(Math.random() * population.length);
        tournament.push(population[randomIndex]);
    }

    tournament.sort((a, b) => b.fitness - a.fitness);
    return tournament[0];
}

/**
 * Extract classes from theory schedules
 */
function extractClassesFromTheorySchedules(
    theorySchedules: any[]
): TheoryClass[] {
    if (!theorySchedules || !Array.isArray(theorySchedules)) {
        return [];
    }

    const classes: TheoryClass[] = [];

    for (const schedule of theorySchedules) {
        if (!schedule) continue;

        classes.push({
            kelas: schedule.kelas || "A", // Default to A if no class specified
            mahasiswa: Array.isArray(schedule.mahasiswa)
                ? schedule.mahasiswa
                : [],
            dosen: Array.isArray(schedule.dosen) ? schedule.dosen : [],
            jadwalId: schedule.id || "",
        });
    }

    return classes;
}

/**
 * Generate practical schedules using genetic algorithm
 * Based on existing theory course structure
 */
async function generatePracticalSchedules(
    practicalMatakuliah: any[],
    theorySchedules: any[],
    preferredDay?: HARI
): Promise<Schedule[]> {
    try {
        Logger.info(
            `Generating schedules for ${practicalMatakuliah.length} practical courses...`
        );

        const [ruangan, shift] = await Promise.all([
            prisma.ruanganLaboratorium.findMany({
                where: { isActive: true },
            }),
            prisma.shift.findMany({
                where: { isActive: true },
            }),
        ]);

        const existingSchedules = await getExistingSchedules();
        const { semester, tahun } = getCurrentSemesterAndYear();
        const allSchedules: Schedule[] = [];

        // Process each practical matakuliah
        for (const practicalMK of practicalMatakuliah) {
            Logger.info(`Processing practical course: ${practicalMK.nama}`);

            // Find corresponding theory course by removing "PRAKTIKUM" from name
            const theoryCourseName = practicalMK.nama
                .replace(/\s*PRAKTIKUM\s*/i, "")
                .trim();

            Logger.info(`Looking for theory course: ${theoryCourseName}`);

            // Find theory schedules for this course
            const correspondingTheorySchedules = theorySchedules.filter(
                (schedule) => {
                    if (
                        !schedule ||
                        !schedule.matakuliah ||
                        !schedule.matakuliah.nama
                    ) {
                        return false;
                    }
                    return (
                        schedule.matakuliah.nama.toLowerCase() ===
                        theoryCourseName.toLowerCase()
                    );
                }
            );

            if (correspondingTheorySchedules.length === 0) {
                Logger.warn(
                    `No corresponding theory course found for: ${practicalMK.nama}`
                );
                continue;
            }

            Logger.info(
                `Found ${correspondingTheorySchedules.length} theory classes for ${practicalMK.nama}`
            );

            // Extract class structure from theory schedules
            const theoryClasses = extractClassesFromTheorySchedules(
                correspondingTheorySchedules
            );

            // Generate schedule for each class
            for (const theoryClass of theoryClasses) {
                Logger.info(
                    `Generating practical schedule for ${practicalMK.nama} - Class ${theoryClass.kelas}`
                );

                const classSchedule = await generateScheduleForClass(
                    practicalMK,
                    theoryClass,
                    ruangan,
                    shift,
                    semester,
                    tahun,
                    preferredDay
                );

                if (classSchedule) {
                    // Check for conflicts with existing and already generated schedules
                    const allExistingSchedules = [
                        ...existingSchedules,
                        ...allSchedules,
                    ];

                    if (
                        !hasScheduleConflicts(
                            classSchedule,
                            allExistingSchedules
                        )
                    ) {
                        allSchedules.push(classSchedule);
                        Logger.info(
                            `✓ Generated schedule for ${practicalMK.nama} - Class ${theoryClass.kelas}`
                        );
                    } else {
                        Logger.warn(
                            `✗ Schedule conflict detected for ${practicalMK.nama} - Class ${theoryClass.kelas}`
                        );
                    }
                }
            }
        }

        Logger.info(
            `Successfully generated ${allSchedules.length} practical schedules`
        );
        return allSchedules;
    } catch (error) {
        Logger.error(`Error generating practical schedules: ${error}`);
        throw error;
    }
}

/**
 * Generate schedule for a specific class using genetic algorithm
 */
async function generateScheduleForClass(
    matakuliah: any,
    theoryClass: TheoryClass,
    ruangan: any[],
    shift: any[],
    semester: SEMESTER,
    tahun: string,
    preferredDay?: HARI
): Promise<Schedule | null> {
    try {
        const config = DEFAULT_CONFIG;
        let population: Schedule[] = [];

        // Get available dosen from theory class
        const availableDosen = theoryClass.dosen;
        if (
            !availableDosen ||
            !Array.isArray(availableDosen) ||
            availableDosen.length === 0
        ) {
            Logger.warn(`No dosen available for class ${theoryClass.kelas}`);
            return null;
        }

        // Get available mahasiswa from theory class
        const availableMahasiswa = theoryClass.mahasiswa;
        if (!availableMahasiswa || !Array.isArray(availableMahasiswa)) {
            Logger.warn(
                `No mahasiswa available for class ${theoryClass.kelas}`
            );
            return null;
        }

        // Initialize population
        for (let i = 0; i < config.populationSize; i++) {
            const schedule: Schedule = {
                id: ulid(),
                matakuliahId: matakuliah.id,
                ruanganId:
                    ruangan[Math.floor(Math.random() * ruangan.length)].id,
                shiftId: shift[Math.floor(Math.random() * shift.length)].id,
                dosenIds: [
                    availableDosen[
                        Math.floor(Math.random() * availableDosen.length)
                    ].id,
                ],
                hari:
                    preferredDay ||
                    HARI_LIST[Math.floor(Math.random() * HARI_LIST.length)],
                semester,
                tahun,
                mahasiswaIds: availableMahasiswa
                    .map((s) => s.id)
                    .filter(Boolean),
                asistenLabIds: [],
                kelas: theoryClass.kelas,
                fitness: 0,
            };

            population.push(schedule);
        }

        // Evolution process
        for (
            let generation = 0;
            generation < config.generations;
            generation++
        ) {
            // Calculate fitness
            population = population.map((schedule) => ({
                ...schedule,
                fitness: calculateFitness(schedule, population),
            }));

            // Sort by fitness
            population.sort((a, b) => b.fitness - a.fitness);

            // Early termination if we find a perfect solution
            if (population[0].fitness >= 100) {
                break;
            }

            // Create new population
            const newPopulation = population.slice(0, config.eliteSize);

            while (newPopulation.length < config.populationSize) {
                const parent1 = tournamentSelection(population, 3);
                const parent2 = tournamentSelection(population, 3);

                let child = crossover(parent1, parent2);
                child = mutate(child, ruangan, shift, config.mutationRate);

                // Preserve class-specific properties
                child.matakuliahId = matakuliah.id;
                child.dosenIds = [
                    availableDosen[
                        Math.floor(Math.random() * availableDosen.length)
                    ].id,
                ];
                child.mahasiswaIds = availableMahasiswa
                    .map((s) => s.id)
                    .filter(Boolean);
                child.kelas = theoryClass.kelas;

                if (preferredDay) {
                    child.hari = preferredDay;
                }

                newPopulation.push(child);
            }

            population = newPopulation;
        }

        // Return best schedule
        population.sort((a, b) => b.fitness - a.fitness);
        const bestSchedule = population[0];

        Logger.info(
            `Best fitness for ${matakuliah.nama} - Class ${theoryClass.kelas}: ${bestSchedule.fitness}`
        );

        return bestSchedule;
    } catch (error) {
        Logger.error(`Error generating schedule for class: ${error}`);
        return null;
    }
}

/**
 * Validates if a complete schedule set meets the simplified constraints
 */
async function validateScheduleSet(
    schedules: Schedule[]
): Promise<{ isValid: boolean; violations: string[] }> {
    const violations: string[] = [];

    // Check for conflicts between schedules
    for (let i = 0; i < schedules.length; i++) {
        for (let j = i + 1; j < schedules.length; j++) {
            const schedule1 = schedules[i];
            const schedule2 = schedules[j];

            // Same shift conflicts
            if (schedule1.shiftId === schedule2.shiftId) {
                // Room conflicts
                if (schedule1.ruanganId === schedule2.ruanganId) {
                    violations.push(
                        `Room conflict: ${schedule1.kelas} and ${schedule2.kelas} both use same room at same shift`
                    );
                }

                // Dosen conflicts on same day
                if (schedule1.hari === schedule2.hari) {
                    const dosenOverlap = schedule1.dosenIds.some((dosenId) =>
                        schedule2.dosenIds.includes(dosenId)
                    );
                    if (dosenOverlap) {
                        violations.push(
                            `Dosen conflict: ${schedule1.kelas} and ${schedule2.kelas} have same dosen on ${schedule1.hari} at same shift`
                        );
                    }
                }
            }
        }
    }

    return {
        isValid: violations.length === 0,
        violations,
    };
}

/**
 * Save a generated schedule to the database
 */
async function saveSchedule(schedule: Schedule): Promise<any> {
    const {
        id,
        matakuliahId,
        ruanganId,
        shiftId,
        dosenIds,
        hari,
        semester,
        tahun,
        asistenLabIds,
        mahasiswaIds,
        kelas,
    } = schedule;

    const jadwal = await prisma.jadwal.create({
        data: {
            id,
            matakuliahId,
            ruanganId,
            shiftId,
            hari,
            semester,
            tahun,
            kelas,
            dosen: {
                connect: dosenIds.map((dosenId) => ({ id: dosenId })),
            },
            asisten: {
                connect: asistenLabIds.map((asistenId) => ({ id: asistenId })),
            },
            mahasiswa: {
                connect: mahasiswaIds.map((mahasiswaId) => ({
                    id: mahasiswaId,
                })),
            },
        },
    });

    return { jadwal };
}

// Export the service
export const jadwalGeneticService = {
    getCurrentSemesterAndYear,
    getExistingSchedules,
    hasScheduleConflicts,
    validateScheduleSet,
    generatePracticalSchedules,
    saveSchedule,
};
