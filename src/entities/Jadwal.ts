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

export interface UpdateJadwalDTO {
    hari: HARI;
    shiftId: string;
}

export interface AbsentDTO {
    meetingId: string;
    userId: string;
    isPresent: boolean;
}

// Excel processing interfaces
export interface JadwalExcelDTO {
    file: File;
}

export interface JadwalExcelRow {
    Kode: string;
    Nama: string;
    Kelas: string;
    "Koordinator Kelas": string;
    Ruang: string;
    Hari: string;
    Waktu: string;
}

export interface JadwalExcelResult {
    totalRows: number;
    processedRows: number;
    successCount: number;
    errorCount: number;
    errors: Array<{
        row: number;
        message: string;
        data?: any;
    }>;
    createdSchedules: Array<{
        matakuliahKode: string;
        matakuliahNama: string;
        dosenNama: string;
        ruanganNama: string;
        shiftTime: string;
        hari: string;
        kelas: string;
    }>;
}
