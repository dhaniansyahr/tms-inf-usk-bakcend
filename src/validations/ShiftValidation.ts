import { Context, Next } from "hono";
import { response_bad_request } from "$utils/response.utils";
import { ErrorStructure, generateErrorStructure } from "./helper";
import { ShiftDTO } from "$entities/Shift";
import { prisma } from "$utils/prisma.utils";

export async function validateShift(c: Context, next: Next) {
        const data: ShiftDTO = await c.req.json();
        const invalidFields: ErrorStructure[] = [];

        if (!data.startTime) invalidFields.push(generateErrorStructure("startTime", "Waktu mulai tidak boleh kosong"));
        if (!data.endTime) invalidFields.push(generateErrorStructure("endTime", "Waktu selesai tidak boleh kosong"));

        if (data.startTime >= data.endTime) invalidFields.push(generateErrorStructure("startTime", "startTime harus sebelum endTime"));

        // check if startTime and endTime is already exist
        const existingShift = await prisma.shift.findFirst({
                where: {
                        startTime: data.startTime,
                        endTime: data.endTime,
                },
        });

        if (existingShift) invalidFields.push(generateErrorStructure("startTime", "Shift pada waktu tersebut sudah ada"));

        if (invalidFields.length !== 0) return response_bad_request(c, "Validation Error", invalidFields);
        await next();
}
