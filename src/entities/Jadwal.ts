import { HARI } from "$services/JadwalGeneticService";
import { SEMESTER } from "@prisma/client";

export interface JadwalDTO {
    id: string;
    matakuliahId: string;
    dosenIds: string[];
    ruanganId: string;
    shiftId: string;
    hari: HARI;
    kelas?: string;
    asistenLabIds?: string[];
    mahasiswaIds?: string[];
    isOverride?: boolean;
}

export interface CreateJadwalDTO {
    matakuliahId: string;
    dosenIds: string[];
    ruanganId: string;
    shiftId: string;
    hari: HARI;
    semester: SEMESTER;
    tahun: string;
    kelas?: string;
    asistenLabIds?: string[];
    mahasiswaIds?: string[];
    isOverride?: boolean;
}

export interface UpdateMeetingDTO {
    tanggal: string;
    pertemuan: number;
}

export interface AbsentDTO {
    meetingId: string;
    userId: string;
    isPresent: boolean;
}
