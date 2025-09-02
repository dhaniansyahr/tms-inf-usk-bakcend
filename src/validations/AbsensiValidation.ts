import { Context, Next } from "hono";
import { RecordAttendanceDTO } from "$entities/Absensi";
import { response_bad_request } from "$utils/response.utils";
import { ErrorStructure, generateErrorStructure } from "./helper";
import { getIdentityType } from "$utils/strings.utils";

export async function validateAbsent(c: Context, next: Next) {
    const data: RecordAttendanceDTO = await c.req.json();
    const invalidFields: ErrorStructure[] = [];

    if (!data.identity)
        invalidFields.push(
            generateErrorStructure("identity", "Identity tidak boleh kosong")
        );
    if (!data.meetingId)
        invalidFields.push(
            generateErrorStructure("meetingId", "Meeting ID tidak boleh kosong")
        );

    const identityType = getIdentityType(data.identity);

    if (identityType !== "NPM" && identityType !== "NIP") {
        invalidFields.push(
            generateErrorStructure(
                "identity",
                "Identity harus berupa NPM atau NIP"
            )
        );
    }

    if (invalidFields.length !== 0)
        return response_bad_request(c, "Validation Error", invalidFields);
    await next();
}
