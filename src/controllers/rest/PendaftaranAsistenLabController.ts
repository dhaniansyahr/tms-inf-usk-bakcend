import { Context, TypedResponse } from "hono";
import * as PendaftaranAsistenLabService from "$services/PendaftaranAsistenLabService";
import { handleServiceErrorWithResponse, response_created, response_success } from "$utils/response.utils";
import { PendaftaranAsistenLabDTO, PenerimaanAsistenLabDTO } from "$entities/PendaftaranAsistenLab";
import { FilteringQueryV2 } from "$entities/Query";
import { checkFilteringQueryV2 } from "$controllers/helpers/CheckFilteringQuery";

export async function create(c: Context): Promise<TypedResponse> {
    const data: PendaftaranAsistenLabDTO = await c.req.json();

    const serviceResponse = await PendaftaranAsistenLabService.create(data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_created(c, serviceResponse.data, "Successfully created new PendaftaranAsistenLab!");
}

export async function getAll(c: Context): Promise<TypedResponse> {
    const filters: FilteringQueryV2 = checkFilteringQueryV2(c);

    const serviceResponse = await PendaftaranAsistenLabService.getAll(filters);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(c, serviceResponse.data, "Successfully fetched all PendaftaranAsistenLab!");
}

export async function getById(c: Context): Promise<TypedResponse> {
    const id = c.req.param("id");

    const serviceResponse = await PendaftaranAsistenLabService.getById(id);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(c, serviceResponse.data, "Successfully fetched PendaftaranAsistenLab by id!");
}

export async function update(c: Context): Promise<TypedResponse> {
    const data: PendaftaranAsistenLabDTO = await c.req.json();
    const id = c.req.param("id");

    const serviceResponse = await PendaftaranAsistenLabService.update(id, data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(c, serviceResponse.data, "Successfully updated PendaftaranAsistenLab!");
}

export async function deleteByIds(c: Context): Promise<TypedResponse> {
    const ids = c.req.query("ids") as string;

    const serviceResponse = await PendaftaranAsistenLabService.deleteByIds(ids);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(c, serviceResponse.data, "Successfully deleted PendaftaranAsistenLab!");
}

export async function penerimaanAsistenLab(c: Context): Promise<TypedResponse> {
    const data: PenerimaanAsistenLabDTO = await c.req.json();
    const id = c.req.param("id");

    const serviceResponse = await PendaftaranAsistenLabService.penerimaanAsistenLab(id, data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(c, serviceResponse.data, "Successfully updated PendaftaranAsistenLab!");
}
