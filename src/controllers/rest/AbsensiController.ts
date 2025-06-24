import { Context, TypedResponse } from "hono";
import * as AbsensiService from "$services/AbsensiService";
import { handleServiceErrorWithResponse, response_created, response_success } from "$utils/response.utils";
import { CreateAbsensiDTO, UpdateAbsensiDTO, AbsensiPerMeetingDTO } from "$entities/Absensi";
import { FilteringQueryV2 } from "$entities/Query";
import { checkFilteringQueryV2 } from "$controllers/helpers/CheckFilteringQuery";
import { UserJWTDAO } from "$entities/User";

export async function create(c: Context): Promise<TypedResponse> {
        const data: CreateAbsensiDTO = await c.req.json();
        const user: UserJWTDAO = c.get("jwtPayload");

        const serviceResponse = await AbsensiService.create(data, user);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_created(c, serviceResponse.data, "Successfully created new Absensi!");
}

export async function getAll(c: Context): Promise<TypedResponse> {
        const filters: FilteringQueryV2 = checkFilteringQueryV2(c);

        const serviceResponse = await AbsensiService.getAll(filters);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully fetched all Absensi!");
}

export async function getById(c: Context): Promise<TypedResponse> {
        const id = c.req.param("id");

        const serviceResponse = await AbsensiService.getById(id);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully fetched Absensi by id!");
}

export async function update(c: Context): Promise<TypedResponse> {
        const data: UpdateAbsensiDTO = await c.req.json();
        const id = c.req.param("id");
        const user: UserJWTDAO = c.get("jwtPayload");

        const serviceResponse = await AbsensiService.update(id, data, user);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully updated Absensi!");
}

export async function deleteByIds(c: Context): Promise<TypedResponse> {
        const ids = c.req.query("ids") as string;

        const serviceResponse = await AbsensiService.deleteByIds(ids);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully deleted Absensi!");
}

export async function getByMeetingId(c: Context): Promise<TypedResponse> {
        const meetingId = c.req.param("meetingId");

        const serviceResponse = await AbsensiService.getByMeetingId(meetingId);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully fetched Absensi for meeting!");
}

export async function createBulkAbsensiForMeeting(c: Context): Promise<TypedResponse> {
        const data: AbsensiPerMeetingDTO = await c.req.json();

        const serviceResponse = await AbsensiService.createBulkAbsensiForMeeting(data);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully created/updated bulk attendance for meeting!");
}

export async function getByJadwalId(c: Context): Promise<TypedResponse> {
        const jadwalId = c.req.param("jadwalId");

        const serviceResponse = await AbsensiService.getByJadwalId(jadwalId);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully fetched Absensi for jadwal!");
}

export async function getAbsensiSummary(c: Context): Promise<TypedResponse> {
        const jadwalId = c.req.param("jadwalId");

        const serviceResponse = await AbsensiService.getAbsensiSummary(jadwalId);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully fetched attendance summary!");
}
