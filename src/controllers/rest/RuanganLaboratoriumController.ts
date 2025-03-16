import { Context, TypedResponse } from "hono";
import * as RuanganLaboratoriumService from "$services/RuanganLaboratoriumService";
import { handleServiceErrorWithResponse, response_created, response_success } from "$utils/response.utils";
import { AssignKepalaLabDTO, RuanganLaboratoriumDTO } from "$entities/RuanganLaboratorium";
import { FilteringQueryV2 } from "$entities/Query";
import { checkFilteringQueryV2 } from "$controllers/helpers/CheckFilteringQuery";

export async function create(c: Context): Promise<TypedResponse> {
    const data: RuanganLaboratoriumDTO = await c.req.json();

    const serviceResponse = await RuanganLaboratoriumService.create(data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_created(c, serviceResponse.data, "Successfully created new RuanganLaboratorium!");
}

export async function getAll(c: Context): Promise<TypedResponse> {
    const filters: FilteringQueryV2 = checkFilteringQueryV2(c);

    const serviceResponse = await RuanganLaboratoriumService.getAll(filters);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(c, serviceResponse.data, "Successfully fetched all RuanganLaboratorium!");
}

export async function getById(c: Context): Promise<TypedResponse> {
    const id = c.req.param("id");

    const serviceResponse = await RuanganLaboratoriumService.getById(id);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(c, serviceResponse.data, "Successfully fetched RuanganLaboratorium by id!");
}

export async function update(c: Context): Promise<TypedResponse> {
    const data: RuanganLaboratoriumDTO = await c.req.json();
    const id = c.req.param("id");

    const serviceResponse = await RuanganLaboratoriumService.update(id, data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(c, serviceResponse.data, "Successfully updated RuanganLaboratorium!");
}

export async function assignKepalaLab(c: Context): Promise<TypedResponse> {
    const data: AssignKepalaLabDTO = await c.req.json();
    const id = c.req.param("id");

    const serviceResponse = await RuanganLaboratoriumService.assignKepalaLab(id, data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(c, serviceResponse.data, "Successfully assigned Kepala Lab!");
}

export async function deleteByIds(c: Context): Promise<TypedResponse> {
    const ids = c.req.query("ids") as string;

    const serviceResponse = await RuanganLaboratoriumService.deleteByIds(ids);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(c, serviceResponse.data, "Successfully deleted RuanganLaboratorium!");
}
