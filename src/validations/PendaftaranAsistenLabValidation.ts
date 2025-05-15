import { Context, Next } from "hono";
import { response_bad_request } from "$utils/response.utils";
import { ErrorStructure, generateErrorStructure } from "./helper";

import { PendaftaranAsistenLabDTO, PenerimaanAsistenLabDTO } from "$entities/PendaftaranAsistenLab";
import { prisma } from "$utils/prisma.utils";
import { ASISTEN_LAB_STATUS, NILAI_MATAKULIAH } from "@prisma/client";

export async function validatePendaftaranAsistenLab(c: Context, next: Next) {
    const data: PendaftaranAsistenLabDTO = await c.req.json();
    const invalidFields: ErrorStructure[] = [];

    if (!data.mahasiswaId) invalidFields.push(generateErrorStructure("mahasiswaId", "mahasiswaId cannot be empty"));

    const mahasiswaExist = await prisma.mahasiswa.findUnique({
        where: {
            id: data.mahasiswaId,
        },
    });

    if (!mahasiswaExist) return invalidFields.push(generateErrorStructure("mahasiswaId", "mahasiswaId not found"));

    if (!data.matakuliahId) invalidFields.push(generateErrorStructure("matakuliahId", "matakuliahId cannot be empty"));

    const matakuliahExist = await prisma.matakuliah.findUnique({
        where: {
            id: data.matakuliahId,
        },
    });

    if (!matakuliahExist) return invalidFields.push(generateErrorStructure("matakuliahId", "matakuliahId not found"));

    if (!data.nilaiTeori) invalidFields.push(generateErrorStructure("nilaiTeori", "nilaiTeori cannot be empty"));

    if (!data.nilaiPraktikum)
        invalidFields.push(generateErrorStructure("nilaiPraktikum", "nilaiPraktikum cannot be empty"));

    if (!data.nilaiAkhir) invalidFields.push(generateErrorStructure("nilaiAkhir", "nilaiAkhir cannot be empty"));

    if (!Object.values(NILAI_MATAKULIAH).includes(data.nilaiTeori))
        invalidFields.push(
            generateErrorStructure("nilaiTeori", "nilaiTeori is invalid, expected: A, AB, B, BC, C, D, E")
        );

    if (!Object.values(NILAI_MATAKULIAH).includes(data.nilaiPraktikum))
        invalidFields.push(
            generateErrorStructure("nilaiPraktikum", "nilaiPraktikum is invalid, expected: A, AB, B, BC, C, D, E")
        );

    if (!Object.values(NILAI_MATAKULIAH).includes(data.nilaiAkhir))
        invalidFields.push(
            generateErrorStructure("nilaiAkhir", "nilaiAkhir is invalid, expected: A, AB, B, BC, C, D, E")
        );

    if (invalidFields.length !== 0) return response_bad_request(c, "Validation Error", invalidFields);

    await next();
}

export async function validatePenerimaanAsistenLab(c: Context, next: Next) {
    const data: PenerimaanAsistenLabDTO = await c.req.json();
    const invalidFields: ErrorStructure[] = [];

    if (!data.status) invalidFields.push(generateErrorStructure("status", "status cannot be empty"));

    if (data.status === ASISTEN_LAB_STATUS.DITOLAK && !data.keterangan)
        invalidFields.push(generateErrorStructure("keterangan", "keterangan cannot be empty"));

    if (data.status !== ASISTEN_LAB_STATUS.DITOLAK && data.status !== ASISTEN_LAB_STATUS.DISETUJUI)
        invalidFields.push(generateErrorStructure("status", "status is invalid, expected: DISETUJUI, DITOLAK"));

    if (invalidFields.length !== 0) return response_bad_request(c, "Validation Error", invalidFields);

    await next();
}
