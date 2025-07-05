import { ASISTEN_LAB_STATUS, NILAI_MATAKULIAH } from "@prisma/client";

export interface PendaftaranAsistenLabDTO {
  id: string;
  mahasiswaId: string;
  jadwalId: string;
  nilaiTeori: NILAI_MATAKULIAH;
  nilaiPraktikum: NILAI_MATAKULIAH;
  nilaiAkhir: NILAI_MATAKULIAH;
}

export interface PenerimaanAsistenLabDTO {
  status: ASISTEN_LAB_STATUS;
  keterangan?: string;
}

export interface AssignAsistenLabDTO {
  mahasiswaId: string;
  jadwalId: string;
}
