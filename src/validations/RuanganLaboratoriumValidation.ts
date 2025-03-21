import { Context, Next } from "hono";
import { response_bad_request } from "$utils/response.utils";
import { ErrorStructure, generateErrorStructure } from "./helper";
import { AssignKepalaLabDTO, RuanganLaboratoriumDTO } from "$entities/RuanganLaboratorium";

export async function validateRuanganLaboratoriumDTO(c: Context, next: Next) {
    const data: RuanganLaboratoriumDTO = await c.req.json();
    const invalidFields: ErrorStructure[] = [];

    if (!data.nama) invalidFields.push(generateErrorStructure("nama", "nama cannot be empty"));
    if (!data.lokasi) invalidFields.push(generateErrorStructure("lokasi", "lokasi cannot be empty"));

    if (invalidFields.length !== 0) return response_bad_request(c, "Validation Error", invalidFields);
    await next();
}

export async function validateAssignKepalaLabDTO(c: Context, next: Next) {
    const data: AssignKepalaLabDTO = await c.req.json();
    const invalidFields: ErrorStructure[] = [];

    if (!data.nama) invalidFields.push(generateErrorStructure("nama", "namaKepalaLab cannot be empty"));
    if (!data.nip) invalidFields.push(generateErrorStructure("nip", "nipKepalaLab cannot be empty"));

    const isNIP = /^\d{16}$/i.test(data.nip);
    if (!isNIP) invalidFields.push(generateErrorStructure("nip", "nipKepalaLab must be 16 digits"));

    if (invalidFields.length !== 0) return response_bad_request(c, "Validation Error", invalidFields);
    await next();
}
