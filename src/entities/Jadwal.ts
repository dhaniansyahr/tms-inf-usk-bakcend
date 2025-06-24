import { HARI } from "$services/JadwalGeneticService";
import { SEMESTER } from "@prisma/client";

export interface JadwalDTO {
        id: string;
        matakuliahId: string;
        dosenIds: string[];
        ruanganId: string;
        shiftId: string;
        hari: HARI;
        semester: SEMESTER;
        tahun: string;
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
        asistenLabIds?: string[];
        mahasiswaIds?: string[];
        isOverride?: boolean;
}

export interface UpdateJadwalDTO {
        matakuliahId?: string;
        dosenIds?: string[];
        ruanganId?: string;
        shiftId?: string;
        hari?: HARI;
        semester?: SEMESTER;
        tahun?: string;
        asistenLabIds?: string[];
        mahasiswaIds?: string[];
        isOverride?: boolean;
}
