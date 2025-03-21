import {Context, TypedResponse} from "hono"
import * as MahasiswaService from "$services/MahasiswaService"
import { handleServiceErrorWithResponse, response_created, response_success } from "$utils/response.utils"
import { MahasiswaDTO } from "$entities/Mahasiswa"
import { FilteringQueryV2 } from "$entities/Query"
import { checkFilteringQueryV2 } from "$controllers/helpers/CheckFilteringQuery"

export async function create(c:Context): Promise<TypedResponse> {
    const data: MahasiswaDTO = await c.req.json();

    const serviceResponse = await MahasiswaService.create(data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse)
    }

    return response_created(c, serviceResponse.data, "Successfully created new Mahasiswa!");
}

export async function getAll(c:Context): Promise<TypedResponse> {
    const filters: FilteringQueryV2 = checkFilteringQueryV2(c)

    const serviceResponse = await MahasiswaService.getAll(filters)

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse)
    }

    return response_success(c, serviceResponse.data, "Successfully fetched all Mahasiswa!")
}

export async function getById(c:Context): Promise<TypedResponse> {
    const id = c.req.param('id')

    const serviceResponse = await MahasiswaService.getById(id)

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse)
    }

    return response_success(c, serviceResponse.data, "Successfully fetched Mahasiswa by id!")
}

export async function update(c:Context): Promise<TypedResponse> {
    const data: MahasiswaDTO = await c.req.json()
    const id = c.req.param('id')

    const serviceResponse = await MahasiswaService.update(id, data)

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse)
    }

    return response_success(c, serviceResponse.data, "Successfully updated Mahasiswa!")
}

export async function deleteByIds(c:Context): Promise<TypedResponse> {
    const ids = c.req.query('ids') as string

    const serviceResponse = await MahasiswaService.deleteByIds(ids)

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse)
    }

    return response_success(c, serviceResponse.data, "Successfully deleted Mahasiswa!")
}
    