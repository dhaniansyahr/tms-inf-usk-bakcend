import { checkFilteringQueryV2 } from "$controllers/helpers/CheckFilteringQuery";
import { FilteringQueryV2 } from "$entities/Query";
import * as MasterDataService from "$services/MasterDataService";
import {
    handleServiceErrorWithResponse,
    response_success,
} from "$utils/response.utils";
import { Context, TypedResponse } from "hono";

export async function getAllMahasiswa(c: Context): Promise<TypedResponse> {
    const filters: FilteringQueryV2 = checkFilteringQueryV2(c);

    const serviceResponse = await MasterDataService.getAllMahasiswa(filters);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully fetched all Mahasiswa!"
    );
}

export async function getByIdMahasiswa(c: Context): Promise<TypedResponse> {
    const id = c.req.param("id");

    const serviceResponse = await MasterDataService.getByIdMahasiswa(id);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully fetched Mahasiswa by id!"
    );
}

export async function getAllDosen(c: Context): Promise<TypedResponse> {
    const filters: FilteringQueryV2 = checkFilteringQueryV2(c);

    const serviceResponse = await MasterDataService.getAllDosen(filters);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully fetched all Dosen!"
    );
}

export async function getByIdDosen(c: Context): Promise<TypedResponse> {
    const id = c.req.param("id");

    const serviceResponse = await MasterDataService.getByIdDosen(id);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully fetched Dosen by id!"
    );
}

export async function getAllMatakuliah(c: Context): Promise<TypedResponse> {
    const filters: FilteringQueryV2 = checkFilteringQueryV2(c);

    const serviceResponse = await MasterDataService.getAllMatakuliah(filters);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully fetched all Mata Kuliah!"
    );
}

export async function getByIdMatakuliah(c: Context): Promise<TypedResponse> {
    const id = c.req.param("id");

    const serviceResponse = await MasterDataService.getByIdMatakuliah(id);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_success(
        c,
        serviceResponse.data,
        "Successfully fetched Mata Kuliah by id!"
    );
}
