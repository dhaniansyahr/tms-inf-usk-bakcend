import { Context, TypedResponse } from "hono";
import * as MeetingService from "$services/MeetingService";
import { handleServiceErrorWithResponse, response_success } from "$utils/response.utils";
import { FilteringQueryV2 } from "$entities/Query";
import { checkFilteringQueryV2 } from "$controllers/helpers/CheckFilteringQuery";
import { UpdateMeetingDTO } from "$entities/Meeting";

export async function getAll(c: Context): Promise<TypedResponse> {
        const filters: FilteringQueryV2 = checkFilteringQueryV2(c);
        const jadwalId = c.req.param("jadwalId") as string;

        const serviceResponse = await MeetingService.getAllMeetingsByJadwalId(jadwalId, filters);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully fetched all Meeting!");
}

export async function getById(c: Context): Promise<TypedResponse> {
        const id = c.req.param("id");

        const serviceResponse = await MeetingService.getMeetingById(id);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully fetched Meeting by id!");
}

export async function update(c: Context): Promise<TypedResponse> {
        const data: UpdateMeetingDTO = await c.req.json();
        const id = c.req.param("id");

        const serviceResponse = await MeetingService.updateMeeting(id, data);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully updated Meeting!");
}
