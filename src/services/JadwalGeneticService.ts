import { prisma } from "$utils/prisma.utils";
import { ulid } from "ulid";

interface Schedule {
    id: string;
    matakuliahId: string;
    ruanganId: string;
    shiftId: string;
    dosenId: string;
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
    populationSize: 50, // Default generations
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
 * @returns Promise<{matakuliah: any[], ruangan: any[], shift: any[], dosen: any[]}> Object containing arrays of matakuliah, ruangan, shift, and dosen
 */
async function getInitialData() {
    const [matakuliah, ruangan, shift, dosen] = await Promise.all([
        prisma.matakuliah.findMany(),
        prisma.ruanganLaboratorium.findMany(),
        prisma.shift.findMany({ where: { isActive: true } }),
        prisma.dosen.findMany(),
    ]);

    return { matakuliah, ruangan, shift, dosen };
}

/**
 * Creates a random schedule with random assignments for matakuliah, ruangan, shift, and dosen
 * @param matakuliah - Array of available matakuliah
 * @param ruangan - Array of available ruangan
 * @param shift - Array of available shifts
 * @param dosen - Array of available dosen
 * @returns Schedule A randomly generated schedule
 */
function createRandomSchedule(matakuliah: any[], ruangan: any[], shift: any[], dosen: any[]): Schedule {
    const randomMatakuliah = matakuliah[Math.floor(Math.random() * matakuliah.length)];
    const randomRuangan = ruangan[Math.floor(Math.random() * ruangan.length)];
    const randomShift = shift[Math.floor(Math.random() * shift.length)];
    const randomDosen = dosen[Math.floor(Math.random() * dosen.length)];

    return {
        id: ulid(),
        matakuliahId: randomMatakuliah.id,
        ruanganId: randomRuangan.id,
        shiftId: randomShift.id,
        dosenId: randomDosen.id,
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

        // Check for room conflicts
        if (schedule.ruanganId === otherSchedule.ruanganId && schedule.shiftId === otherSchedule.shiftId) {
            fitness -= 20;
        }

        // Check for dosen conflicts
        if (schedule.dosenId === otherSchedule.dosenId && schedule.shiftId === otherSchedule.shiftId) {
            fitness -= 20;
        }

        // Check for matakuliah conflicts
        if (schedule.matakuliahId === otherSchedule.matakuliahId && schedule.shiftId === otherSchedule.shiftId) {
            fitness -= 20;
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
    return {
        id: ulid(),
        matakuliahId: Math.random() < 0.5 ? parent1.matakuliahId : parent2.matakuliahId,
        ruanganId: Math.random() < 0.5 ? parent1.ruanganId : parent2.ruanganId,
        shiftId: Math.random() < 0.5 ? parent1.shiftId : parent2.shiftId,
        dosenId: Math.random() < 0.5 ? parent1.dosenId : parent2.dosenId,
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
 * @param mutationRate - Probability of mutation occurring
 * @returns Schedule The potentially mutated schedule
 */
function mutate(
    schedule: Schedule,
    matakuliah: any[],
    ruangan: any[],
    shift: any[],
    dosen: any[],
    mutationRate: number
): Schedule {
    if (Math.random() < mutationRate) {
        const mutatedSchedule = { ...schedule };
        const mutationType = Math.floor(Math.random() * 4);

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

    const { matakuliah, ruangan, shift, dosen } = await getInitialData();
    let population: Schedule[] = [];

    // Initialize population with size equal to matakuliah count
    for (let i = 0; i < matakuliahCount; i++) {
        population.push(createRandomSchedule(matakuliah, ruangan, shift, dosen));
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
            child = mutate(child, matakuliah, ruangan, shift, dosen, config.mutationRate);
            newPopulation.push(child);
        }

        population = newPopulation;
    }

    // Sort final population by fitness
    population.sort((a, b) => b.fitness - a.fitness);

    return population;
}

export const jadwalGeneticService = {
    generateSchedule,
};
