import { HARI } from "$services/JadwalGeneticService";
import { SEMESTER } from "@prisma/client";

export interface JadwalDTO {
        id: string;
        matakuliahId: string;
        dosenId: string;
        ruanganId: string;
        shiftId: string;
        hari: HARI;
        semester: SEMESTER;
        tahun: string;
        asistenLabId?: string;
        mahasiswaId?: string;
        isOverride?: boolean;
}
