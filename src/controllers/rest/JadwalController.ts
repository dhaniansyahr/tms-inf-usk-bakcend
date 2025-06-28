import { Context, TypedResponse } from "hono";
import * as JadwalService from "$services/JadwalService";
import { handleServiceErrorWithResponse, response_created, response_success } from "$utils/response.utils";
import { JadwalDTO } from "$entities/Jadwal";
import { FilteringQueryV2 } from "$entities/Query";
import { checkFilteringQueryV2 } from "$controllers/helpers/CheckFilteringQuery";
import { UserJWTDAO } from "$entities/User";

export async function create(c: Context): Promise<TypedResponse> {
        const data: JadwalDTO = await c.req.json();

        const serviceResponse = await JadwalService.create(data);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_created(c, serviceResponse.data, "Successfully created new Jadwal!");
}

export async function getAll(c: Context): Promise<TypedResponse> {
        const filters: FilteringQueryV2 = checkFilteringQueryV2(c);
        const type = c.req.query("type") as string;
        const user: UserJWTDAO = c.get("jwtPayload");

        const serviceResponse = await JadwalService.getAll(filters, type, user);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully fetched all Jadwal!");
}

export async function getAllMatakuliah(c: Context): Promise<TypedResponse> {
        const filters: FilteringQueryV2 = checkFilteringQueryV2(c);

        const serviceResponse = await JadwalService.getAllMatakuliah(filters);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully fetched all Jadwal!");
}

export async function getById(c: Context): Promise<TypedResponse> {
        const id = c.req.param("id");

        const serviceResponse = await JadwalService.getById(id);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully fetched Jadwal by id!");
}

export async function diagnoseScheduling(c: Context): Promise<TypedResponse> {
        const serviceResponse = await JadwalService.diagnoseScheduling();

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully fetched all Diagnose Jadwal!");
}

export async function update(c: Context): Promise<TypedResponse> {
        const data: JadwalDTO = await c.req.json();
        const id = c.req.param("id");

        const serviceResponse = await JadwalService.update(id, data);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully updated Jadwal!");
}

export async function deleteByIds(c: Context): Promise<TypedResponse> {
        const ids = c.req.query("ids") as string;

        const serviceResponse = await JadwalService.deleteByIds(ids);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully deleted Jadwal!");
}

export async function checkFreeSchedule(c: Context): Promise<TypedResponse> {
        const filters: FilteringQueryV2 = checkFilteringQueryV2(c);
        const day = c.req.query("day");

        const serviceResponse = await JadwalService.getAvailableSchedule(filters, day);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully fetched Jadwal by id!");
}

export async function generateAllAvailableSchedules(c: Context): Promise<TypedResponse> {
        const preferredDay = c.req.query("day") as string;

        const serviceResponse = await JadwalService.generateAllAvailableSchedules(preferredDay);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_success(c, serviceResponse.data, "Successfully generated schedules for all available matakuliah!");
}
