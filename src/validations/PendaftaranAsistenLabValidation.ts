import { Context, Next } from "hono";
import { response_bad_request } from "$utils/response.utils";
import { ErrorStructure, generateErrorStructure } from "./helper";

import { PendaftaranAsistenLabDTO, PenerimaanAsistenLabDTO } from "$entities/PendaftaranAsistenLab";
import { prisma } from "$utils/prisma.utils";
import { ASISTEN_LAB_STATUS, NILAI_MATAKULIAH } from "@prisma/client";

export async function validatePendaftaranAsistenLab(c: Context, next: Next) {
        const data: PendaftaranAsistenLabDTO = await c.req.json();
        const invalidFields: ErrorStructure[] = [];

        if (!data.mahasiswaId) invalidFields.push(generateErrorStructure("mahasiswaId", "mahasiswaId tidak boleh kosong"));

        const mahasiswaExist = await prisma.mahasiswa.findUnique({
                where: {
                        id: data.mahasiswaId,
                },
        });

        if (!mahasiswaExist) return invalidFields.push(generateErrorStructure("mahasiswaId", "mahasiswaId tidak ditemukan"));

        if (!data.jadwalId) invalidFields.push(generateErrorStructure("jadwalId", "jadwalId tidak boleh kosong"));

        const jadwalExist = await prisma.jadwal.findUnique({
                where: {
                        id: data.jadwalId,
                },
        });

        if (!jadwalExist) return invalidFields.push(generateErrorStructure("jadwalId", "jadwalId tidak ditemukan"));

        if (!data.nilaiTeori) invalidFields.push(generateErrorStructure("nilaiTeori", "nilaiTeori tidak boleh kosong"));

        if (!data.nilaiPraktikum) invalidFields.push(generateErrorStructure("nilaiPraktikum", "nilaiPraktikum tidak boleh kosong"));

        if (!data.nilaiAkhir) invalidFields.push(generateErrorStructure("nilaiAkhir", "nilaiAkhir tidak boleh kosong"));

        if (!Object.values(NILAI_MATAKULIAH).includes(data.nilaiTeori))
                invalidFields.push(generateErrorStructure("nilaiTeori", "nilaiTeori tidak valid, diharapkan: A, AB, B, BC, C, D, E"));

        if (!Object.values(NILAI_MATAKULIAH).includes(data.nilaiPraktikum))
                invalidFields.push(generateErrorStructure("nilaiPraktikum", "nilaiPraktikum tidak valid, diharapkan: A, AB, B, BC, C, D, E"));

        if (!Object.values(NILAI_MATAKULIAH).includes(data.nilaiAkhir))
                invalidFields.push(generateErrorStructure("nilaiAkhir", "nilaiAkhir tidak valid, diharapkan: A, AB, B, BC, C, D, E"));

        if (invalidFields.length !== 0) return response_bad_request(c, "Validation Error", invalidFields);

        await next();
}

export async function validatePenerimaanAsistenLab(c: Context, next: Next) {
        const data: PenerimaanAsistenLabDTO = await c.req.json();
        const invalidFields: ErrorStructure[] = [];

        if (!data.status) invalidFields.push(generateErrorStructure("status", "status tidak boleh kosong"));

        if (data.status === ASISTEN_LAB_STATUS.DITOLAK && !data.keterangan) invalidFields.push(generateErrorStructure("keterangan", "keterangan tidak boleh kosong"));

        if (data.status !== ASISTEN_LAB_STATUS.DITOLAK && data.status !== ASISTEN_LAB_STATUS.DISETUJUI)
                invalidFields.push(generateErrorStructure("status", "status tidak valid, diharapkan: DISETUJUI, DITOLAK"));

        if (invalidFields.length !== 0) return response_bad_request(c, "Validation Error", invalidFields);

        await next();
}
