import { Context, TypedResponse } from "hono";
import * as JadwalService from "$services/JadwalService";
import {
    handleServiceErrorWithResponse,
    response_created,
    response_success,
} from "$utils/response.utils";
import { AbsentDTO, JadwalDTO, UpdateMeetingDTO } from "$entities/Jadwal";
import { FilteringQueryV2 } from "$entities/Query";
import { checkFilteringQueryV2 } from "$controllers/helpers/CheckFilteringQuery";
import { UserJWTDAO } from "$entities/User";

export async function create(c: Context): Promise<TypedResponse> {
    const data: JadwalDTO = await c.req.json();

    const serviceResponse = await JadwalService.create(data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_created(
        c,
        serviceResponse.data,
        "Successfully created new Jadwal!"
    );
}

export async function getAll(c: Context): Promise<TypedResponse> {
    const filters: FilteringQueryV2 = checkFilteringQueryV2(c);
    const user: UserJWTDAO = c.get("jwtPayload");

    const serviceResponse = await JadwalService.getAll(filters, user);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully fetched all Jadwal!"
    );
}

export async function getById(c: Context): Promise<TypedResponse> {
    const id = c.req.param("id");

    const serviceResponse = await JadwalService.getById(id);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully fetched Jadwal by id!"
    );
}

export async function getAllParticipantsAndMeetingsByJadwalId(
    c: Context
): Promise<TypedResponse> {
    const id = c.req.param("id") as string;

    const serviceResponse =
        await JadwalService.getAllParticipantsAndMeetingsByJadwalId(id);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully fetched participants with meeting attendance!"
    );
}

export async function updateMeeting(c: Context): Promise<TypedResponse> {
    const data: UpdateMeetingDTO = await c.req.json();
    const id = c.req.param("meetingId");

    const serviceResponse = await JadwalService.updateMeeting(id, data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully updated Jadwal!"
    );
}

export async function checkFreeSchedule(c: Context): Promise<TypedResponse> {
    const filters: FilteringQueryV2 = checkFilteringQueryV2(c);
    const day = c.req.query("day");

    const serviceResponse = await JadwalService.getAvailableSchedule(
        filters,
        day
    );

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully fetched Jadwal by id!"
    );
}

export async function generateAllAvailableSchedules(
    c: Context
): Promise<TypedResponse> {
    const preferredDay = c.req.query("day") as string;

    const serviceResponse = await JadwalService.generateAllAvailableSchedules(
        preferredDay
    );

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully generated schedules for all available matakuliah!"
    );
}

export async function getAbsentNow(c: Context): Promise<TypedResponse> {
    const user: UserJWTDAO = c.get("jwtPayload");

    const serviceResponse = await JadwalService.getAbsentNow(user);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully fetched participants with meeting attendance!"
    );
}

export async function getAllScheduleToday(c: Context): Promise<TypedResponse> {
    const user: UserJWTDAO = c.get("jwtPayload");

    const serviceResponse = await JadwalService.getAllScheduleToday(user);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully fetched all schedule today!"
    );
}

export async function absent(c: Context): Promise<TypedResponse> {
    const data: AbsentDTO = await c.req.json();

    const serviceResponse = await JadwalService.absent(data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_created(
        c,
        serviceResponse.data,
        "Successfully absent in this meeting!"
    );
}
