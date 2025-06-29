import { JadwalDTO } from "$entities/Jadwal";
import { Context, Next } from "hono";
import { ErrorStructure, generateErrorStructure } from "./helper";
import { response_bad_request } from "$utils/response.utils";

export async function validateJadwal(c: Context, next: Next) {
        const data: JadwalDTO = await c.req.json();
        const invalidFields: ErrorStructure[] = [];

        if (!data.matakuliahId) invalidFields.push(generateErrorStructure("matakuliahId", "Matakuliah tidak boleh kosong"));
        if (!data.ruanganId) invalidFields.push(generateErrorStructure("ruanganId", "Ruangan tidak boleh kosong"));
        if (!data.shiftId) invalidFields.push(generateErrorStructure("shiftId", "Shift tidak boleh kosong"));
        if (!data.hari) invalidFields.push(generateErrorStructure("hari", "Hari tidak boleh kosong"));

        if (invalidFields.length !== 0) return response_bad_request(c, "Validation Error", invalidFields);
        await next();
}
