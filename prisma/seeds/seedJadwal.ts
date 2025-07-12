/**
 * JADWAL SEEDER FOR THEORY MATAKULIAH
 * ===================================
 *
 * This seeder creates jadwal (schedules) specifically for theory matakuliah (isTeori = true).
 *
 * Features:
 * - ✅ Filters for theory courses only (isTeori = true)
 * - ✅ Maximum 50 mahasiswa per class (kelas)
 * - ✅ Limited to maximum 2 classes (A, B) per course to ensure all courses get scheduled
 * - ✅ Multiple dosen per jadwal (many-to-many)
 * - ✅ Multiple mahasiswa per jadwal (many-to-many)
 * - ✅ No asisten assignment (only for theory courses)
 * - ✅ Validates dosen-matakuliah compatibility (bidang minat)
 * - ✅ Validates mahasiswa-matakuliah eligibility (semester rules)
 * - ✅ Prevents time slot conflicts (room, dosen, shift)
 * - ✅ Auto-generates 12 meeting dates per jadwal
 * - ✅ Prefers "Ruang Kuliah" (classroom) over laboratory rooms
 * - ✅ Comprehensive logging and error handling
 * - ✅ Fair distribution system to ensure all courses get students
 * - ✅ Student workload limits (max 24 SKS per semester)
 *
 * Business Rules:
 * 1. Students in semester 1 can only take semester 1 courses
 * 2. Students in odd semesters (3,5,7) can take: semester 1 + their semester + their semester+4
 * 3. Students in even semesters (2,4,6,8) can take: semester 2 + their semester + their semester+4
 * 4. UMUM courses can be taught by any dosen
 * 5. Other courses must match dosen's bidang minat
 * 6. Theory courses have max 50 students per class
 * 7. Maximum 2 classes (A, B) per course to ensure all courses can be scheduled
 * 8. Maximum 24 SKS per student per semester (fair distribution)
 * 9. No asisten assignment for theory courses
 * 10. Round-robin distribution to ensure all courses get students
 *
 * Usage:
 * - npm run seed (runs all seeders including this one)
 * - npm run seed:jadwal (runs only this seeder)
 *
 * Prerequisites:
 * - Matakuliah must exist with isTeori = true
 * - Ruangan must exist (preferably "Ruang Kuliah")
 * - Shift must exist and be active
 * - Dosen must exist
 * - Mahasiswa must exist and be active
 */

import { PrismaClient, SEMESTER, BIDANG_MINAT } from "@prisma/client";
import { ulid } from "ulid";
import {
    getCurrentAcademicYear,
    isGanjilSemester,
} from "../../src/utils/strings.utils";

// Days of the week in Indonesian
type HARI = "SENIN" | "SELASA" | "RABU" | "KAMIS" | "JUMAT";
const HARI_LIST: HARI[] = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT"];

// Maximum SKS per student per semester for fair distribution
const MAX_SKS_PER_STUDENT = 24;

/**
 * Checks if a student can enroll in a course based on semester rules
 */
function canStudentTakeCourse(
    studentSemester: number,
    courseSemester: number
): boolean {
    // Rule 1: Students in semester 1 can only take semester 1 courses
    if (studentSemester === 1) {
        return courseSemester === 1;
    }

    // Rule 2: Students in semester 2 can take semester 1 and 2 courses
    if (studentSemester === 2) {
        return courseSemester <= 2;
    }

    // Rule 3: Students in odd semesters (3,5,7) can take: semester 1 + their semester + their semester+4
    if (studentSemester >= 3) {
        const isStudentOddSemester = studentSemester % 2 === 1;

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

    return true;
}

/**
 * Checks if a lecturer can teach a course based on field of interest
 */
function canDosenTeachCourse(
    dosenBidangMinat: BIDANG_MINAT,
    matakuliahBidangMinat: BIDANG_MINAT
): boolean {
    // Rule: UMUM courses can be taught by any lecturer
    if (matakuliahBidangMinat === BIDANG_MINAT.UMUM) {
        return true;
    }

    // Rule: Lecturers can only teach courses that match their field of interest
    return dosenBidangMinat === matakuliahBidangMinat;
}

/**
 * Selects valid dosen for a matakuliah based on field of interest rules
 * @param matakuliah - The course to assign lecturers to
 * @param allDosen - Array of all available lecturers
 * @param maxDosen - Maximum number of lecturers per jadwal (default: 2)
 * @returns Array of valid lecturers
 */
function selectValidDosenForMatakuliah(
    matakuliah: any,
    allDosen: any[],
    maxDosen: number = 2
): any[] {
    // First, check if there are assigned lecturers through DosenPengampuMK
    if (matakuliah.dosenPengampuMK && matakuliah.dosenPengampuMK.length > 0) {
        const assignedDosen = matakuliah.dosenPengampuMK
            .map((dpm: any) => dpm.dosen)
            .filter(Boolean);
        if (assignedDosen.length > 0) {
            // Return assigned lecturers (up to maxDosen)
            return assignedDosen.slice(0, maxDosen);
        }
    }

    // If no assigned lecturers, find valid lecturers based on field of interest
    const validDosen = allDosen.filter((dosen) =>
        canDosenTeachCourse(dosen.bidangMinat, matakuliah.bidangMinat)
    );

    if (validDosen.length === 0) {
        return [];
    }

    // Shuffle and return up to maxDosen lecturers
    const shuffled = validDosen.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(maxDosen, validDosen.length));
}

/**
 * Creates a fair distribution system for students across all theory courses
 * This ensures every course gets students and no student is overloaded
 */
function createFairStudentDistribution(
    matakuliah: any[],
    allMahasiswa: any[]
): Map<string, any[]> {
    const distribution = new Map<string, any[]>();

    // Track student workload (SKS)
    const studentWorkload = new Map<string, number>();
    allMahasiswa.forEach((student) => {
        studentWorkload.set(student.id, 0);
    });

    // Create eligibility map for each course
    const courseEligibility = new Map<string, any[]>();
    matakuliah.forEach((mk) => {
        const eligible = allMahasiswa.filter(
            (mahasiswa) =>
                canStudentTakeCourse(mahasiswa.semester, mk.semester) &&
                (studentWorkload.get(mahasiswa.id) || 0) + mk.sks <=
                    MAX_SKS_PER_STUDENT
        );
        courseEligibility.set(mk.id, eligible);
    });

    // Sort courses by number of eligible students (ascending) - courses with fewer eligible students get priority
    const sortedCourses = matakuliah.sort((a, b) => {
        const eligibleA = courseEligibility.get(a.id)?.length || 0;
        const eligibleB = courseEligibility.get(b.id)?.length || 0;
        return eligibleA - eligibleB;
    });

    console.log(`\n📊 FAIR DISTRIBUTION - Course Eligibility Analysis:`);
    sortedCourses.forEach((mk) => {
        const eligible = courseEligibility.get(mk.id)?.length || 0;
        console.log(
            `   ${mk.nama} (S${mk.semester}, ${mk.sks}SKS): ${eligible} eligible students`
        );
    });

    // Distribute students fairly using round-robin approach
    sortedCourses.forEach((mk, courseIndex) => {
        const eligible = courseEligibility.get(mk.id) || [];
        const maxStudentsForCourse = Math.min(100, eligible.length); // Max 100 students per course (2 classes × 50)

        // Filter students who can still take this course (workload check)
        const availableStudents = eligible.filter((student) => {
            const currentWorkload = studentWorkload.get(student.id) || 0;
            return currentWorkload + mk.sks <= MAX_SKS_PER_STUDENT;
        });

        // Sort available students by their current workload (ascending) - give priority to students with lighter loads
        const sortedStudents = availableStudents.sort((a, b) => {
            const workloadA = studentWorkload.get(a.id) || 0;
            const workloadB = studentWorkload.get(b.id) || 0;
            return workloadA - workloadB;
        });

        // Select students for this course
        const selectedStudents = sortedStudents.slice(0, maxStudentsForCourse);

        // Update student workloads
        selectedStudents.forEach((student) => {
            const currentWorkload = studentWorkload.get(student.id) || 0;
            studentWorkload.set(student.id, currentWorkload + mk.sks);
        });

        distribution.set(mk.id, selectedStudents);
        console.log(
            `   ✅ ${mk.nama}: ${selectedStudents.length} students assigned`
        );
    });

    // Log student workload distribution
    console.log(`\n📈 STUDENT WORKLOAD DISTRIBUTION:`);
    const workloadStats = Array.from(studentWorkload.values()).sort(
        (a, b) => a - b
    );
    const avgWorkload =
        workloadStats.reduce((sum, w) => sum + w, 0) / workloadStats.length;
    console.log(`   Average workload: ${avgWorkload.toFixed(1)} SKS`);
    console.log(`   Min workload: ${workloadStats[0]} SKS`);
    console.log(
        `   Max workload: ${workloadStats[workloadStats.length - 1]} SKS`
    );

    return distribution;
}

/**
 * Divides students into classes with maximum 2 classes (A and B) to ensure all courses can be scheduled
 * @param students - Array of students to divide
 * @returns Array of student groups with class names (max 2 classes)
 */
function divideStudentsIntoClasses(
    students: any[]
): { kelas: string; mahasiswa: any[] }[] {
    const maxStudentsPerClass = 50;
    const maxClasses = 2; // Limit to 2 classes (A and B) to ensure all courses get scheduled
    const classes: { kelas: string; mahasiswa: any[] }[] = [];
    const classNames = ["A", "B"]; // Only A and B classes

    // If we have very few students, just create one class
    if (students.length <= maxStudentsPerClass) {
        return [
            {
                kelas: "A",
                mahasiswa: students,
            },
        ];
    }

    // If we have more than 50 but less than or equal to 100 students, create 2 classes
    if (students.length <= maxStudentsPerClass * maxClasses) {
        const studentsPerClass = Math.ceil(students.length / maxClasses);

        for (let i = 0; i < maxClasses; i++) {
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
        // If we have more than 100 students, limit to 2 classes of 50 each (first 100 students)
        console.log(
            `⚠️  Course has ${students.length} eligible students, limiting to first 100 students (2 classes) for balanced distribution`
        );

        for (let i = 0; i < maxClasses; i++) {
            const startIndex = i * maxStudentsPerClass;
            const endIndex = startIndex + maxStudentsPerClass;
            const studentsInClass = students.slice(startIndex, endIndex);

            classes.push({
                kelas: classNames[i],
                mahasiswa: studentsInClass,
            });
        }
    }

    return classes;
}

/**
 * Check if a time slot is already occupied by checking conflicts with dosen and ruangan
 */
function isTimeSlotOccupied(
    hari: HARI,
    shiftId: string,
    ruanganId: string,
    dosenIds: string[],
    existingSchedules: any[]
): boolean {
    return existingSchedules.some((schedule) => {
        // Check if same day and shift
        if (schedule.hari === hari && schedule.shiftId === shiftId) {
            // Check room conflict
            if (schedule.ruanganId === ruanganId) {
                return true;
            }
            // Check dosen conflict
            if (
                schedule.dosenIds &&
                dosenIds.some((dosenId) => schedule.dosenIds.includes(dosenId))
            ) {
                return true;
            }
        }
        return false;
    });
}

/**
 * Generate meeting dates for a schedule
 */
function generateMeetingDates(
    hari: HARI,
    semester: SEMESTER,
    tahun: string,
    numberOfMeetings: number = 12
): string[] {
    const [startYear] = tahun.split("/").map(Number);

    let semesterStartDate: Date;
    if (semester === SEMESTER.GANJIL) {
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
    };

    const targetDayNumber = dayMap[hari];
    let currentDate = new Date(semesterStartDate);

    // Adjust to first occurrence of the target day
    while (currentDate.getDay() !== targetDayNumber) {
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Generate meeting dates (one week apart)
    const meetingDates: string[] = [];
    for (let i = 0; i < numberOfMeetings; i++) {
        const dateStr = currentDate.toISOString().split("T")[0]; // Format as YYYY-MM-DD
        meetingDates.push(dateStr);
        currentDate.setDate(currentDate.getDate() + 7); // Next week
    }

    return meetingDates;
}

/**
 * Main seeder function for jadwal (non-PRAKTIKUM only)
 */
export async function seedJadwal(prisma: PrismaClient) {
    // Get current semester and academic year
    const currentSemester = isGanjilSemester()
        ? SEMESTER.GENAP
        : SEMESTER.GANJIL;
    const currentYear = getCurrentAcademicYear();

    // Check if jadwal already exists for current semester/year
    const existingJadwalCount = await prisma.jadwal.count({
        where: {
            semester: currentSemester,
            tahun: currentYear,
            deletedAt: null,
        },
    });

    if (existingJadwalCount > 0) {
        console.log(
            `ℹ️ Jadwal already exists for ${currentSemester} ${currentYear} (${existingJadwalCount} found). Skipping seeder.`
        );
        return;
    }

    // Fetch all required data
    const [matakuliah, ruangan, shift, dosen, mahasiswa] = await Promise.all([
        // Get theory matakuliah only (isTeori = true)
        prisma.matakuliah.findMany({
            where: {
                isTeori: true,
                semester: {
                    in: isGanjilSemester()
                        ? [2, 4, 6, 8] // GENAP semesters
                        : [1, 3, 5, 7], // GANJIL semesters
                },
            },
            include: {
                dosenPengampuMK: {
                    include: {
                        dosen: true,
                    },
                },
            },
        }),
        // Get active ruangan (prefer classroom type for non-praktikum)
        prisma.ruanganLaboratorium.findMany({
            where: {
                isActive: true,
            },
            orderBy: {
                nama: "asc",
            },
        }),
        // Get active shifts
        prisma.shift.findMany({
            where: { isActive: true },
        }),
        // Get all dosen
        prisma.dosen.findMany(),
        // Get active mahasiswa
        prisma.mahasiswa.findMany({
            where: { isActive: true },
        }),
    ]);

    if (matakuliah.length === 0) {
        console.log("❌ No theory matakuliah found!");
        return;
    }

    if (shift.length === 0 || dosen.length === 0) {
        console.log("❌ Missing required data (shift or dosen)!");
        return;
    }

    if (ruangan.length === 0) {
        console.log("❌ No ruangan found!");
        return;
    }

    if (mahasiswa.length === 0) {
        console.log("❌ No mahasiswa found!");
        return;
    }

    // Prioritize classroom-type ruangan for theory courses
    const classroomRuangan = ruangan.filter(
        (r) =>
            r.nama.toLowerCase().includes("ruang kuliah") ||
            r.nama.toLowerCase().includes("kelas")
    );
    const availableRuangan =
        classroomRuangan.length > 0 ? classroomRuangan : ruangan;

    // Create fair distribution of students across all courses
    const studentDistribution = createFairStudentDistribution(
        matakuliah,
        mahasiswa
    );

    // Track created schedules to avoid conflicts
    const createdSchedules: any[] = [];
    const successfulSchedules: any[] = [];
    const failedSchedules: any[] = [];

    // Create jadwal for each theory matakuliah using the fair distribution
    for (let i = 0; i < matakuliah.length; i++) {
        const mk = matakuliah[i];

        try {
            // Find valid dosen for this matakuliah
            const validDosen = selectValidDosenForMatakuliah(mk, dosen, 2);
            if (validDosen.length === 0) {
                console.log(
                    `❌ No valid dosen found for ${mk.nama} (bidang minat: ${mk.bidangMinat})`
                );
                failedSchedules.push({
                    matakuliah: mk.nama,
                    reason: `No compatible dosen (bidang minat: ${mk.bidangMinat})`,
                });
                continue;
            }

            // Get students from fair distribution
            const assignedStudents = studentDistribution.get(mk.id) || [];

            if (assignedStudents.length === 0) {
                console.log(
                    `❌ No students assigned for ${mk.nama} (semester ${mk.semester})`
                );
                failedSchedules.push({
                    matakuliah: mk.nama,
                    reason: `No students assigned through fair distribution (course semester: ${mk.semester})`,
                });
                continue;
            }

            // Divide students into classes (max 50 per class)
            const classes = divideStudentsIntoClasses(assignedStudents);
            console.log(
                `📊 ${mk.nama}: Creating ${classes.length} class(es) for ${assignedStudents.length} students`
            );

            // Create jadwal for each class
            for (const classData of classes) {
                let scheduleCreated = false;
                let attempts = 0;
                const maxAttempts = 100;

                while (!scheduleCreated && attempts < maxAttempts) {
                    attempts++;

                    // Random selection of day, shift, and room
                    const randomHari =
                        HARI_LIST[Math.floor(Math.random() * HARI_LIST.length)];
                    const randomShift =
                        shift[Math.floor(Math.random() * shift.length)];
                    const randomRuangan =
                        availableRuangan[
                            Math.floor(Math.random() * availableRuangan.length)
                        ];

                    const dosenIds = validDosen.map((d) => d.id);

                    // Check if time slot is available
                    if (
                        !isTimeSlotOccupied(
                            randomHari,
                            randomShift.id,
                            randomRuangan.id,
                            dosenIds,
                            createdSchedules
                        )
                    ) {
                        // Create the jadwal with many-to-many relationships (no asisten for theory courses)
                        const jadwalId = ulid();
                        const jadwal = await prisma.jadwal.create({
                            data: {
                                id: jadwalId,
                                matakuliahId: mk.id,
                                ruanganId: randomRuangan.id,
                                shiftId: randomShift.id,
                                hari: randomHari,
                                semester: currentSemester,
                                tahun: currentYear,
                                kelas: classData.kelas, // Set the class name (A, B, C, etc.)
                                // Connect multiple dosen
                                dosen: {
                                    connect: validDosen.map((d) => ({
                                        id: d.id,
                                    })),
                                },
                                // Connect mahasiswa for this specific class
                                mahasiswa: {
                                    connect: classData.mahasiswa.map((m) => ({
                                        id: m.id,
                                    })),
                                },
                                // No asisten for theory courses
                            },
                        });

                        // Generate and create meeting dates
                        const meetingDates = generateMeetingDates(
                            randomHari,
                            currentSemester,
                            currentYear,
                            12
                        );
                        const meetings = await Promise.all(
                            meetingDates.map((dateStr, index) =>
                                prisma.meeting.create({
                                    data: {
                                        id: ulid(),
                                        jadwalId: jadwal.id,
                                        tanggal: dateStr,
                                        pertemuan: index + 1,
                                    },
                                })
                            )
                        );

                        // Track the created schedule
                        createdSchedules.push({
                            hari: randomHari,
                            shiftId: randomShift.id,
                            ruanganId: randomRuangan.id,
                            dosenIds: dosenIds,
                            matakuliahId: mk.id,
                            kelas: classData.kelas,
                        });

                        successfulSchedules.push({
                            jadwal,
                            meetings: meetings.length,
                            enrolledStudents: classData.mahasiswa.length,
                            assignedDosen: validDosen.length,
                            matakuliah: mk.nama,
                            kelas: classData.kelas,
                            dosen: validDosen.map((d) => d.nama).join(", "),
                            ruangan: randomRuangan.nama,
                            shift: `${randomShift.startTime} - ${randomShift.endTime}`,
                            hari: randomHari,
                            courseType: "TEORI",
                            sks: mk.sks,
                        });

                        console.log(
                            `✅ ${mk.nama} - Kelas ${classData.kelas}: ${classData.mahasiswa.length} students assigned`
                        );
                        scheduleCreated = true;
                    } else {
                        // Time slot occupied, try again
                        continue;
                    }
                }

                if (!scheduleCreated) {
                    console.log(
                        `❌ Could not find available time slot for ${mk.nama} - Kelas ${classData.kelas} after ${maxAttempts} attempts`
                    );
                    failedSchedules.push({
                        matakuliah: `${mk.nama} - Kelas ${classData.kelas}`,
                        reason: `No available time slots after ${maxAttempts} attempts`,
                    });
                }
            }
        } catch (error) {
            console.error(`❌ Error creating jadwal for ${mk.nama}:`, error);
            failedSchedules.push({
                matakuliah: mk.nama,
                reason: `Error: ${error}`,
            });
        }
    }

    // Summary
    if (successfulSchedules.length > 0) {
        console.log(
            `\n🎉 SEEDING SUMMARY FOR ${currentSemester} ${currentYear} , current Month: ${
                new Date().getMonth() + 1
            }`
        );
        console.log(
            `✅ Successfully created: ${successfulSchedules.length} jadwal`
        );

        // Group by matakuliah to show class distribution
        const courseStats = successfulSchedules.reduce(
            (acc: any, schedule: any) => {
                const courseName = schedule.matakuliah;
                if (!acc[courseName]) {
                    acc[courseName] = {
                        classes: [],
                        totalStudents: 0,
                        dosen: schedule.dosen,
                        sks: schedule.sks,
                    };
                }
                acc[courseName].classes.push({
                    kelas: schedule.kelas,
                    students: schedule.enrolledStudents,
                });
                acc[courseName].totalStudents += schedule.enrolledStudents;
                return acc;
            },
            {}
        );

        console.log(`\n📊 CLASS DISTRIBUTION (FAIR SYSTEM):`);
        Object.entries(courseStats).forEach(
            ([courseName, stats]: [string, any]) => {
                const classInfo = stats.classes
                    .map((c: any) => `${c.kelas}(${c.students})`)
                    .join(", ");
                console.log(
                    `   ${courseName} [${stats.sks}SKS]: ${stats.classes.length} kelas - ${classInfo} = ${stats.totalStudents} total students`
                );
            }
        );

        // Total SKS calculation
        const totalSKS = successfulSchedules.reduce(
            (sum, schedule) => sum + schedule.sks * schedule.enrolledStudents,
            0
        );
        console.log(`\n📈 DISTRIBUTION STATISTICS:`);
        console.log(
            `   Total student-course assignments: ${successfulSchedules.reduce(
                (sum, s) => sum + s.enrolledStudents,
                0
            )}`
        );
        console.log(`   Total SKS distributed: ${totalSKS}`);
        console.log(
            `   Average students per course: ${(
                successfulSchedules.reduce(
                    (sum, s) => sum + s.enrolledStudents,
                    0
                ) / Object.keys(courseStats).length
            ).toFixed(1)}`
        );
    }

    if (failedSchedules.length > 0) {
        console.log(`\n❌ Failed to create: ${failedSchedules.length} jadwal`);
        failedSchedules.forEach((failed) => {
            console.log(`   - ${failed.matakuliah}: ${failed.reason}`);
        });
    }

    console.log(
        `\n🎯 Fair jadwal seeding completed for ${currentSemester} ${currentYear}!`
    );
}
