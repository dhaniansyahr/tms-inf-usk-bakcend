import { Context, TypedResponse } from "hono";
import * as AbsensiService from "$services/AbsensiService";
import {
    handleServiceErrorWithResponse,
    response_success,
} from "$utils/response.utils";
import { UserJWTDAO } from "$entities/User";
import { RecordAttendanceDTO } from "$entities/Absensi";

export async function getTodaySchedule(c: Context): Promise<TypedResponse> {
    const user: UserJWTDAO = c.get("jwtPayload");

    const serviceResponse = await AbsensiService.getTodaySchedule(user);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil mengambil jadwal hari ini!"
    );
}

export async function absent(c: Context): Promise<TypedResponse> {
    const data: RecordAttendanceDTO = await c.req.json();

    const serviceResponse = await AbsensiService.recordAttendance(data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Berhasil melakukan absensi!"
    );
}
