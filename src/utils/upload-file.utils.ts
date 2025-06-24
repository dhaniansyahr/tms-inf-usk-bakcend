import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import { Context } from "hono";
import path from "path";
import { ulid } from "ulid";

export async function ensureDirectoryExists(dirPath: string): Promise<void> {
        if (!existsSync(dirPath)) {
                await mkdir(dirPath, { recursive: true });
        }
}

// Helper function to get file extension
export function getFileExtension(filename: string): string {
        return path.extname(filename).toLowerCase();
}

// Helper function to generate unique filename
export function generateUniqueFilename(originalName: string): string {
        const ext = getFileExtension(originalName);
        const nameWithoutExt = path.basename(originalName, ext);

        return `${nameWithoutExt}_${ulid()}${ext}`;
}

export function getBaseUrl(c: Context): string {
        const url = new URL(c.req.url);
        return `${url.protocol}//${url.host}`;
}

export function getContentType(ext: string | undefined): string {
        const types: Record<string, string> = {
                pdf: "application/pdf",
                jpg: "image/jpeg",
                jpeg: "image/jpeg",
                png: "image/png",
                gif: "image/gif",
                txt: "text/plain",
                doc: "application/msword",
                docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        };
        return types[ext || ""] || "application/octet-stream";
}
