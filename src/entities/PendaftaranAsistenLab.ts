import { ASISTEN_LAB_STATUS, NILAI_MATAKULIAH } from "@prisma/client";

export interface PendaftaranAsistenLabDTO {
    id: string;
    mahasiswaId: string;
    matakuliahId: string;
    nilaiTeori: NILAI_MATAKULIAH;
    nilaiPraktikum: NILAI_MATAKULIAH;
    nilaiAkhir: NILAI_MATAKULIAH;
}

export interface PenerimaanAsistenLabDTO {
    status: ASISTEN_LAB_STATUS;
    keterangan?: string;
}
