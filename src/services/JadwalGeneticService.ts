import { prisma } from "$utils/prisma.utils";
import { isGanjilSemester, getCurrentAcademicYear } from "$utils/strings.utils";
import { SEMESTER, BIDANG_MINAT } from "@prisma/client";
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
    kelas?: string; // Class name (A, B, C, D)
    fitness: number;
}

interface ClassGroup {
    kelas: string;
    mahasiswa: any[];
}

interface GeneticAlgorithmConfig {
    populationSize: number;
    generations: number;
    mutationRate: number;
    eliteSize: number;
}

const DEFAULT_CONFIG: GeneticAlgorithmConfig = {
    populationSize: 50,
    generations: 100,
    mutationRate: 0.15,
    eliteSize: 15,
};

/**
 * Divides students into classes with maximum 4 classes (A, B, C, D)
 * @param students - Array of students to divide
 * @param maxStudentsPerClass - Maximum students per class (50 for theory, 25 for practical)
 * @returns Array of student groups with class names (max 4 classes)
 */
function divideStudentsIntoClasses(
    students: any[],
    maxStudentsPerClass: number
): ClassGroup[] {
    const maxClasses = 4; // Limit to 4 classes (A, B, C, D)
    const classes: ClassGroup[] = [];
    const classNames = ["A", "B", "C", "D"]; // Support up to 4 classes

    // If we have very few students, just create one class
    if (students.length <= maxStudentsPerClass) {
        return [
            {
                kelas: "A",
                mahasiswa: students,
            },
        ];
    }

    // Calculate how many classes we need
    const requiredClasses = Math.min(
        Math.ceil(students.length / maxStudentsPerClass),
        maxClasses
    );

    if (students.length <= maxStudentsPerClass * maxClasses) {
        // Distribute students evenly across required classes
        const studentsPerClass = Math.ceil(students.length / requiredClasses);

        for (let i = 0; i < requiredClasses; i++) {
            const startIndex = i * studentsPerClass;
            const endIndex = Math.min(
                startIndex + studentsPerClass,
                students.length
            );
            const studentsInClass = students.slice(startIndex, endIndex);

            if (studentsInClass.length > 0) {
                classes.push({
                    kelas: classNames[i],
                    mahasiswa: studentsInClass,
                });
            }
        }
    } else {
        // If we have more students than 4 classes can handle, limit to first students
        const maxTotalStudents = maxStudentsPerClass * maxClasses;
        console.log(
            `⚠️  Course has ${students.length} eligible students, limiting to first ${maxTotalStudents} students (${maxClasses} classes)`
        );

        for (let i = 0; i < maxClasses; i++) {
            const startIndex = i * maxStudentsPerClass;
            const endIndex = startIndex + maxStudentsPerClass;
            const studentsInClass = students.slice(startIndex, endIndex);

            if (studentsInClass.length > 0) {
                classes.push({
                    kelas: classNames[i],
                    mahasiswa: studentsInClass,
                });
            }
        }
    }

    return classes;
}

/**
 * Checks if a student can enroll in a course based on semester rules
 * @param studentSemester - Current semester of the student
 * @param courseSemester - Required semester for the course
 * @returns boolean - True if student can take the course
 */
function canStudentTakeCourse(
    studentSemester: number,
    courseSemester: number
): boolean {
    // Rule 1: Students in semester 1 cannot take courses from higher semesters
    if (studentSemester === 1 && courseSemester > 1) {
        return false;
    }

    // Rule 2: Students in odd semesters (3, 5, 7) can take courses from semester 1 and their own semester + 4
    // Students in even semesters (2, 4, 6, 8) can take courses from semester 2 and their own semester + 4
    if (studentSemester >= 3) {
        const isStudentOddSemester = studentSemester % 2 === 1;
        // const isCourseOddSemester = courseSemester % 2 === 1;

        // Can take courses from semester 1 (for odd semester students) or semester 2 (for even semester students)
        if (
            (isStudentOddSemester && courseSemester === 1) ||
            (!isStudentOddSemester && courseSemester === 2)
        ) {
            return true;
        }

        // Can take courses from their current semester
        if (courseSemester === studentSemester) {
            return true;
        }

        // Can take courses from their semester + 4 (if exists and within bounds)
        if (courseSemester === studentSemester + 4 && courseSemester <= 8) {
            return true;
        }

        return false;
    }

    // For semester 2 students, they can take semester 1 and 2 courses
    if (studentSemester === 2) {
        return courseSemester <= 2;
    }

    return true;
}

/**
 * Checks if a lecturer can teach a course based on field of interest
 * @param dosenBidangMinat - Lecturer's field of interest
 * @param matakuliahBidangMinat - Course's field of interest
 * @returns boolean - True if lecturer can teach the course
 */
function canDosenTeachCourse(
    dosenBidangMinat: BIDANG_MINAT,
    matakuliahBidangMinat: BIDANG_MINAT
): boolean {
    // Rule 3: UMUM courses can be taught by any lecturer
    if (matakuliahBidangMinat === BIDANG_MINAT.UMUM) {
        return true;
    }

    // Rule 3: Lecturers can only teach courses that match their field of interest
    return dosenBidangMinat === matakuliahBidangMinat;
}

/**
 * Gets the total count of matakuliah from the database
 * @returns Promise<number> The total number of matakuliah records
 */
async function getMatakuliahCount(): Promise<number> {
    return prisma.matakuliah.count();
}

/**
 * Retrieves initial data needed for schedule generation
 * @returns Promise<{matakuliah: any[], ruangan: any[], shift: any[], dosen: any[], mahasiswa: any[]}>
 */
async function getInitialData() {
    const [matakuliah, ruangan, shift, dosen, mahasiswa] = await Promise.all([
        prisma.matakuliah.findMany({
            include: {
                dosenPengampuMK: {
                    include: {
                        dosen: true,
                    },
                },
            },
        }),
        prisma.ruanganLaboratorium.findMany({
            where: { isActive: true },
        }),
        prisma.shift.findMany({
            where: { isActive: true },
        }),
        prisma.dosen.findMany(),
        prisma.mahasiswa.findMany({
            where: { isActive: true },
        }),
    ]);

    return { matakuliah, ruangan, shift, dosen, mahasiswa };
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
    const semester = isGanjilSemester() ? SEMESTER.GENAP : SEMESTER.GANJIL;

    // Get the academic year
    const year = now.getFullYear();
    const nextYear = year + 1;
    const tahun = month >= 7 ? `${year}/${nextYear}` : `${year - 1}/${year}`;

    return { semester, tahun };
}

/**
 * Selects a valid dosen for a matakuliah based on field of interest rules
 * @param matakuliah - The course to assign a lecturer to
 * @param allDosen - Array of all available lecturers
 * @returns any - A valid lecturer or null if none found
 */
function selectValidDosenForMatakuliah(
    matakuliah: any,
    allDosen: any[]
): any | null {
    // First, check if there are assigned lecturers through DosenPengampuMK
    if (matakuliah.dosenPengampuMK && matakuliah.dosenPengampuMK.length > 0) {
        const assignedDosen = matakuliah.dosenPengampuMK
            .map((dpm: any) => dpm.dosen)
            .filter(Boolean);
        if (assignedDosen.length > 0) {
            // Return a random assigned lecturer
            return assignedDosen[
                Math.floor(Math.random() * assignedDosen.length)
            ];
        }
    }

    // If no assigned lecturers, find valid lecturers based on field of interest
    const validDosen = allDosen.filter((dosen) =>
        canDosenTeachCourse(dosen.bidangMinat, matakuliah.bidangMinat)
    );

    if (validDosen.length === 0) {
        return null;
    }

    return validDosen[Math.floor(Math.random() * validDosen.length)];
}

/**
 * Selects valid mahasiswa for a matakuliah based on semester rules
 * @param matakuliah - The course to assign students to
 * @param allMahasiswa - Array of all available students
 * @param maxStudents - Maximum number of students to assign (default: 25 for PRAKTIKUM, 50 for others)
 * @returns any[] - Array of valid students
 */
function selectValidMahasiswaForMatakuliah(
    matakuliah: any,
    allMahasiswa: any[],
    maxStudents?: number
): any[] {
    const validMahasiswa = allMahasiswa.filter((mahasiswa) =>
        canStudentTakeCourse(mahasiswa.semester, matakuliah.semester)
    );

    if (validMahasiswa.length === 0) {
        return [];
    }

    // Determine max students based on course type
    let maxStudentsForCourse = maxStudents;
    if (!maxStudentsForCourse) {
        const isPraktikum = matakuliah.nama.toUpperCase().includes("PRAKTIKUM");
        maxStudentsForCourse = isPraktikum ? 25 : 50;
    }

    // Randomly select students up to the maximum
    const shuffled = [...validMahasiswa].sort(() => 0.5 - Math.random());
    const selectedCount = Math.min(maxStudentsForCourse, shuffled.length);

    return shuffled.slice(0, selectedCount);
}

/**
 * Automatically assign students for theory courses with class division
 */
async function assignStudentsForTheoryCourse(
    matakuliahId: string,
    allMahasiswa: any[]
): Promise<ClassGroup[]> {
    try {
        // Get course details
        const matakuliah = await prisma.matakuliah.findUnique({
            where: { id: matakuliahId },
        });

        if (!matakuliah) return [];

        // Filter students based on semester eligibility
        const eligibleStudents = allMahasiswa.filter((mahasiswa) =>
            canStudentTakeCourse(mahasiswa.semester, matakuliah.semester)
        );

        // For theory courses, max 50 students per class
        const maxStudentsPerClass = 50;
        const shuffled = eligibleStudents.sort(() => 0.5 - Math.random());

        // Divide students into classes
        const classes = divideStudentsIntoClasses(
            shuffled,
            maxStudentsPerClass
        );

        Logger.info(
            `Auto-assigned ${shuffled.length} students to theory course: ${matakuliah.nama} (${classes.length} classes)`
        );

        return classes;
    } catch (error) {
        Logger.error(`Error assigning students for theory course: ${error}`);
        return [];
    }
}

/**
 * Automatically assign students and dosen for practical courses from corresponding theory course with class division
 */
async function assignStudentsAndDosenForPracticalCourse(
    matakuliahId: string
): Promise<{ classes: ClassGroup[]; dosenIds: string[] }> {
    try {
        // Get practical course details
        const praktikumMatakuliah = await prisma.matakuliah.findUnique({
            where: { id: matakuliahId },
        });

        if (!praktikumMatakuliah) return { classes: [], dosenIds: [] };

        // Find corresponding theory course by removing "PRAKTIKUM" from name
        const theoryCourseName = praktikumMatakuliah.nama
            .replace(/\s*PRAKTIKUM\s*/i, "")
            .trim();

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
            return { classes: [], dosenIds: [] };
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
            return { classes: [], dosenIds: [] };
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

        // Divide students into classes
        const classes = divideStudentsIntoClasses(
            shuffled,
            maxStudentsPerClass
        );

        // Collect all dosen from theory course schedules
        const theoryDosen = theoryJadwal.flatMap((jadwal) => jadwal.dosen);

        // Remove duplicates based on dosen ID
        const uniqueDosen = theoryDosen.filter(
            (dosen, index, self) =>
                index === self.findIndex((d) => d.id === dosen.id)
        );

        Logger.info(
            `Auto-assigned ${shuffled.length} students and ${uniqueDosen.length} dosen from theory course "${theoryMatakuliah.nama}" to practical course: ${praktikumMatakuliah.nama} (${classes.length} classes)`
        );

        return {
            classes,
            dosenIds: uniqueDosen.map((d) => d.id),
        };
    } catch (error) {
        Logger.error(
            `Error assigning students and dosen for practical course: ${error}`
        );
        return { classes: [], dosenIds: [] };
    }
}

/**
 * Creates a random schedule with enhanced validation for rules and automatic assignment
 * @param matakuliah - Array of available matakuliah
 * @param ruangan - Array of available ruangan
 * @param shift - Array of available shifts
 * @param dosen - Array of available dosen
 * @param mahasiswa - Array of available mahasiswa
 * @returns Promise<Schedule> A randomly generated schedule (single class for genetic algorithm)
 */
async function createRandomSchedule(
    matakuliah: any[],
    ruangan: any[],
    shift: any[],
    dosen: any[],
    mahasiswa: any[]
): Promise<Schedule> {
    const randomMatakuliah =
        matakuliah[Math.floor(Math.random() * matakuliah.length)];
    const randomRuangan = ruangan[Math.floor(Math.random() * ruangan.length)];
    const randomShift = shift[Math.floor(Math.random() * shift.length)];
    const randomHari = HARI_LIST[Math.floor(Math.random() * HARI_LIST.length)];

    // Determine course type and automatically assign students and dosen
    const isTheoryCourse = randomMatakuliah.isTeori === true;
    const isPracticalCourse =
        randomMatakuliah.isTeori === false ||
        randomMatakuliah.nama.toUpperCase().includes("PRAKTIKUM");

    let assignedDosenIds: string[] = [];
    let assignedClasses: ClassGroup[] = [];

    if (isTheoryCourse) {
        // For theory courses: use compatible dosen + auto-assign students
        const validDosen = selectValidDosenForMatakuliah(
            randomMatakuliah,
            dosen
        );
        if (!validDosen) {
            throw new Error(
                `No valid dosen found for matakuliah ${randomMatakuliah.nama} with bidang minat ${randomMatakuliah.bidangMinat}`
            );
        }
        assignedDosenIds = [validDosen.id];
        assignedClasses = await assignStudentsForTheoryCourse(
            randomMatakuliah.id,
            mahasiswa
        );
    } else if (isPracticalCourse) {
        // For practical courses: auto-assign from theory course
        const practicalAssignment =
            await assignStudentsAndDosenForPracticalCourse(randomMatakuliah.id);
        assignedDosenIds = practicalAssignment.dosenIds;
        assignedClasses = practicalAssignment.classes;

        // Fallback to compatible dosen if no theory course found
        if (assignedDosenIds.length === 0) {
            const validDosen = selectValidDosenForMatakuliah(
                randomMatakuliah,
                dosen
            );
            if (validDosen) {
                assignedDosenIds = [validDosen.id];
                Logger.warn(
                    `Using fallback dosen assignment for practical course: ${randomMatakuliah.nama}`
                );
            }
        }
    } else {
        // Fallback: treat as theory course
        const validDosen = selectValidDosenForMatakuliah(
            randomMatakuliah,
            dosen
        );
        if (!validDosen) {
            throw new Error(
                `No valid dosen found for matakuliah ${randomMatakuliah.nama} with bidang minat ${randomMatakuliah.bidangMinat}`
            );
        }
        assignedDosenIds = [validDosen.id];
        assignedClasses = await assignStudentsForTheoryCourse(
            randomMatakuliah.id,
            mahasiswa
        );
    }

    if (assignedDosenIds.length === 0) {
        throw new Error(
            `No dosen assigned for matakuliah ${randomMatakuliah.nama}`
        );
    }

    const { semester, tahun } = getCurrentSemesterAndYear();

    // For genetic algorithm, pick one random class to create a single schedule
    // Multiple schedules for the same matakuliah will be handled by generateAllSchedulesForMatakuliah
    const randomClass =
        assignedClasses.length > 0
            ? assignedClasses[
                  Math.floor(Math.random() * assignedClasses.length)
              ]
            : { kelas: "A", mahasiswa: [] };

    return {
        id: ulid(),
        matakuliahId: randomMatakuliah.id,
        ruanganId: randomRuangan.id,
        shiftId: randomShift.id,
        dosenIds: assignedDosenIds,
        hari: randomHari,
        semester,
        tahun,
        mahasiswaIds: randomClass.mahasiswa.map((m) => m.id),
        asistenLabIds: [], // Can be populated later if needed
        kelas: randomClass.kelas,
        fitness: 0,
    };
}

/**
 * Enhanced fitness calculation with additional rule validation
 * @param schedule - The schedule to evaluate
 * @param allSchedules - Array of all schedules to check for conflicts
 * @param matakuliah - Array of matakuliah for rule validation
 * @param dosen - Array of dosen for rule validation
 * @param mahasiswa - Array of mahasiswa for rule validation
 * @returns number The fitness score (0-100)
 */
function calculateFitness(
    schedule: Schedule,
    allSchedules: Schedule[],
    matakuliah: any[],
    dosen: any[],
    mahasiswa: any[]
): number {
    let fitness = 100; // Start with perfect score

    // Find the entities for this schedule
    const currentMatakuliah = matakuliah.find(
        (mk) => mk.id === schedule.matakuliahId
    );
    const currentDosen = dosen.filter((d) => schedule.dosenIds.includes(d.id));
    const currentMahasiswa = mahasiswa.filter((m) =>
        schedule.mahasiswaIds.includes(m.id)
    );

    // Rule validation penalties
    if (currentMatakuliah && currentDosen.length > 0) {
        // Check dosen-matakuliah compatibility for all assigned dosen
        for (const dosenItem of currentDosen) {
            if (
                !canDosenTeachCourse(
                    dosenItem.bidangMinat,
                    currentMatakuliah.bidangMinat
                )
            ) {
                fitness -= 25; // Penalty for each incompatible dosen
            }
        }
    }

    if (currentMatakuliah && currentMahasiswa.length > 0) {
        // Check mahasiswa-matakuliah compatibility for all assigned mahasiswa
        for (const mahasiswaItem of currentMahasiswa) {
            if (
                !canStudentTakeCourse(
                    mahasiswaItem.semester,
                    currentMatakuliah.semester
                )
            ) {
                fitness -= 2; // Small penalty per incompatible student
            }
        }
    }

    // Check for conflicts with other schedules
    for (const otherSchedule of allSchedules) {
        if (schedule.id === otherSchedule.id) continue;

        // Room conflicts on the same day and shift
        if (
            schedule.ruanganId === otherSchedule.ruanganId &&
            schedule.shiftId === otherSchedule.shiftId &&
            schedule.hari === otherSchedule.hari
        ) {
            fitness -= 25;
        }

        // Dosen conflicts on the same day and shift
        const dosenOverlap = schedule.dosenIds.some(
            (dosenId) =>
                otherSchedule.dosenIds.includes(dosenId) &&
                schedule.shiftId === otherSchedule.shiftId &&
                schedule.hari === otherSchedule.hari
        );
        if (dosenOverlap) {
            fitness -= 25;
        }

        // Mahasiswa conflicts on the same day and shift
        const mahasiswaOverlap = schedule.mahasiswaIds.some(
            (mahasiswaId) =>
                otherSchedule.mahasiswaIds.includes(mahasiswaId) &&
                schedule.shiftId === otherSchedule.shiftId &&
                schedule.hari === otherSchedule.hari
        );
        if (mahasiswaOverlap) {
            fitness -= 20;
        }

        // Matakuliah duplicates (same course scheduled multiple times)
        if (schedule.matakuliahId === otherSchedule.matakuliahId) {
            fitness -= 30;
        }
    }

    return Math.max(0, fitness);
}

/**
 * Enhanced crossover with rule-aware offspring generation and automatic assignment
 * @param parent1 - First parent schedule
 * @param parent2 - Second parent schedule
 * @param matakuliah - Array of matakuliah for validation
 * @param dosen - Array of dosen for validation
 * @param mahasiswa - Array of mahasiswa for validation
 * @returns Promise<Schedule> New schedule created from the parents (single class for genetic algorithm)
 */
async function crossover(
    parent1: Schedule,
    parent2: Schedule,
    matakuliah: any[],
    dosen: any[],
    mahasiswa: any[]
): Promise<Schedule> {
    const { semester, tahun } = getCurrentSemesterAndYear();

    // Select matakuliah from one of the parents
    const selectedMatakuliahId =
        Math.random() < 0.5 ? parent1.matakuliahId : parent2.matakuliahId;
    const selectedMatakuliah = matakuliah.find(
        (mk) => mk.id === selectedMatakuliahId
    );

    if (!selectedMatakuliah) {
        throw new Error(`Matakuliah not found: ${selectedMatakuliahId}`);
    }

    // Determine course type and automatically assign students and dosen
    const isTheoryCourse = selectedMatakuliah.isTeori === true;
    const isPracticalCourse =
        selectedMatakuliah.isTeori === false ||
        selectedMatakuliah.nama.toUpperCase().includes("PRAKTIKUM");

    let assignedDosenIds: string[] = [];
    let assignedClasses: ClassGroup[] = [];

    if (isTheoryCourse) {
        // For theory courses: use compatible dosen + auto-assign students
        const validDosen = selectValidDosenForMatakuliah(
            selectedMatakuliah,
            dosen
        );
        if (!validDosen) {
            throw new Error(
                `No valid dosen found for matakuliah ${selectedMatakuliah.nama}`
            );
        }
        assignedDosenIds = [validDosen.id];
        assignedClasses = await assignStudentsForTheoryCourse(
            selectedMatakuliah.id,
            mahasiswa
        );
    } else if (isPracticalCourse) {
        // For practical courses: auto-assign from theory course
        const practicalAssignment =
            await assignStudentsAndDosenForPracticalCourse(
                selectedMatakuliah.id
            );
        assignedDosenIds = practicalAssignment.dosenIds;
        assignedClasses = practicalAssignment.classes;

        // Fallback to compatible dosen if no theory course found
        if (assignedDosenIds.length === 0) {
            const validDosen = selectValidDosenForMatakuliah(
                selectedMatakuliah,
                dosen
            );
            if (validDosen) {
                assignedDosenIds = [validDosen.id];
            }
        }
    } else {
        // Fallback: treat as theory course
        const validDosen = selectValidDosenForMatakuliah(
            selectedMatakuliah,
            dosen
        );
        if (!validDosen) {
            throw new Error(
                `No valid dosen found for matakuliah ${selectedMatakuliah.nama}`
            );
        }
        assignedDosenIds = [validDosen.id];
        assignedClasses = await assignStudentsForTheoryCourse(
            selectedMatakuliah.id,
            mahasiswa
        );
    }

    if (assignedDosenIds.length === 0) {
        throw new Error(
            `No dosen assigned for matakuliah ${selectedMatakuliah.nama}`
        );
    }

    // For genetic algorithm, pick one random class to create a single schedule
    const randomClass =
        assignedClasses.length > 0
            ? assignedClasses[
                  Math.floor(Math.random() * assignedClasses.length)
              ]
            : { kelas: "A", mahasiswa: [] };

    return {
        id: ulid(),
        matakuliahId: selectedMatakuliahId,
        ruanganId: Math.random() < 0.5 ? parent1.ruanganId : parent2.ruanganId,
        shiftId: Math.random() < 0.5 ? parent1.shiftId : parent2.shiftId,
        dosenIds: assignedDosenIds,
        hari: Math.random() < 0.5 ? parent1.hari : parent2.hari,
        semester,
        tahun,
        mahasiswaIds: randomClass.mahasiswa.map((m) => m.id),
        asistenLabIds: [],
        kelas: randomClass.kelas,
        fitness: 0,
    };
}

/**
 * Enhanced mutation with rule-aware changes
 * @param schedule - The schedule to mutate
 * @param matakuliah - Array of available matakuliah
 * @param ruangan - Array of available ruangan
 * @param shift - Array of available shifts
 * @param dosen - Array of available dosen
 * @param mahasiswa - Array of available mahasiswa
 * @param mutationRate - Probability of mutation occurring
 * @returns Schedule The potentially mutated schedule
 */
function mutate(
    schedule: Schedule,
    matakuliah: any[],
    ruangan: any[],
    shift: any[],
    dosen: any[],
    mahasiswa: any[],
    mutationRate: number
): Schedule {
    if (Math.random() < mutationRate) {
        const mutatedSchedule = { ...schedule };
        const mutationType = Math.floor(Math.random() * 6); // 6 mutation types

        switch (mutationType) {
            case 0:
                // Mutate matakuliah - this will require updating dosen and mahasiswa accordingly
                const newMatakuliah =
                    matakuliah[Math.floor(Math.random() * matakuliah.length)];
                mutatedSchedule.matakuliahId = newMatakuliah.id;

                // Update dosen to be compatible with new matakuliah
                const validDosen = selectValidDosenForMatakuliah(
                    newMatakuliah,
                    dosen
                );
                if (validDosen) {
                    mutatedSchedule.dosenIds = [validDosen.id];
                }

                // Update mahasiswa to be compatible with new matakuliah
                const validMahasiswa = selectValidMahasiswaForMatakuliah(
                    newMatakuliah,
                    mahasiswa
                );
                mutatedSchedule.mahasiswaIds = validMahasiswa.map((m) => m.id);
                break;
            case 1:
                mutatedSchedule.ruanganId =
                    ruangan[Math.floor(Math.random() * ruangan.length)].id;
                break;
            case 2:
                mutatedSchedule.shiftId =
                    shift[Math.floor(Math.random() * shift.length)].id;
                break;
            case 3:
                // Mutate dosen - ensure compatibility with current matakuliah
                const currentMatakuliah = matakuliah.find(
                    (mk) => mk.id === mutatedSchedule.matakuliahId
                );
                if (currentMatakuliah) {
                    const validDosen = selectValidDosenForMatakuliah(
                        currentMatakuliah,
                        dosen
                    );
                    if (validDosen) {
                        mutatedSchedule.dosenIds = [validDosen.id];
                    }
                }
                break;
            case 4:
                mutatedSchedule.hari =
                    HARI_LIST[Math.floor(Math.random() * HARI_LIST.length)];
                break;
            case 5:
                // Mutate mahasiswa - ensure compatibility with current matakuliah
                const currentMK = matakuliah.find(
                    (mk) => mk.id === mutatedSchedule.matakuliahId
                );
                if (currentMK) {
                    const validMahasiswa = selectValidMahasiswaForMatakuliah(
                        currentMK,
                        mahasiswa
                    );
                    mutatedSchedule.mahasiswaIds = validMahasiswa.map(
                        (m) => m.id
                    );
                }
                break;
        }

        return mutatedSchedule;
    }
    return schedule;
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
            dosen: {
                select: { id: true },
            },
            asisten: {
                select: { id: true },
            },
            mahasiswa: {
                select: { id: true },
            },
        },
    });
}

/**
 * Enhanced conflict detection with rule validation
 * @param schedule - The proposed schedule
 * @param existingSchedules - Array of existing schedules
 * @param matakuliah - Array of matakuliah for rule validation
 * @param dosen - Array of dosen for rule validation
 * @param mahasiswa - Array of mahasiswa for rule validation
 * @returns boolean - True if there are conflicts, false otherwise
 */
function hasScheduleConflicts(
    schedule: Schedule,
    existingSchedules: any[],
    matakuliah?: any[],
    dosen?: any[],
    mahasiswa?: any[]
): boolean {
    // Basic scheduling conflicts
    // Check for room-shift-day conflict (same room at same time on same day)
    const roomConflict = existingSchedules.some(
        (existing) =>
            existing.ruanganId === schedule.ruanganId &&
            existing.shiftId === schedule.shiftId &&
            existing.hari === schedule.hari
    );

    // Check if this matakuliah already has a schedule
    const matakuliahConflict = existingSchedules.some(
        (existing) => existing.matakuliahId === schedule.matakuliahId
    );

    // Check for dosen-shift-day conflict (same dosen at same time on same day)
    const dosenConflict = existingSchedules.some((existing) =>
        schedule.dosenIds.some(
            (dosenId) =>
                existing.dosenId === dosenId &&
                existing.shiftId === schedule.shiftId &&
                existing.hari === schedule.hari
        )
    );

    // Mahasiswa conflicts on the same day and shift
    const mahasiswaConflict = existingSchedules.some((existing) =>
        schedule.mahasiswaIds.some(
            (mahasiswaId) =>
                existing.mahasiswaId === mahasiswaId &&
                existing.shiftId === schedule.shiftId &&
                existing.hari === schedule.hari
        )
    );

    // Rule validation conflicts (if data is provided)
    let ruleViolation = false;

    if (matakuliah && dosen && mahasiswa) {
        const currentMatakuliah = matakuliah.find(
            (mk) => mk.id === schedule.matakuliahId
        );

        // Check dosen-matakuliah compatibility
        if (currentMatakuliah && dosen) {
            for (const dosenId of schedule.dosenIds) {
                const currentDosen = dosen.find((d) => d.id === dosenId);
                if (
                    currentDosen &&
                    !canDosenTeachCourse(
                        currentDosen.bidangMinat,
                        currentMatakuliah.bidangMinat
                    )
                ) {
                    ruleViolation = true;
                    break;
                }
            }
        }

        // Check mahasiswa-matakuliah compatibility
        if (currentMatakuliah && mahasiswa) {
            for (const mahasiswaId of schedule.mahasiswaIds) {
                const currentMahasiswa = mahasiswa.find(
                    (m) => m.id === mahasiswaId
                );
                if (
                    currentMahasiswa &&
                    !canStudentTakeCourse(
                        currentMahasiswa.semester,
                        currentMatakuliah.semester
                    )
                ) {
                    ruleViolation = true;
                    break;
                }
            }
        }
    }

    return (
        roomConflict ||
        matakuliahConflict ||
        dosenConflict ||
        !!mahasiswaConflict ||
        ruleViolation
    );
}

/**
 * Generate meeting dates for a schedule based on semester start and end dates
 * @param schedule - The schedule to generate meeting dates for
 * @param numberOfMeetings - Number of meetings to generate (default: 12, maximum: 12)
 * @returns Array of meeting dates as strings in YYYY-MM-DD format
 */
async function generateMeetingDates(
    jadwalId: string,
    numberOfMeetings: number = 12
): Promise<string[]> {
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

    // Debug logging
    Logger.info(
        `Generating meetings for jadwal ${jadwalId}: hari=${jadwal.hari}, semester=${jadwal.semester}, tahun=${jadwal.tahun}`
    );

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

    Logger.info(`Semester start date: ${semesterStartDate.toISOString()}`);

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
    Logger.info(`Target day: ${jadwal.hari} -> day number: ${targetDayNumber}`);

    let currentDate = new Date(semesterStartDate);

    // Adjust to first occurrence of the target day
    while (currentDate.getDay() !== targetDayNumber) {
        currentDate.setDate(currentDate.getDate() + 1);
    }

    Logger.info(
        `First meeting date: ${currentDate.toISOString()} (day of week: ${currentDate.getDay()})`
    );

    // Generate meeting dates (one week apart) as strings in YYYY-MM-DD format
    const meetingDates: string[] = [];
    for (let i = 0; i < numberOfMeetings; i++) {
        const dateStr = currentDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD
        meetingDates.push(dateStr);
        currentDate.setDate(currentDate.getDate() + 7); // Next week
    }

    Logger.info(
        `Generated ${meetingDates.length} meeting dates: ${meetingDates.join(
            ", "
        )}`
    );

    return meetingDates;
}

/**
 * Save a generated schedule to the database
 * @param schedule - The schedule to save
 * @returns Promise<any> The saved schedule record
 */
async function saveSchedule(schedule: Schedule): Promise<any> {
    // Extract just the fields needed for saving to the database
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

    // Create the jadwal record
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

/**
 * Creates a deterministic schedule for a specific matakuliah with automatic assignment
 * @param matakuliah - The specific matakuliah to schedule
 * @param ruangan - Array of available ruangan
 * @param shift - Array of available shifts
 * @param dosen - Array of available dosen
 * @param mahasiswa - Array of available mahasiswa
 * @param preferredDay - Optional preferred day
 * @returns Promise<Schedule> A schedule for the specific matakuliah
 */
async function createScheduleForMatakuliah(
    matakuliah: any,
    ruangan: any[],
    shift: any[],
    dosen: any[],
    mahasiswa: any[],
    preferredDay?: HARI
): Promise<Schedule> {
    const randomRuangan = ruangan[Math.floor(Math.random() * ruangan.length)];
    const randomShift = shift[Math.floor(Math.random() * shift.length)];
    const randomHari =
        preferredDay || HARI_LIST[Math.floor(Math.random() * HARI_LIST.length)];

    // Determine course type and automatically assign students and dosen
    const isTheoryCourse = matakuliah.isTeori === true;
    const isPracticalCourse =
        matakuliah.isTeori === false ||
        matakuliah.nama.toUpperCase().includes("PRAKTIKUM");

    let assignedDosenIds: string[] = [];
    let assignedMahasiswaIds: string[] = [];
    let firstClass: { kelas: string; mahasiswa: any[] } = {
        kelas: "A",
        mahasiswa: [],
    };

    if (isTheoryCourse) {
        // For theory courses: use compatible dosen + auto-assign students
        const validDosen = selectValidDosenForMatakuliah(matakuliah, dosen);
        if (!validDosen) {
            throw new Error(
                `No valid dosen found for matakuliah ${matakuliah.nama} with bidang minat ${matakuliah.bidangMinat}`
            );
        }
        assignedDosenIds = [validDosen.id];
        const classes = await assignStudentsForTheoryCourse(
            matakuliah.id,
            mahasiswa
        );
        // Pick first class for single schedule generation
        firstClass =
            classes.length > 0 ? classes[0] : { kelas: "A", mahasiswa: [] };
        assignedMahasiswaIds = firstClass.mahasiswa.map((m) => m.id);
    } else if (isPracticalCourse) {
        // For practical courses: auto-assign from theory course
        const practicalAssignment =
            await assignStudentsAndDosenForPracticalCourse(matakuliah.id);
        assignedDosenIds = practicalAssignment.dosenIds;
        // Pick first class for single schedule generation
        firstClass =
            practicalAssignment.classes.length > 0
                ? practicalAssignment.classes[0]
                : { kelas: "A", mahasiswa: [] };
        assignedMahasiswaIds = firstClass.mahasiswa.map((m) => m.id);

        // Fallback to compatible dosen if no theory course found
        if (assignedDosenIds.length === 0) {
            const validDosen = selectValidDosenForMatakuliah(matakuliah, dosen);
            if (validDosen) {
                assignedDosenIds = [validDosen.id];
                Logger.warn(
                    `Using fallback dosen assignment for practical course: ${matakuliah.nama}`
                );
            }
        }
    } else {
        // Fallback: treat as theory course
        const validDosen = selectValidDosenForMatakuliah(matakuliah, dosen);
        if (!validDosen) {
            throw new Error(
                `No valid dosen found for matakuliah ${matakuliah.nama} with bidang minat ${matakuliah.bidangMinat}`
            );
        }
        assignedDosenIds = [validDosen.id];
        const classes = await assignStudentsForTheoryCourse(
            matakuliah.id,
            mahasiswa
        );
        // Pick first class for single schedule generation
        firstClass =
            classes.length > 0 ? classes[0] : { kelas: "A", mahasiswa: [] };
        assignedMahasiswaIds = firstClass.mahasiswa.map((m) => m.id);
    }

    if (assignedDosenIds.length === 0) {
        throw new Error(`No dosen assigned for matakuliah ${matakuliah.nama}`);
    }

    const { semester, tahun } = getCurrentSemesterAndYear();

    return {
        id: ulid(),
        matakuliahId: matakuliah.id,
        ruanganId: randomRuangan.id,
        shiftId: randomShift.id,
        dosenIds: assignedDosenIds,
        hari: randomHari,
        semester,
        tahun,
        mahasiswaIds: assignedMahasiswaIds,
        asistenLabIds: [],
        kelas: firstClass.kelas,
        fitness: 0,
    };
}

/**
 * Generates optimized schedule recommendations with enhanced rule validation
 * @param preferredDay - Optional preferred day for scheduling
 * @param maxSchedules - Maximum number of schedules to generate
 * @returns Promise<Schedule[]> Array of optimized schedules with fitness scores
 */
async function generateOptimizedSchedule(
    preferredDay?: HARI,
    maxSchedules: number = 20
): Promise<Schedule[]> {
    try {
        const matakuliahCount = await getMatakuliahCount();
        const config = {
            ...DEFAULT_CONFIG,
            populationSize: Math.max(50, matakuliahCount * 2), // Larger population for better diversity
            generations: 150, // More generations for better optimization
        };

        console.log(`🔄 Config:`, config);

        console.log(
            `🔄 Starting schedule generation for ${matakuliahCount} matakuliah...`
        );

        const { matakuliah, ruangan, shift, dosen, mahasiswa } =
            await getInitialData();
        console.log(`📊 Initial data loaded:`, {
            matakuliah: matakuliah.length,
            ruangan: ruangan.length,
            shift: shift.length,
            dosen: dosen.length,
            mahasiswa: mahasiswa.length,
        });

        const existingSchedules = await getExistingSchedules();
        console.log(`📅 Found ${existingSchedules.length} existing schedules`);

        // Filter out matakuliah that already have schedules
        const availableMatakuliah = matakuliah.filter(
            (mk) =>
                !existingSchedules.some(
                    (existing) => existing.matakuliahId === mk.id
                )
        );
        console.log(
            `✅ Available matakuliah: ${availableMatakuliah.length}/${matakuliah.length}`
        );

        if (availableMatakuliah.length === 0) {
            console.log("❌ No available matakuliah - all already scheduled");
            return [];
        }

        // Pre-validate matakuliah-dosen compatibility with detailed logging
        const validCombinations = [];
        const invalidCombinations = [];

        for (const mk of availableMatakuliah) {
            const validDosen = selectValidDosenForMatakuliah(mk, dosen);
            if (validDosen) {
                validCombinations.push({ matakuliah: mk, dosen: validDosen });
            } else {
                invalidCombinations.push({
                    matakuliah: mk.nama,
                    bidangMinat: mk.bidangMinat,
                    reason: "No compatible dosen found",
                });
            }
        }

        console.log(`🔍 Validation results:`, {
            valid: validCombinations.length,
            invalid: invalidCombinations.length,
            invalidReasons: invalidCombinations.slice(0, 5), // Show first 5 invalid combinations
        });

        if (validCombinations.length === 0) {
            console.log("❌ No valid matakuliah-dosen combinations found");
            console.log("🔍 Bidang minat analysis:");

            // Analyze bidang minat distribution
            const mkBidangMinat = availableMatakuliah.reduce((acc, mk) => {
                acc[mk.bidangMinat] = (acc[mk.bidangMinat] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const dosenBidangMinat = dosen.reduce((acc, d) => {
                acc[d.bidangMinat] = (acc[d.bidangMinat] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            console.log("Matakuliah bidang minat:", mkBidangMinat);
            console.log("Dosen bidang minat:", dosenBidangMinat);

            throw new Error(
                "No valid matakuliah-dosen combinations found based on bidang minat rules"
            );
        }

        let population: Schedule[] = [];
        const targetPopulationSize = Math.min(
            config.populationSize,
            validCombinations.length * 10
        );
        const maxAttempts = 5000; // Increased from 2000
        let attempts = 0;
        let conflictStats = {
            roomConflict: 0,
            matakuliahConflict: 0,
            dosenConflict: 0,
            mahasiswaConflict: 0,
            ruleViolation: 0,
            validSchedules: 0,
        };

        console.log(
            `🧬 Initializing population (target: ${targetPopulationSize})...`
        );

        // Initialize population with valid rule-compliant schedules
        while (
            population.length < targetPopulationSize &&
            attempts < maxAttempts
        ) {
            attempts++;
            try {
                const schedule = await createRandomSchedule(
                    availableMatakuliah,
                    ruangan,
                    shift,
                    dosen,
                    mahasiswa
                );

                if (preferredDay) {
                    schedule.hari = preferredDay;
                }

                const hasConflicts = hasScheduleConflicts(
                    schedule,
                    existingSchedules,
                    matakuliah,
                    dosen,
                    mahasiswa
                );

                if (!hasConflicts) {
                    population.push(schedule);
                    conflictStats.validSchedules++;
                } else {
                    // Track conflict types for debugging
                    // We could add more detailed conflict analysis here
                }

                // Log progress every 1000 attempts
                if (attempts % 1000 === 0) {
                    console.log(
                        `📈 Progress: ${population.length}/${targetPopulationSize} valid schedules after ${attempts} attempts`
                    );
                }
            } catch (error) {
                // Skip invalid schedules and continue
                continue;
            }
        }

        console.log(`🔄 Population initialization complete:`, {
            populationSize: population.length,
            attempts: attempts,
            conflictStats,
        });

        if (population.length === 0) {
            console.log("❌ Could not generate any valid initial schedules");
            throw new Error(
                "Could not generate any valid schedules with the given constraints"
            );
        }

        // Evolution process with enhanced fitness evaluation
        console.log(
            `🧬 Starting evolution process (${config.generations} generations)...`
        );
        let generationStats = [];

        for (
            let generation = 0;
            generation < config.generations;
            generation++
        ) {
            // Calculate fitness with rule validation
            population = population.map((schedule) => ({
                ...schedule,
                fitness: calculateFitness(
                    schedule,
                    population,
                    matakuliah,
                    dosen,
                    mahasiswa
                ),
            }));

            // Sort by fitness (descending)
            population.sort((a, b) => b.fitness - a.fitness);

            // Track generation statistics
            const avgFitness =
                population.reduce((sum, s) => sum + s.fitness, 0) /
                population.length;
            const bestFitness = population[0].fitness;
            const worstFitness = population[population.length - 1].fitness;

            generationStats.push({
                generation,
                avgFitness: Math.round(avgFitness * 100) / 100,
                bestFitness,
                worstFitness,
                populationSize: population.length,
            });

            // Log progress every 25 generations
            if (
                generation % 25 === 0 ||
                generation === config.generations - 1
            ) {
                console.log(
                    `🧬 Generation ${generation}: avg=${Math.round(
                        avgFitness
                    )}%, best=${bestFitness}%, worst=${worstFitness}%, size=${
                        population.length
                    }`
                );
            }

            // Keep elite schedules
            const newPopulation = population.slice(0, config.eliteSize);

            // Generate new population through crossover and mutation
            let newPopulationAttempts = 0;
            const maxNewPopulationAttempts = 2000; // Increased from 1500

            while (
                newPopulation.length < targetPopulationSize &&
                newPopulationAttempts < maxNewPopulationAttempts
            ) {
                newPopulationAttempts++;

                // Tournament selection for better parent selection
                const parent1 = tournamentSelection(population, 5);
                const parent2 = tournamentSelection(population, 5);

                try {
                    let child = await crossover(
                        parent1,
                        parent2,
                        matakuliah,
                        dosen,
                        mahasiswa
                    );
                    child = mutate(
                        child,
                        availableMatakuliah,
                        ruangan,
                        shift,
                        dosen,
                        mahasiswa,
                        config.mutationRate
                    );

                    if (preferredDay) {
                        child.hari = preferredDay;
                    }

                    if (
                        !hasScheduleConflicts(
                            child,
                            existingSchedules,
                            matakuliah,
                            dosen,
                            mahasiswa
                        )
                    ) {
                        newPopulation.push(child);
                    }
                } catch (error) {
                    // Skip invalid offspring and continue
                    continue;
                }
            }

            population = newPopulation;

            if (population.length === 0) {
                console.log(
                    `❌ Population died out at generation ${generation}`
                );
                break;
            }
        }

        // Final fitness calculation and sorting
        population = population.map((schedule) => ({
            ...schedule,
            fitness: calculateFitness(
                schedule,
                population,
                matakuliah,
                dosen,
                mahasiswa
            ),
        }));

        population.sort((a, b) => b.fitness - a.fitness);

        // Analyze fitness distribution before filtering
        const fitnessDistribution = {
            above90: population.filter((s) => s.fitness >= 90).length,
            above80: population.filter((s) => s.fitness >= 80).length,
            above70: population.filter((s) => s.fitness >= 70).length,
            above60: population.filter((s) => s.fitness >= 60).length,
            above50: population.filter((s) => s.fitness >= 50).length,
            total: population.length,
        };

        console.log(`📊 Final fitness distribution:`, fitnessDistribution);

        // Use adaptive fitness threshold based on what we actually achieved
        let minFitnessThreshold = 70;
        if (fitnessDistribution.above70 === 0) {
            if (fitnessDistribution.above60 > 0) {
                minFitnessThreshold = 60;
                console.log(
                    `⚠️ Lowering threshold to 60% due to low fitness scores`
                );
            } else if (fitnessDistribution.above50 > 0) {
                minFitnessThreshold = 50;
                console.log(
                    `⚠️ Lowering threshold to 50% due to very low fitness scores`
                );
            } else {
                minFitnessThreshold = 0; // Return best available
                console.log(
                    `⚠️ Using all schedules due to extremely low fitness scores`
                );
            }
        }

        const validSchedules = population.filter(
            (schedule) => schedule.fitness >= minFitnessThreshold
        );

        console.log(
            `✅ Generated ${validSchedules.length} valid schedules (threshold: ${minFitnessThreshold}%)`
        );
        console.log(
            `📈 Best fitness scores:`,
            validSchedules.slice(0, 5).map((s) => s.fitness)
        );

        return validSchedules.slice(0, maxSchedules);
    } catch (error) {
        console.error(`❌ Error in generateOptimizedSchedule:`, error);
        throw error;
    }
}

/**
 * Tournament selection for better parent selection in genetic algorithm
 * @param population - The current population
 * @param tournamentSize - Size of the tournament
 * @returns Schedule - Selected parent
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

    // Return the best individual from the tournament
    tournament.sort((a, b) => b.fitness - a.fitness);
    return tournament[0];
}

/**
 * Validates if a complete schedule set meets all business rules
 * @param schedules - Array of schedules to validate
 * @returns {isValid: boolean, violations: string[]} Validation result
 */
async function validateScheduleSet(
    schedules: Schedule[]
): Promise<{ isValid: boolean; violations: string[] }> {
    const violations: string[] = [];
    const { matakuliah, dosen, mahasiswa } = await getInitialData();

    // Check for duplicates and conflicts
    for (let i = 0; i < schedules.length; i++) {
        for (let j = i + 1; j < schedules.length; j++) {
            const schedule1 = schedules[i];
            const schedule2 = schedules[j];

            // Room conflicts
            if (
                schedule1.ruanganId === schedule2.ruanganId &&
                schedule1.shiftId === schedule2.shiftId &&
                schedule1.hari === schedule2.hari
            ) {
                violations.push(
                    `Room conflict between ${schedule1.id} and ${schedule2.id}`
                );
            }

            // Dosen conflicts
            const dosenOverlap = schedule1.dosenIds.some(
                (dosenId) =>
                    schedule2.dosenIds.includes(dosenId) &&
                    schedule1.shiftId === schedule2.shiftId &&
                    schedule1.hari === schedule2.hari
            );
            if (dosenOverlap) {
                violations.push(
                    `Dosen conflict between ${schedule1.id} and ${schedule2.id}`
                );
            }

            // Mahasiswa conflicts
            const mahasiswaOverlap = schedule1.mahasiswaIds.some(
                (mahasiswaId) =>
                    schedule2.mahasiswaIds.includes(mahasiswaId) &&
                    schedule1.shiftId === schedule2.shiftId &&
                    schedule1.hari === schedule2.hari
            );
            if (mahasiswaOverlap) {
                violations.push(
                    `Mahasiswa conflict between ${schedule1.id} and ${schedule2.id}`
                );
            }

            // Matakuliah duplicates
            if (schedule1.matakuliahId === schedule2.matakuliahId) {
                violations.push(
                    `Duplicate matakuliah in schedules ${schedule1.id} and ${schedule2.id}`
                );
            }
        }

        const currentMatakuliah = matakuliah.find(
            (mk) => mk.id === schedules[i].matakuliahId
        );

        if (currentMatakuliah) {
            for (const dosenId of schedules[i].dosenIds) {
                const currentDosen = dosen.find((d) => d.id === dosenId);
                if (
                    currentDosen &&
                    !canDosenTeachCourse(
                        currentDosen.bidangMinat,
                        currentMatakuliah.bidangMinat
                    )
                ) {
                    violations.push(
                        `Dosen ${currentDosen.nama} cannot teach ${currentMatakuliah.nama} (bidang minat mismatch)`
                    );
                }
            }

            for (const mahasiswaId of schedules[i].mahasiswaIds) {
                const currentMahasiswa = mahasiswa.find(
                    (m) => m.id === mahasiswaId
                );
                if (
                    currentMahasiswa &&
                    !canStudentTakeCourse(
                        currentMahasiswa.semester,
                        currentMatakuliah.semester
                    )
                ) {
                    violations.push(
                        `Mahasiswa ${currentMahasiswa.nama} cannot take ${currentMatakuliah.nama} (semester restriction)`
                    );
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
 * Diagnostic function to analyze the current state of data and constraints
 * @returns Promise<any> Detailed analysis of the scheduling constraints
 */
async function diagnoseSchedulingConstraints(): Promise<any> {
    const { matakuliah, ruangan, shift, dosen, mahasiswa } =
        await getInitialData();
    const existingSchedules = await getExistingSchedules();

    // Basic data analysis
    const dataAnalysis = {
        totalMatakuliah: matakuliah.length,
        totalRuangan: ruangan.length,
        totalShift: shift.length,
        totalDosen: dosen.length,
        totalMahasiswa: mahasiswa.length,
        existingSchedules: existingSchedules.length,
    };

    // Available vs occupied analysis
    const availableMatakuliah = matakuliah.filter(
        (mk) =>
            !existingSchedules.some(
                (existing) => existing.matakuliahId === mk.id
            )
    );

    // Bidang minat analysis
    const mkBidangMinat = matakuliah.reduce((acc, mk) => {
        acc[mk.bidangMinat] = (acc[mk.bidangMinat] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const dosenBidangMinat = dosen.reduce((acc, d) => {
        acc[d.bidangMinat] = (acc[d.bidangMinat] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Semester analysis
    const mkSemester = matakuliah.reduce((acc, mk) => {
        acc[mk.semester] = (acc[mk.semester] || 0) + 1;
        return acc;
    }, {} as Record<number, number>);

    const mahasiswaSemester = mahasiswa.reduce((acc, m) => {
        acc[m.semester] = (acc[m.semester] || 0) + 1;
        return acc;
    }, {} as Record<number, number>);

    // Check matakuliah-dosen compatibility
    const compatibilityAnalysis = [];
    let totalCompatible = 0;

    for (const mk of availableMatakuliah) {
        const compatibleDosen = dosen.filter((d) =>
            canDosenTeachCourse(d.bidangMinat, mk.bidangMinat)
        );
        const isCompatible = compatibleDosen.length > 0;

        if (isCompatible) totalCompatible++;

        compatibilityAnalysis.push({
            matakuliah: mk.nama,
            semester: mk.semester,
            bidangMinat: mk.bidangMinat,
            compatibleDosenCount: compatibleDosen.length,
            compatibleDosen: compatibleDosen.map((d) => d.nama),
            isCompatible,
        });
    }

    // Calculate theoretical maximum schedules
    const totalSlots = ruangan.length * shift.length * HARI_LIST.length;
    const occupiedSlots = existingSchedules.length;
    const freeSlots = totalSlots - occupiedSlots;

    // Resource utilization
    const resourceUtilization = {
        totalSlots,
        occupiedSlots,
        freeSlots,
        utilizationRate: Math.round((occupiedSlots / totalSlots) * 100),
        availableForNewSchedules: Math.min(
            freeSlots,
            availableMatakuliah.length
        ),
    };

    return {
        dataAnalysis,
        availableData: {
            availableMatakuliah: availableMatakuliah.length,
            totalMatakuliah: matakuliah.length,
            percentageAvailable: Math.round(
                (availableMatakuliah.length / matakuliah.length) * 100
            ),
        },
        bidangMinatAnalysis: {
            matakuliah: mkBidangMinat,
            dosen: dosenBidangMinat,
        },
        semesterAnalysis: {
            matakuliah: mkSemester,
            mahasiswa: mahasiswaSemester,
        },
        compatibilityAnalysis: {
            totalAvailableMatakuliah: availableMatakuliah.length,
            totalCompatible,
            compatibilityRate: Math.round(
                (totalCompatible / availableMatakuliah.length) * 100
            ),
            incompatibleMatakuliah: compatibilityAnalysis.filter(
                (c) => !c.isCompatible
            ),
            detailedCompatibility: compatibilityAnalysis,
        },
        resourceUtilization,
        recommendations: generateRecommendations(
            availableMatakuliah.length,
            totalCompatible,
            freeSlots,
            resourceUtilization.utilizationRate
        ),
    };
}

/**
 * Generate recommendations based on diagnostic results
 */
function generateRecommendations(
    availableMK: number,
    compatibleMK: number,
    freeSlots: number,
    utilizationRate: number
): string[] {
    const recommendations = [];

    if (availableMK === 0) {
        recommendations.push(
            "❌ All matakuliah already have schedules. Cannot generate new schedules."
        );
    } else if (compatibleMK === 0) {
        recommendations.push(
            "❌ No compatible matakuliah-dosen combinations found. Check bidang minat matching."
        );
        recommendations.push(
            "💡 Consider adding more dosen with diverse bidang minat or updating matakuliah bidang minat."
        );
    } else if (compatibleMK < availableMK * 0.5) {
        recommendations.push(
            "⚠️ Less than 50% of available matakuliah have compatible dosen."
        );
        recommendations.push(
            "💡 Consider reviewing bidang minat assignments for better compatibility."
        );
    }

    if (freeSlots < availableMK) {
        recommendations.push(
            "⚠️ Not enough free time slots for all available matakuliah."
        );
        recommendations.push(
            "💡 Consider adding more shifts or rooms, or using preferred days."
        );
    }

    if (utilizationRate > 90) {
        recommendations.push(
            "⚠️ Very high schedule utilization (>90%). Limited room for new schedules."
        );
    } else if (utilizationRate > 75) {
        recommendations.push(
            "⚠️ High schedule utilization (>75%). May face slot conflicts."
        );
    }

    if (compatibleMK > 0 && freeSlots > compatibleMK) {
        recommendations.push("✅ Good conditions for schedule generation.");
        recommendations.push(
            `💡 Can potentially generate up to ${Math.min(
                compatibleMK,
                freeSlots
            )} schedules.`
        );
    }

    return recommendations;
}

/**
 * Generates schedules for ALL available matakuliah that don't have schedules yet
 * @param preferredDay - Optional preferred day for scheduling
 * @returns Promise<Schedule[]> Array of schedules, one for each available matakuliah
 */
async function generateSchedulesForAllAvailableMatakuliah(
    preferredDay?: HARI
): Promise<Schedule[]> {
    try {
        const { matakuliah, ruangan, shift, dosen, mahasiswa } =
            await getInitialData();
        const existingSchedules = await getExistingSchedules();

        // Filter out matakuliah that already have schedules
        const availableMatakuliah = matakuliah.filter(
            (mk) =>
                !existingSchedules.some(
                    (existing) => existing.matakuliahId === mk.id
                )
        );

        if (availableMatakuliah.length === 0) {
            return [];
        }

        // Pre-validate matakuliah-dosen compatibility
        const validMatakuliah = [];
        const invalidMatakuliah = [];

        for (const mk of availableMatakuliah) {
            const validDosen = selectValidDosenForMatakuliah(mk, dosen);
            if (validDosen) {
                validMatakuliah.push(mk);
            } else {
                invalidMatakuliah.push({
                    nama: mk.nama,
                    bidangMinat: mk.bidangMinat,
                    reason: "No compatible dosen found",
                });
            }
        }

        if (invalidMatakuliah.length > 0) {
            invalidMatakuliah.forEach((mk, index) => {
                console.log(
                    `   ${index + 1}. ${mk.nama} (${mk.bidangMinat}) - ${
                        mk.reason
                    }`
                );
            });
        }

        if (validMatakuliah.length === 0) {
            throw new Error(
                "No valid matakuliah-dosen combinations found based on bidang minat rules"
            );
        }

        // Generate one schedule for each valid matakuliah
        const schedules: Schedule[] = [];
        const failedMatakuliah = [];

        for (let i = 0; i < validMatakuliah.length; i++) {
            const mk = validMatakuliah[i];
            let scheduleCreated = false;
            let attempts = 0;
            const maxAttempts = 100;

            while (!scheduleCreated && attempts < maxAttempts) {
                attempts++;
                try {
                    const schedule = await createScheduleForMatakuliah(
                        mk,
                        ruangan,
                        shift,
                        dosen,
                        mahasiswa,
                        preferredDay
                    );

                    // Check if this schedule conflicts with existing schedules or already generated schedules
                    const allExistingSchedules = [
                        ...existingSchedules,
                        ...schedules,
                    ];
                    const hasConflicts = hasScheduleConflicts(
                        schedule,
                        allExistingSchedules,
                        matakuliah,
                        dosen,
                        mahasiswa
                    );

                    if (!hasConflicts) {
                        schedules.push(schedule);
                        scheduleCreated = true;
                    }
                } catch (error) {
                    // Skip this attempt and try again
                    continue;
                }
            }

            if (!scheduleCreated) {
                failedMatakuliah.push({
                    nama: mk.nama,
                    reason: `Could not find valid time slot after ${maxAttempts} attempts`,
                });
            }
        }

        // Calculate fitness for all generated schedules
        const schedulesWithFitness = schedules.map((schedule) => ({
            ...schedule,
            fitness: calculateFitness(
                schedule,
                schedules,
                matakuliah,
                dosen,
                mahasiswa
            ),
        }));

        // Sort by fitness
        schedulesWithFitness.sort((a, b) => b.fitness - a.fitness);

        if (failedMatakuliah.length > 0) {
            failedMatakuliah.forEach((mk, index) => {
                console.log(`   ${index + 1}. ${mk.nama} - ${mk.reason}`);
            });
        }

        return schedulesWithFitness;
    } catch (error) {
        console.error(
            `❌ Error in generateSchedulesForAllAvailableMatakuliah:`,
            error
        );
        throw error;
    }
}

/**
 * Expands a single schedule into multiple schedules based on class groups
 * @param schedule - The base schedule to expand
 * @param classes - Array of class groups to create schedules for
 * @returns Array of schedules, one for each class
 */
function expandScheduleIntoClasses(
    schedule: Schedule,
    classes: ClassGroup[]
): Schedule[] {
    const expandedSchedules: Schedule[] = [];

    for (const classGroup of classes) {
        expandedSchedules.push({
            ...schedule,
            id: ulid(), // Generate new ID for each class
            mahasiswaIds: classGroup.mahasiswa.map((m) => m.id),
            kelas: classGroup.kelas,
        });
    }

    return expandedSchedules;
}

/**
 * Saves multiple schedules with proper class handling and meeting generation
 * @param schedules - Array of schedules to save
 * @returns Promise<any[]> Array of saved schedule records
 */
async function saveSchedulesWithClasses(schedules: Schedule[]): Promise<any[]> {
    const savedSchedules = [];

    for (const schedule of schedules) {
        // Save the schedule
        const savedSchedule = await saveSchedule(schedule);
        savedSchedules.push(savedSchedule);
    }

    return savedSchedules;
}

/**
 * Generates all necessary class schedules for a specific matakuliah
 * @param matakuliahId - ID of the matakuliah to create schedules for
 * @param ruanganId - ID of the room to use
 * @param shiftId - ID of the shift to use
 * @param hari - Day of the week
 * @param dosenIds - Array of dosen IDs to assign
 * @returns Promise<Schedule[]> Array of schedules for each class needed
 */
async function generateAllSchedulesForMatakuliah(
    matakuliahId: string,
    ruanganId: string,
    shiftId: string,
    hari: HARI,
    dosenIds: string[]
): Promise<Schedule[]> {
    try {
        // Get course details
        const matakuliah = await prisma.matakuliah.findUnique({
            where: { id: matakuliahId },
        });

        if (!matakuliah) {
            throw new Error(`Matakuliah not found: ${matakuliahId}`);
        }

        // Get all mahasiswa for assignment
        const allMahasiswa = await prisma.mahasiswa.findMany({
            where: { isActive: true },
        });

        const { semester, tahun } = getCurrentSemesterAndYear();

        // Determine course type and get appropriate class groups
        const isTheoryCourse = matakuliah.isTeori === true;
        const isPracticalCourse =
            matakuliah.isTeori === false ||
            matakuliah.nama.toUpperCase().includes("PRAKTIKUM");

        let classes: ClassGroup[] = [];

        if (isTheoryCourse) {
            classes = await assignStudentsForTheoryCourse(
                matakuliahId,
                allMahasiswa
            );
        } else if (isPracticalCourse) {
            const practicalAssignment =
                await assignStudentsAndDosenForPracticalCourse(matakuliahId);
            classes = practicalAssignment.classes;
            // Update dosen IDs if we got them from theory course
            if (practicalAssignment.dosenIds.length > 0) {
                dosenIds = practicalAssignment.dosenIds;
            }
        }

        // Create one schedule for each class
        const schedules: Schedule[] = [];
        for (const classGroup of classes) {
            schedules.push({
                id: ulid(),
                matakuliahId,
                ruanganId,
                shiftId,
                dosenIds,
                hari,
                semester,
                tahun,
                mahasiswaIds: classGroup.mahasiswa.map((m) => m.id),
                asistenLabIds: [],
                kelas: classGroup.kelas,
                fitness: 0,
            });
        }

        return schedules;
    } catch (error) {
        Logger.error(
            `Error generating schedules for matakuliah ${matakuliahId}:`,
            error
        );
        throw error;
    }
}

// Export the enhanced service
export const jadwalGeneticService = {
    generateSchedule: generateOptimizedSchedule,
    generateScheduleWithValidation: generateOptimizedSchedule,
    generateOptimizedSchedule,
    saveSchedule,
    generateMeetingDates,
    getCurrentSemesterAndYear,

    generateSchedulesForAllAvailableMatakuliah,
    getExistingSchedules,
    hasScheduleConflicts,
    validateScheduleSet,
    canStudentTakeCourse,
    canDosenTeachCourse,
    diagnoseSchedulingConstraints,
    generateRecommendations,
    expandScheduleIntoClasses,
    saveSchedulesWithClasses,
    generateAllSchedulesForMatakuliah,
};
