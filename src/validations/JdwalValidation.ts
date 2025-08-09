import { JadwalDTO, UpdateMeetingDTO } from "$entities/Jadwal";
import { Context, Next } from "hono";
import { ErrorStructure, generateErrorStructure } from "./helper";
import { response_bad_request } from "$utils/response.utils";
import { prisma } from "$utils/prisma.utils";

export async function validateJadwal(c: Context, next: Next) {
    const data: JadwalDTO = await c.req.json();
    const invalidFields: ErrorStructure[] = [];

    if (!data.matakuliahId)
        invalidFields.push(
            generateErrorStructure(
                "matakuliahId",
                "Matakuliah tidak boleh kosong"
            )
        );

    if (!data.ruanganId)
        invalidFields.push(
            generateErrorStructure("ruanganId", "Ruangan tidak boleh kosong")
        );

    if (!data.shiftId)
        invalidFields.push(
            generateErrorStructure("shiftId", "Shift tidak boleh kosong")
        );

    if (!data.hari)
        invalidFields.push(
            generateErrorStructure("hari", "Hari tidak boleh kosong")
        );
    if (!data.kelas)
        invalidFields.push(
            generateErrorStructure("kelas", "Kelas tidak boleh kosong!")
        );

    const mataKuliahExist = await prisma.matakuliah.findUnique({
        where: {
            id: data.matakuliahId,
        },
    });

    if (!mataKuliahExist)
        invalidFields.push(
            generateErrorStructure(
                "matakuliahId",
                "Mata Kuliah Tidak ditemukan!"
            )
        );
    if (mataKuliahExist?.isTeori)
        invalidFields.push(
            generateErrorStructure(
                "matakuliahId",
                "Pastikan Mata kuliah yang anda masukan adalah matakuliah praktikum!"
            )
        );

    if (invalidFields.length !== 0)
        return response_bad_request(c, "Validation Error", invalidFields);
    await next();
}

export async function validateUpdateMeeting(c: Context, next: Next) {
    const data: UpdateMeetingDTO = await c.req.json();
    const invalidFields: ErrorStructure[] = [];

    if (!data.tanggal)
        invalidFields.push(
            generateErrorStructure("tanggal", "Tanggal tidak boleh kosong")
        );
    if (!data.pertemuan)
        invalidFields.push(
            generateErrorStructure("pertemuan", "Pertemuan tidak boleh kosong")
        );

    if (invalidFields.length !== 0)
        return response_bad_request(c, "Validation Error", invalidFields);
    await next();
}
