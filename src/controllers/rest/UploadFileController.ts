import { Context, TypedResponse } from "hono";
import * as UploadService from "$services/UploadFileService";
import { handleServiceErrorWithResponse, response_created } from "$utils/response.utils";
import { UploadDTO } from "$entities/UploadFile";
import { getBaseUrl, getContentType } from "$utils/upload-file.utils";
import { join } from "path";
import { readFile } from "fs/promises";

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

export async function getFile(c: Context): Promise<any> {
        try {
                const filePath = c.req.param("*");
                const fullPath = join(process.cwd(), "files", filePath);

                // Security check - prevent directory traversal
                if (!fullPath.startsWith(join(process.cwd(), "files"))) {
                        return c.text("Forbidden", 403);
                }

                const file = await readFile(fullPath);

                // Set appropriate content type based on file extension
                const ext = filePath.split(".").pop()?.toLowerCase();
                const contentType = getContentType(ext);

                return new Response(file, {
                        headers: {
                                "Content-Type": contentType,
                                "Cache-Control": "public, max-age=31536000",
                        },
                });
        } catch (error) {
                return c.text("File not found", 404);
        }
}
