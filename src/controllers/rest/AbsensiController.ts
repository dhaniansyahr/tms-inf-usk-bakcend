import { Context, TypedResponse } from "hono";
import * as AbsensiService from "$services/AbsensiService";
import {
    handleServiceErrorWithResponse,
    response_created,
} from "$utils/response.utils";
import { AbsentDTO } from "$entities/Absensi";

export async function create(c: Context): Promise<TypedResponse> {
    const data: AbsentDTO = await c.req.json();

    const serviceResponse = await AbsensiService.create(data);

    if (!serviceResponse.status) {
        return handleServiceErrorWithResponse(c, serviceResponse);
    }

    return response_created(
        c,
        serviceResponse.data,
        "Successfully created new Absensi!"
    );
}
