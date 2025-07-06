import { Context, TypedResponse } from "hono";
import * as MeetingService from "$services/MeetingService";
import {
    handleServiceErrorWithResponse,
    response_success,
} from "$utils/response.utils";
import { FilteringQueryV2 } from "$entities/Query";
import { checkFilteringQueryV2 } from "$controllers/helpers/CheckFilteringQuery";
import { UpdateMeetingDTO } from "$entities/Meeting";
import { UserJWTDAO } from "$entities/User";

export async function getAll(c: Context): Promise<TypedResponse> {
    const filters: FilteringQueryV2 = checkFilteringQueryV2(c);
    const jadwalId = c.req.param("jadwalId") as string;

    const serviceResponse = await MeetingService.getAllMeetingsByJadwalId(
        jadwalId,
        filters
    );

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully fetched all Meeting!"
    );
}

export async function getById(c: Context): Promise<TypedResponse> {
    const id = c.req.param("id");

    const serviceResponse = await MeetingService.getMeetingById(id);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully fetched Meeting by id!"
    );
}

export async function update(c: Context): Promise<TypedResponse> {
    const data: UpdateMeetingDTO = await c.req.json();
    const id = c.req.param("id");

    const serviceResponse = await MeetingService.updateMeeting(id, data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully updated Meeting!"
    );
}

export async function getParticipants(c: Context): Promise<TypedResponse> {
    const jadwalId = c.req.param("jadwalId") as string;

    const serviceResponse = await MeetingService.getListParticipantsByJadwalId(
        jadwalId
    );

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully fetched participants with meeting attendance!"
    );
}

export async function getMeetingWhenReady(c: Context): Promise<TypedResponse> {
    const user: UserJWTDAO = c.get("jwtPayload");

    const serviceResponse = await MeetingService.getAbsentWhenTimeIsReady(user);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully fetched participants with meeting attendance!"
    );
}
