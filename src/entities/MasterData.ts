import { BIDANG_MINAT, TYPE_MATKUL } from "@prisma/client";

export interface MataKuliahDTO {
    id: string;
    nama: string;
    kode: string;
    type: TYPE_MATKUL;
    sks: number;
    bidangMinat: BIDANG_MINAT;
    isTeori: boolean;
    semester: number;
}

export interface MahasiswaDTO {
    id: string;
    nama: string;
    npm: string;
    semester: number;
    password: string;
    tahunMasuk: string;
    isActive: boolean;
    userLevelId: string;
    createdAt: Date;
    updatedAt: Date;
    asistenLabId?: string;
}

export interface DosenDTO {
    id: string;
    nama: string;
    email: string;
    password: string;
    nip: string;
    bidangMinat: BIDANG_MINAT;
    userLevelId: string;
    createdAt: Date;
    updatedAt: Date;
}
