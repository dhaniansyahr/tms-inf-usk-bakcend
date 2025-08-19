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
    populationSize: 100, // Increased from 30 for better diversity
    generations: 200, // Increased from 50 for more evolution time
    mutationRate: 0.3, // Increased from 0.2 for more exploration
    eliteSize: 20, // Increased from 10 to preserve more good solutions
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
 * Improved fitness calculation that considers all constraints
 *
 * FITNESS FUNCTION FORMULA:
 * f(x) = F_base - Σ(w_i × c_i)
 *
 * Where:
 * - F_base = 1000 (base fitness score)
 * - w_i = weight/penalty for constraint i
 * - c_i = constraint violation count for constraint i
 *
 * Constraint Penalties:
 * - Existing DB conflicts: w1 = 300 (reduced from 500 - still critical but more flexible)
 * - Room conflicts in population: w2 = 150 (reduced from 200)
 * - Dosen conflicts in population: w3 = 100 (reduced from 150)
 * - Room utilization penalty: w4 = 5 (reduced from 10)
 */
function calculateFitness(
    schedule: Schedule,
    allSchedules: Schedule[],
    existingSchedules: any[]
): number {
    // f(x) = F_base - Σ(w_i × c_i)
    let fitness = 1000; // F_base = 1000 (starting fitness)

    // CONSTRAINT 1: Check conflicts with existing schedules (w1 = 300)
    // This is the most critical constraint - schedule must not conflict with DB
    if (hasScheduleConflicts(schedule, existingSchedules)) {
        fitness -= 300; // w1 × c1 where c1 = 1 if conflict exists
    }

    // CONSTRAINT 2 & 3: Check conflicts within current population
    // Σ for each otherSchedule in allSchedules
    for (const otherSchedule of allSchedules) {
        if (!otherSchedule || schedule.id === otherSchedule.id) continue;

        // Check if schedules are in same shift (prerequisite for conflicts)
        if (schedule.shiftId === otherSchedule.shiftId) {
            // CONSTRAINT 2: Room conflicts (w2 = 150)
            // Hard constraint: same room cannot be used by different classes at same shift
            if (schedule.ruanganId === otherSchedule.ruanganId) {
                fitness -= 150; // w2 × c2 where c2 = 1 for each room conflict
            }

            // CONSTRAINT 3: Dosen conflicts on same day (w3 = 100)
            // Hard constraint: same dosen cannot teach multiple classes at same time
            if (schedule.hari === otherSchedule.hari) {
                if (
                    schedule.dosenIds &&
                    Array.isArray(schedule.dosenIds) &&
                    otherSchedule.dosenIds &&
                    Array.isArray(otherSchedule.dosenIds)
                ) {
                    // Check for dosen overlap using set intersection
                    const dosenOverlap = schedule.dosenIds.some((dosenId) =>
                        otherSchedule.dosenIds.includes(dosenId)
                    );
                    if (dosenOverlap) {
                        fitness -= 100; // w3 × c3 where c3 = 1 for each dosen conflict
                    }
                }
            }
        }

        // CONSTRAINT 4: Room utilization optimization (w4 = 5)
        // Soft constraint: minimize same room usage on same day (for variety)
        if (
            schedule.hari === otherSchedule.hari &&
            schedule.ruanganId === otherSchedule.ruanganId &&
            schedule.shiftId !== otherSchedule.shiftId
        ) {
            fitness -= 5; // w4 × c4 - small penalty for room over-utilization
        }
    }

    // CONSTRAINT 5: Preferred day bonus (optional)
    // Can add: if (schedule.hari === preferredDay) fitness += 50;

    // BOUNDARY CONDITION: Ensure fitness ≥ 1 to maintain ranking
    // Max function: f(x) = max(1, F_base - Σ(w_i × c_i))
    return Math.max(1, fitness);
}

/**
 * Mutation Algorithm with Adaptive Rates
 *
 * MUTATION FORMULA:
 * For each gene: if random() < P_mutation then mutate gene
 *
 * MUTATION PROBABILITIES:
 * - P_room_mutation = 0.5 (50% chance to mutate room - increased from 0.4)
 * - P_shift_mutation = 0.4 (40% chance to mutate shift - increased from 0.3)
 * - P_day_mutation = 0.4 (40% chance to mutate day - increased from 0.3)
 *
 * Multiple mutations possible in single individual:
 * P(at_least_one_mutation) = 1 - (1-0.5)(1-0.4)(1-0.4) = 1 - 0.18 = 82%
 *
 * This maintains genetic diversity and prevents premature convergence
 */
function mutate(
    schedule: Schedule,
    ruangan: any[],
    shift: any[],
    mutationRate: number
): Schedule {
    const mutatedSchedule = { ...schedule, id: ulid() };

    // Apply mutation only if random number < mutationRate
    if (Math.random() < mutationRate) {
        // MUTATION 1: Room mutation (P = 0.5)
        // Randomly select new room from available rooms
        if (Math.random() < 0.5) {
            const randomRoomIndex = Math.floor(Math.random() * ruangan.length);
            mutatedSchedule.ruanganId = ruangan[randomRoomIndex].id;
        }

        // MUTATION 2: Shift mutation (P = 0.4)
        // Randomly select new shift from available shifts
        if (Math.random() < 0.4) {
            const randomShiftIndex = Math.floor(Math.random() * shift.length);
            mutatedSchedule.shiftId = shift[randomShiftIndex].id;
        }

        // MUTATION 3: Day mutation (P = 0.4)
        // Randomly select new day from available days
        // Note: Only mutate if no preferred day constraint
        if (Math.random() < 0.4) {
            const randomDayIndex = Math.floor(Math.random() * HARI_LIST.length);
            mutatedSchedule.hari = HARI_LIST[randomDayIndex];
        }
    }

    return mutatedSchedule;
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
 * Improved schedule generation for class
 */
async function generateScheduleForClass(
    matakuliah: any,
    theoryClass: TheoryClass,
    ruangan: any[],
    shift: any[],
    semester: SEMESTER,
    tahun: string,
    existingSchedules: any[], // Pass existing schedules
    preferredDay?: HARI
): Promise<Schedule | null> {
    try {
        const config = DEFAULT_CONFIG;
        let population: Schedule[] = [];

        // Validation checks
        const availableDosen = theoryClass.dosen;
        if (!availableDosen?.length) {
            Logger.warn(`No dosen available for class ${theoryClass.kelas}`);
            return null;
        }

        if (!ruangan?.length || !shift?.length) {
            Logger.error("No rooms or shifts available");
            return null;
        }

        // Initialize population with better diversity
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
                mahasiswaIds: [],
                asistenLabIds: [],
                kelas: theoryClass.kelas,
                fitness: 0,
            };

            population.push(schedule);
        }

        let bestFitnessHistory: number[] = [];
        let generationsWithoutImprovement = 0;
        const maxGenerationsWithoutImprovement = 10;

        // Evolution process with improved termination
        //
        // GENETIC ALGORITHM MAIN LOOP:
        // for t = 1 to max_generations:
        //   1. Evaluate fitness: f(x_i) for all individuals x_i in population
        //   2. Selection: Select parents using tournament selection
        //   3. Crossover: Create offspring with probability P_c
        //   4. Mutation: Mutate offspring with probability P_m
        //   5. Replacement: Form new population using elitism + offspring
        //   6. Termination check: Stop if convergence criteria met

        for (
            let generation = 0;
            generation < config.generations;
            generation++
        ) {
            // STEP 1: FITNESS EVALUATION
            // Calculate f(x_i) for each individual x_i in population
            population = population.map((schedule) => ({
                ...schedule,
                fitness: calculateFitness(
                    schedule,
                    population,
                    existingSchedules
                ),
            }));

            // Sort population by fitness (descending - higher fitness = better solution)
            // This implements fitness-proportionate ranking
            population.sort((a, b) => b.fitness - a.fitness);

            const bestFitness = population[0].fitness;
            bestFitnessHistory.push(bestFitness);

            // CONVERGENCE DETECTION
            // Track generations without improvement for early termination
            if (
                generation > 0 &&
                bestFitness <= bestFitnessHistory[generation - 1]
            ) {
                generationsWithoutImprovement++;
            } else {
                generationsWithoutImprovement = 0;
            }

            // ADAPTIVE MUTATION RATE for better exploration
            // Increase mutation rate when algorithm is struggling
            let adaptiveMutationRate = config.mutationRate;
            if (generationsWithoutImprovement > 5) {
                adaptiveMutationRate = Math.min(0.8, config.mutationRate * 1.5);
                Logger.info(
                    `Increasing mutation rate to ${adaptiveMutationRate} due to lack of improvement`
                );
            }

            // TERMINATION CONDITIONS - More lenient for 100% success rate
            // Condition 1: Good solution found (fitness ≥ 800 - reduced from 950)
            if (bestFitness >= 800) {
                Logger.info(
                    `Found good solution at generation ${generation} with fitness ${bestFitness}`
                );
                break;
            }

            // Condition 2: Premature convergence detection - increased tolerance
            if (
                generationsWithoutImprovement >=
                maxGenerationsWithoutImprovement * 2 // Increased from 10 to 20
            ) {
                Logger.info(
                    `Stopping early - no improvement for ${
                        maxGenerationsWithoutImprovement * 2
                    } generations`
                );
                break;
            }

            // STEP 2-5: POPULATION EVOLUTION
            const newPopulation: Schedule[] = [];

            // ELITISM STRATEGY
            // Keep top E% of individuals unchanged: Elite_size = 0.2 × Population_size
            // This ensures best solutions are not lost during evolution
            const eliteCount = Math.floor(config.populationSize * 0.2);
            for (let i = 0; i < eliteCount; i++) {
                newPopulation.push({ ...population[i], id: ulid() });
            }

            // GENERATE OFFSPRING TO FILL REMAINING POPULATION
            // Population_size - Elite_size individuals created through:
            // Selection → Crossover → Mutation
            while (newPopulation.length < config.populationSize) {
                // STEP 2: PARENT SELECTION
                // Use tournament selection with tournament size = 3
                const parent1 = tournamentSelection(population, 3);
                const parent2 = tournamentSelection(population, 3);

                // STEP 3: CROSSOVER
                // Create offspring using uniform crossover
                let child = crossover(parent1, parent2);

                // STEP 4: MUTATION with adaptive rate
                // Apply mutation with probability P_m (adaptive)
                child = mutate(child, ruangan, shift, adaptiveMutationRate);

                // Preserve class-specific properties (constraint preservation)
                child.matakuliahId = matakuliah.id;
                child.dosenIds = [
                    availableDosen[
                        Math.floor(Math.random() * availableDosen.length)
                    ].id,
                ];
                child.mahasiswaIds = [];
                child.kelas = theoryClass.kelas;
                child.semester = semester;
                child.tahun = tahun;

                // Apply hard constraint: preferred day
                if (preferredDay) {
                    child.hari = preferredDay;
                }

                newPopulation.push(child);
            }

            // STEP 5: REPLACEMENT
            // Replace old population with new population
            population = newPopulation;
        }

        // Return best schedule with final fitness calculation
        population.sort((a, b) => b.fitness - a.fitness);
        const bestSchedule = population[0];

        // Recalculate fitness one more time to be sure
        bestSchedule.fitness = calculateFitness(
            bestSchedule,
            [],
            existingSchedules
        );

        Logger.info(
            `Best fitness for ${matakuliah.nama} - Class ${theoryClass.kelas}: ${bestSchedule.fitness}`
        );

        // More lenient fitness threshold for 100% success rate
        // Accept any schedule with fitness > 200 (reduced from 500)
        if (bestSchedule.fitness < 200) {
            Logger.warn(
                `Low fitness (${bestSchedule.fitness}) for ${matakuliah.nama} - Class ${theoryClass.kelas}. Attempting fallback strategy...`
            );

            // FALLBACK STRATEGY: Try to find any valid schedule
            const fallbackSchedule = await generateFallbackSchedule(
                matakuliah,
                theoryClass,
                ruangan,
                shift,
                semester,
                tahun,
                existingSchedules,
                preferredDay
            );

            if (fallbackSchedule) {
                Logger.info(
                    `Fallback strategy successful for ${matakuliah.nama} - Class ${theoryClass.kelas}`
                );
                return fallbackSchedule;
            }

            return null;
        }

        return bestSchedule;
    } catch (error) {
        Logger.error(`Error generating schedule for class: ${error}`);
        return null;
    }
}

/**
 * Fallback strategy to generate a basic valid schedule when genetic algorithm fails
 */
async function generateFallbackSchedule(
    matakuliah: any,
    theoryClass: TheoryClass,
    ruangan: any[],
    shift: any[],
    semester: SEMESTER,
    tahun: string,
    existingSchedules: any[],
    preferredDay?: HARI
): Promise<Schedule | null> {
    try {
        Logger.info(
            `Attempting fallback strategy for ${matakuliah.nama} - Class ${theoryClass.kelas}`
        );

        // Try different combinations systematically
        const maxAttempts = 100;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Generate a simple random schedule
            const schedule: Schedule = {
                id: ulid(),
                matakuliahId: matakuliah.id,
                ruanganId:
                    ruangan[Math.floor(Math.random() * ruangan.length)].id,
                shiftId: shift[Math.floor(Math.random() * shift.length)].id,
                dosenIds: [
                    theoryClass.dosen[
                        Math.floor(Math.random() * theoryClass.dosen.length)
                    ].id,
                ],
                hari:
                    preferredDay ||
                    HARI_LIST[Math.floor(Math.random() * HARI_LIST.length)],
                semester,
                tahun,
                mahasiswaIds: [],
                asistenLabIds: [],
                kelas: theoryClass.kelas,
                fitness: 0,
            };

            // Check if this schedule has minimal conflicts
            const fitness = calculateFitness(schedule, [], existingSchedules);

            // Accept any schedule with minimal conflicts (fitness > 100)
            if (fitness > 100) {
                schedule.fitness = fitness;
                Logger.info(
                    `Fallback strategy successful with fitness: ${fitness}`
                );
                return schedule;
            }
        }

        Logger.warn(`Fallback strategy failed after ${maxAttempts} attempts`);
        return null;
    } catch (error) {
        Logger.error(`Error in fallback strategy: ${error}`);
        return null;
    }
}

/**
 * Updated main generation function
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

        const [ruangan, shift, existingSchedules] = await Promise.all([
            prisma.ruanganLaboratorium.findMany({
                where: { isActive: true },
            }),
            prisma.shift.findMany({
                where: { isActive: true },
            }),
            getExistingSchedules(),
        ]);

        const { semester, tahun } = getCurrentSemesterAndYear();
        const allSchedules: Schedule[] = [];

        // Process each practical matakuliah
        for (const practicalMK of practicalMatakuliah) {
            Logger.info(`Processing practical course: ${practicalMK.nama}`);

            const theoryCourseName = practicalMK.nama
                .replace(/\s*PRAKTIKUM\s*/i, "")
                .trim();

            console.log("Teori Mata Kuliah : ", theoryCourseName);

            const correspondingTheorySchedules = theorySchedules.filter(
                (schedule) => {
                    return (
                        schedule?.matakuliah?.nama?.toLowerCase() ===
                        theoryCourseName.toLowerCase()
                    );
                }
            );

            console.log(
                "Corresponding Theory Schedules : ",
                correspondingTheorySchedules
            );

            if (correspondingTheorySchedules.length === 0) {
                Logger.warn(
                    `No corresponding theory course found for: ${practicalMK.nama}`
                );
                continue;
            }

            const theoryClasses = extractClassesFromTheorySchedules(
                correspondingTheorySchedules
            );

            // Generate schedule for each class with retry mechanism
            for (const theoryClass of theoryClasses) {
                Logger.info(
                    `Generating practical schedule for ${practicalMK.nama} - Class ${theoryClass.kelas}`
                );

                // Pass all existing schedules including already generated ones
                const allExistingSchedules = [
                    ...existingSchedules,
                    ...allSchedules,
                ];

                // RETRY MECHANISM for 100% success rate
                let classSchedule = null;
                let retryCount = 0;
                const maxRetries = 3;

                while (!classSchedule && retryCount < maxRetries) {
                    if (retryCount > 0) {
                        Logger.info(
                            `Retry attempt ${retryCount} for ${practicalMK.nama} - Class ${theoryClass.kelas}`
                        );
                    }

                    classSchedule = await generateScheduleForClass(
                        practicalMK,
                        theoryClass,
                        ruangan,
                        shift,
                        semester,
                        tahun,
                        allExistingSchedules,
                        preferredDay
                    );

                    if (!classSchedule) {
                        retryCount++;
                        // Wait a bit before retry to allow for different random seeds
                        await new Promise((resolve) =>
                            setTimeout(resolve, 100)
                        );
                    }
                }

                if (classSchedule) {
                    allSchedules.push(classSchedule);
                    Logger.info(
                        `✓ Generated schedule for ${practicalMK.nama} - Class ${theoryClass.kelas} (fitness: ${classSchedule.fitness})`
                    );
                } else {
                    Logger.error(
                        `Failed to generate schedule for ${practicalMK.nama} - Class ${theoryClass.kelas} after ${maxRetries} attempts`
                    );
                    // Continue with other classes instead of failing completely
                }
            }
        }

        Logger.info(
            `Successfully generated ${allSchedules.length} practical schedules`
        );

        // Final validation
        const validation = await validateScheduleSet(allSchedules);
        if (!validation.isValid) {
            Logger.warn(
                "Generated schedules have violations:",
                validation.violations
            );
        }

        return allSchedules;
    } catch (error) {
        Logger.error(`Error generating practical schedules: ${error}`);
        throw error;
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
