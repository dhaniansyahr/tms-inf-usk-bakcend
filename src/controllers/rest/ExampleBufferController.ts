import { handleServiceErrorWithResponse, MIME_TYPE, response_buffer } from "$utils/response.utils";
import { Context, TypedResponse } from "hono";
import * as ExampleBufferService from "$services/ExampleBufferService"

export async function getPDF(c:Context):Promise<Response | TypedResponse>{

    const serviceResponse = await ExampleBufferService.getPDF()
    if(!serviceResponse) return handleServiceErrorWithResponse(c, serviceResponse)


    const {buffer, fileName} = serviceResponse.data
    return response_buffer(c, fileName, MIME_TYPE.PDF, buffer)
}