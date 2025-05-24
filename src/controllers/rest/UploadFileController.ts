import { Context, TypedResponse } from "hono";
import * as UploadService from "$services/UploadFileService";
import { handleServiceErrorWithResponse, response_created } from "$utils/response.utils";
import { UploadDTO } from "$entities/UploadFile";
import { getBaseUrl } from "$utils/upload-file.utils";

export async function create(c: Context): Promise<TypedResponse> {
        const bodyData = await c.req.parseBody();
        const data: UploadDTO = {
                ...bodyData,
                directory: bodyData.directory as string,
                file: bodyData.file as File,
        };

        const baseUrl = getBaseUrl(c);

        const serviceResponse = await UploadService.create(data, baseUrl);

        if (!serviceResponse.status) {
                return handleServiceErrorWithResponse(c, serviceResponse);
        }

        return response_created(c, serviceResponse.data, "Successfully created new Jadwal!");
}
