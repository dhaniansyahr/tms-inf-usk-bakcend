import { JadwalDTO } from "$entities/Jadwal";
import Logger from "$pkg/logger";
import { HARI, jadwalGeneticService } from "$services/JadwalGeneticService";
import { prisma } from "$utils/prisma.utils";
import { SEMESTER } from "@prisma/client";
import { DateTime } from "luxon";

export async function hasConflict(jadwal: JadwalDTO): Promise<any> {
    try {
        let conflict: { field: string; message: string; data: any }[] = [];
        const { semester, tahun } =
            jadwalGeneticService.getCurrentSemesterAndYear();

        // Fetch all jadwal in the same semester and year
        const existingJadwals = await prisma.jadwal.findMany({
            where: {
                semester,
                tahun,
            },
            select: {
                id: true,
                hari: true,
                kelas: true,
                ruanganId: true,
                shiftId: true,
                matakuliahId: true,
                matakuliah: {
                    select: {
                        id: true,
                        nama: true,
                    },
                },
                dosen: {
                    select: {
                        id: true,
                        nama: true,
                    },
                },
                mahasiswa: {
                    select: {
                        id: true,
                        nama: true,
                    },
                },
                ruangan: {
                    select: {
                        id: true,
                        nama: true,
                    },
                },
                shift: {
                    select: {
                        id: true,
                        startTime: true,
                        endTime: true,
                    },
                },
            },
        });

        // Helper to collect conflict data
        const addConflict = (field: string, message: string, data: any) => {
            conflict.push({
                field,
                message,
                data,
            });
        };

        // 1. Room-Shift-Day conflict
        const roomConflict = existingJadwals.find(
            (j) =>
                j.ruanganId === jadwal.ruanganId &&
                j.shiftId === jadwal.shiftId &&
                j.hari === jadwal.hari
        );
        if (roomConflict) {
            addConflict(
                "Ruangan",
                `Ruangan sudah terpakai pada shift dan hari yang sama.`,
                roomConflict
            );
        }

        // 2. Matakuliah conflict (same matakuliah already scheduled)
        const mkConflict = existingJadwals.find(
            (j) => j.matakuliahId === jadwal.matakuliahId
        );
        if (mkConflict) {
            addConflict(
                "Matakuliah",
                `Matakuliah sudah dijadwalkan.`,
                mkConflict
            );
        }

        // 3. Dosen-Shift-Day conflict
        for (const dosenId of jadwal.dosenIds) {
            const dosenConflict = existingJadwals.find(
                (j) =>
                    j.dosen.some((d) => d.id === dosenId) &&
                    j.shiftId === jadwal.shiftId &&
                    j.hari === jadwal.hari
            );
            if (dosenConflict) {
                addConflict(
                    "Dosen",
                    `Dosen sudah mengajar pada shift dan hari yang sama.`,
                    dosenConflict
                );
            }
        }

        // 4. Mahasiswa-Shift-Day conflict
        if (jadwal.mahasiswaIds && jadwal.mahasiswaIds.length > 0) {
            for (const mahasiswaId of jadwal.mahasiswaIds) {
                const mahasiswaConflict = existingJadwals.find(
                    (j) =>
                        j.mahasiswa.some((m) => m.id === mahasiswaId) &&
                        j.shiftId === jadwal.shiftId &&
                        j.hari === jadwal.hari
                );
                if (mahasiswaConflict) {
                    addConflict(
                        "Mahasiswa",
                        `Mahasiswa sudah memiliki jadwal pada shift dan hari yang sama.`,
                        mahasiswaConflict
                    );
                }
            }
        }

        // 5. Dosen-matakuliah compatibility (bidang minat)
        if (jadwal.dosenIds && jadwal.matakuliahId) {
            const matakuliah = await prisma.matakuliah.findUnique({
                where: { id: jadwal.matakuliahId },
            });
            if (matakuliah) {
                for (const dosenId of jadwal.dosenIds) {
                    const dosen = await prisma.dosen.findUnique({
                        where: { id: dosenId },
                    });
                    if (
                        dosen &&
                        matakuliah.bidangMinat &&
                        dosen.bidangMinat &&
                        !canDosenTeachCourse(
                            dosen.bidangMinat,
                            matakuliah.bidangMinat
                        )
                    ) {
                        addConflict(
                            "Dosen-BidangMinat",
                            `Dosen tidak sesuai bidang minat matakuliah.`,
                            { dosen, matakuliah }
                        );
                    }
                }
            }
        }

        // 6. Mahasiswa-matakuliah compatibility (semester)
        if (jadwal.mahasiswaIds && jadwal.matakuliahId) {
            const matakuliah = await prisma.matakuliah.findUnique({
                where: { id: jadwal.matakuliahId },
            });
            if (matakuliah) {
                for (const mahasiswaId of jadwal.mahasiswaIds) {
                    const mahasiswa = await prisma.mahasiswa.findUnique({
                        where: { id: mahasiswaId },
                    });
                    if (
                        mahasiswa &&
                        matakuliah.semester &&
                        !canStudentTakeCourse(
                            mahasiswa.semester,
                            matakuliah.semester
                        )
                    ) {
                        addConflict(
                            "Mahasiswa-Semester",
                            `Mahasiswa tidak sesuai semester matakuliah.`,
                            { mahasiswa, matakuliah }
                        );
                    }
                }
            }
        }

        return conflict;
    } catch (error) {
        Logger.error(`Has Schedule Conflict error : ${error}`);
    }
}

// Helper functions (should be imported from your utils, but included here for clarity)
function canDosenTeachCourse(dosenBidang: string, mkBidang: string): boolean {
    // Implement your bidang minat compatibility logic here
    return dosenBidang === mkBidang;
}

function canStudentTakeCourse(
    mahasiswaSemester: number,
    mkSemester: number
): boolean {
    // Implement your semester compatibility logic here
    return mahasiswaSemester >= mkSemester;
}

export async function createMeetingDates(jadwalId: string): Promise<string[]> {
    try {
        // Get jadwal info
        const jadwal = await prisma.jadwal.findUnique({
            where: { id: jadwalId },
            select: { hari: true, semester: true, tahun: true },
        });

        if (!jadwal) {
            throw new Error(`Schedule with ID ${jadwalId} not found`);
        }

        // Parse academic year
        const [startYear] = jadwal.tahun.split("/").map(Number);

        // Determine semester start date
        let semesterStartDate: DateTime;
        if (jadwal.semester === SEMESTER.GANJIL) {
            semesterStartDate = DateTime.local(startYear, 9, 1);
        } else {
            semesterStartDate = DateTime.local(startYear, 2, 1);
        }

        // Map HARI to Luxon weekday (Monday=1, Sunday=7)
        const dayMap: Record<HARI, number> = {
            SENIN: 1,
            SELASA: 2,
            RABU: 3,
            KAMIS: 4,
            JUMAT: 5,
            SABTU: 6,
        };

        const targetWeekday = dayMap[jadwal.hari as HARI];
        if (!targetWeekday) {
            throw new Error(`Invalid hari value: ${jadwal.hari}`);
        }

        // Find the first occurrence of the target weekday
        let firstMeeting = semesterStartDate;
        while (firstMeeting.weekday !== targetWeekday) {
            firstMeeting = firstMeeting.plus({ days: 1 });
        }

        // Generate meeting dates
        const meetingDates: string[] = [];
        for (let i = 0; i < 12; i++) {
            meetingDates.push(firstMeeting.plus({ weeks: i }).toISODate()!);
        }

        return meetingDates;
    } catch (error) {
        Logger.error(`Create Meeting for Jadwal : ${error}`);
        return [];
    }
}
