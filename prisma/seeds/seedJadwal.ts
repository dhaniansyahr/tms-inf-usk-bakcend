/**
 * JADWAL SEEDER FOR NON-PRAKTIKUM MATAKULIAH
 * ==========================================
 *
 * This seeder creates jadwal (schedules) specifically for matakuliah that DON'T contain "PRAKTIKUM" in their name.
 *
 * Features:
 * - ✅ Filters out matakuliah with "PRAKTIKUM" in name
 * - ✅ Maximum 50 mahasiswa per jadwal
 * - ✅ Multiple dosen per jadwal (many-to-many)
 * - ✅ Multiple mahasiswa per jadwal (many-to-many)
 * - ✅ No asisten assignment (only for regular courses)
 * - ✅ Validates dosen-matakuliah compatibility (bidang minat)
 * - ✅ Validates mahasiswa-matakuliah eligibility (semester rules)
 * - ✅ Prevents time slot conflicts (room, dosen, shift)
 * - ✅ Auto-generates 12 meeting dates per jadwal
 * - ✅ Prefers "Ruang Kuliah" (classroom) over laboratory rooms
 * - ✅ Comprehensive logging and error handling
 *
 * Business Rules:
 * 1. Students in semester 1 can only take semester 1 courses
 * 2. Students in odd semesters (3,5,7) can take: semester 1 + their semester + their semester+4
 * 3. Students in even semesters (2,4,6,8) can take: semester 2 + their semester + their semester+4
 * 4. UMUM courses can be taught by any dosen
 * 5. Other courses must match dosen's bidang minat
 * 6. Non-PRAKTIKUM courses have max 50 students
 * 7. No asisten assignment for regular courses
 *
 * Usage:
 * - npm run seed (runs all seeders including this one)
 * - npm run seed:jadwal (runs only this seeder)
 *
 * Prerequisites:
 * - Matakuliah must exist (non-PRAKTIKUM)
 * - Ruangan must exist (preferably "Ruang Kuliah")
 * - Shift must exist and be active
 * - Dosen must exist
 * - Mahasiswa must exist and be active
 */

import { PrismaClient, SEMESTER, BIDANG_MINAT } from "@prisma/client";
import { ulid } from "ulid";
import { getCurrentAcademicYear, isGanjilSemester } from "../../src/utils/strings.utils";

// Days of the week in Indonesian
type HARI = "SENIN" | "SELASA" | "RABU" | "KAMIS" | "JUMAT";
const HARI_LIST: HARI[] = ["SENIN", "SELASA", "RABU", "KAMIS", "JUMAT"];

/**
 * Checks if a student can enroll in a course based on semester rules
 */
function canStudentTakeCourse(studentSemester: number, courseSemester: number): boolean {
        // Rule 1: Students in semester 1 cannot take courses from higher semesters
        if (studentSemester === 1 && courseSemester > 1) {
                return false;
        }

        // Rule 2: Students in odd semesters (3, 5, 7) can take courses from semester 1 and their own semester + 4
        // Students in even semesters (2, 4, 6, 8) can take courses from semester 2 and their own semester + 4
        if (studentSemester >= 3) {
                const isStudentOddSemester = studentSemester % 2 === 1;

                // Can take courses from semester 1 (for odd semester students) or semester 2 (for even semester students)
                if ((isStudentOddSemester && courseSemester === 1) || (!isStudentOddSemester && courseSemester === 2)) {
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
 */
function canDosenTeachCourse(dosenBidangMinat: BIDANG_MINAT, matakuliahBidangMinat: BIDANG_MINAT): boolean {
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
function selectValidDosenForMatakuliah(matakuliah: any, allDosen: any[], maxDosen: number = 2): any[] {
        // First, check if there are assigned lecturers through DosenPengampuMK
        if (matakuliah.dosenPengampuMK && matakuliah.dosenPengampuMK.length > 0) {
                const assignedDosen = matakuliah.dosenPengampuMK.map((dpm: any) => dpm.dosen).filter(Boolean);
                if (assignedDosen.length > 0) {
                        // Return assigned lecturers (up to maxDosen)
                        return assignedDosen.slice(0, maxDosen);
                }
        }

        // If no assigned lecturers, find valid lecturers based on field of interest
        const validDosen = allDosen.filter((dosen) => canDosenTeachCourse(dosen.bidangMinat, matakuliah.bidangMinat));

        if (validDosen.length === 0) {
                return [];
        }

        // Shuffle and return up to maxDosen lecturers
        const shuffled = validDosen.sort(() => 0.5 - Math.random());
        return shuffled.slice(0, Math.min(maxDosen, validDosen.length));
}

/**
 * Selects valid mahasiswa for a matakuliah based on semester rules
 * @param matakuliah - The course to assign students to
 * @param allMahasiswa - Array of all available students
 * @returns Array of valid students (max 50 for non-PRAKTIKUM)
 */
function selectValidMahasiswaForMatakuliah(matakuliah: any, allMahasiswa: any[]): any[] {
        // Non-PRAKTIKUM courses have max 50 students
        const maxStudents = 50;

        const validMahasiswa = allMahasiswa.filter((mahasiswa) => canStudentTakeCourse(mahasiswa.semester, matakuliah.semester));

        if (validMahasiswa.length === 0) {
                return [];
        }

        // Shuffle and take maximum 50 students
        const shuffled = validMahasiswa.sort(() => 0.5 - Math.random());
        const selectedStudents = shuffled.slice(0, Math.min(maxStudents, validMahasiswa.length));

        // Log selection details
        console.log(`📚 ${matakuliah.nama} (S${matakuliah.semester}): ${validMahasiswa.length} eligible → ${selectedStudents.length} assigned`);

        return selectedStudents;
}

/**
 * Check if a time slot is already occupied by checking conflicts with dosen and ruangan
 */
function isTimeSlotOccupied(hari: HARI, shiftId: string, ruanganId: string, dosenIds: string[], existingSchedules: any[]): boolean {
        return existingSchedules.some((schedule) => {
                // Check if same day and shift
                if (schedule.hari === hari && schedule.shiftId === shiftId) {
                        // Check room conflict
                        if (schedule.ruanganId === ruanganId) {
                                return true;
                        }
                        // Check dosen conflict
                        if (schedule.dosenIds && dosenIds.some((dosenId) => schedule.dosenIds.includes(dosenId))) {
                                return true;
                        }
                }
                return false;
        });
}

/**
 * Generate meeting dates for a schedule
 */
function generateMeetingDates(hari: HARI, semester: SEMESTER, tahun: string, numberOfMeetings: number = 12): string[] {
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
        const currentSemester = isGanjilSemester() ? SEMESTER.GANJIL : SEMESTER.GENAP;
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
                console.log(`ℹ️ Jadwal already exists for ${currentSemester} ${currentYear} (${existingJadwalCount} found). Skipping seeder.`);
                return;
        }

        // Fetch all required data
        const [matakuliah, ruangan, shift, dosen, mahasiswa] = await Promise.all([
                // Get matakuliah that DON'T contain "PRAKTIKUM" in their name
                prisma.matakuliah.findMany({
                        where: {
                                nama: {
                                        not: {
                                                contains: "PRAKTIKUM",
                                        },
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
                console.log("❌ No non-PRAKTIKUM matakuliah found!");
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

        // Prioritize classroom-type ruangan for non-praktikum courses
        const classroomRuangan = ruangan.filter((r) => r.nama.toLowerCase().includes("ruang kuliah") || r.nama.toLowerCase().includes("kelas"));
        const availableRuangan = classroomRuangan.length > 0 ? classroomRuangan : ruangan;

        // Track created schedules to avoid conflicts
        const createdSchedules: any[] = [];
        const successfulSchedules: any[] = [];
        const failedSchedules: any[] = [];

        // Create jadwal for each non-PRAKTIKUM matakuliah
        for (let i = 0; i < matakuliah.length; i++) {
                const mk = matakuliah[i];

                try {
                        // Find valid dosen for this matakuliah
                        const validDosen = selectValidDosenForMatakuliah(mk, dosen, 2);
                        if (validDosen.length === 0) {
                                console.log(`❌ No valid dosen found for ${mk.nama} (bidang minat: ${mk.bidangMinat})`);
                                failedSchedules.push({
                                        matakuliah: mk.nama,
                                        reason: `No compatible dosen (bidang minat: ${mk.bidangMinat})`,
                                });
                                continue;
                        }

                        // Find valid mahasiswa (max 50 for non-PRAKTIKUM)
                        const validMahasiswa = selectValidMahasiswaForMatakuliah(mk, mahasiswa);

                        if (validMahasiswa.length === 0) {
                                console.log(`❌ No eligible students found for ${mk.nama} (semester ${mk.semester})`);
                                failedSchedules.push({
                                        matakuliah: mk.nama,
                                        reason: `No eligible students (course semester: ${mk.semester})`,
                                });
                                continue;
                        }

                        // Try to find available time slot
                        let scheduleCreated = false;
                        let attempts = 0;
                        const maxAttempts = 100;

                        while (!scheduleCreated && attempts < maxAttempts) {
                                attempts++;

                                // Random selection of day, shift, and room
                                const randomHari = HARI_LIST[Math.floor(Math.random() * HARI_LIST.length)];
                                const randomShift = shift[Math.floor(Math.random() * shift.length)];
                                const randomRuangan = availableRuangan[Math.floor(Math.random() * availableRuangan.length)];

                                const dosenIds = validDosen.map((d) => d.id);

                                // Check if time slot is available
                                if (!isTimeSlotOccupied(randomHari, randomShift.id, randomRuangan.id, dosenIds, createdSchedules)) {
                                        // Create the jadwal with many-to-many relationships (no asisten for non-PRAKTIKUM)
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
                                                        // Connect multiple dosen
                                                        dosen: {
                                                                connect: validDosen.map((d) => ({ id: d.id })),
                                                        },
                                                        // Connect multiple mahasiswa
                                                        mahasiswa: {
                                                                connect: validMahasiswa.map((m) => ({ id: m.id })),
                                                        },
                                                        // No asisten for non-PRAKTIKUM courses
                                                },
                                        });

                                        // Generate and create meeting dates
                                        const meetingDates = generateMeetingDates(randomHari, currentSemester, currentYear, 12);
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
                                        });

                                        successfulSchedules.push({
                                                jadwal,
                                                meetings: meetings.length,
                                                enrolledStudents: validMahasiswa.length,
                                                assignedDosen: validDosen.length,
                                                matakuliah: mk.nama,
                                                dosen: validDosen.map((d) => d.nama).join(", "),
                                                ruangan: randomRuangan.nama,
                                                shift: `${randomShift.startTime} - ${randomShift.endTime}`,
                                                hari: randomHari,
                                                courseType: "KULIAH",
                                        });

                                        console.log(`✅ ${mk.nama}: ${validMahasiswa.length} students assigned (max: 50)`);
                                        scheduleCreated = true;
                                } else {
                                        // Time slot occupied, try again
                                        continue;
                                }
                        }

                        if (!scheduleCreated) {
                                console.log(`❌ Could not find available time slot for ${mk.nama} after ${maxAttempts} attempts`);
                                failedSchedules.push({
                                        matakuliah: mk.nama,
                                        reason: `No available time slots after ${maxAttempts} attempts`,
                                });
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
                console.log(`✅ Successfully created: ${successfulSchedules.length} jadwal`);
        }

        if (failedSchedules.length > 0) {
                console.log(`❌ Failed to create: ${failedSchedules.length} jadwal`);
        }

        console.log(`🎯 Jadwal seeding completed for ${currentSemester} ${currentYear}!`);
}
