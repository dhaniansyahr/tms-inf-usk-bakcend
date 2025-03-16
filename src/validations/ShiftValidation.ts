import { Context, Next } from "hono";
import { response_bad_request } from "$utils/response.utils";
import { ErrorStructure, generateErrorStructure } from "./helper";
import { ShiftDTO } from "$entities/Shift";

export async function validateShift(c: Context, next: Next) {
    const data: ShiftDTO = await c.req.json();
    const invalidFields: ErrorStructure[] = [];

    if (!data.startTime) invalidFields.push(generateErrorStructure("startTime", "startTime cannot be empty"));
    if (!data.endTime) invalidFields.push(generateErrorStructure("endTime", "endTime cannot be empty"));

    if (invalidFields.length !== 0) return response_bad_request(c, "Validation Error", invalidFields);
    await next();
}
