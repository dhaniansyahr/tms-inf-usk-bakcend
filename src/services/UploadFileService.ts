import { INTERNAL_SERVER_ERROR_SERVICE_RESPONSE, ServiceResponse } from "$entities/Service";
import { UploadDTO, UploadResponse } from "$entities/UploadFile";
import Logger from "$pkg/logger";
import { ensureDirectoryExists, generateUniqueFilename } from "$utils/upload-file.utils";
import { writeFile } from "fs/promises";
import path from "path";

export type UploadFileResponse = UploadResponse | {};
export async function create(data: UploadDTO, baseUrl: string): Promise<ServiceResponse<UploadFileResponse>> {
        try {
                const directory = data.directory as string;
                const file = data.file as File;

                // Sanitize directory name (remove dangerous characters)
                const sanitizedDirectory = directory.replace(/[^a-zA-Z0-9_-]/g, "_");

                // Create full directory path
                const baseUploadPath = "files";
                const fullDirectoryPath = path.join(baseUploadPath, sanitizedDirectory);

                // Ensure directory exists
                await ensureDirectoryExists(fullDirectoryPath);

                // Generate unique filename to avoid conflicts
                const uniqueFilename = generateUniqueFilename(file.name);
                const filePath = path.join(fullDirectoryPath, uniqueFilename);

                // Convert file to buffer and save
                const arrayBuffer = await file.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                await writeFile(filePath, uint8Array);

                return {
                        status: true,
                        data: {
                                url: `${baseUrl}/${filePath.replace(/\\/g, "/")}`, // Normalize path separators for URL
                                filename: uniqueFilename,
                                filetype: file.type || "application/octet-stream",
                                size: file.size,
                        },
                };
        } catch (err) {
                Logger.error(`JadwalService.create : ${err}`);
                return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
        }
}
