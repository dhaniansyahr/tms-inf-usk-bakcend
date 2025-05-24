export interface UploadResponse {
        url: string;
        filename: string;
        filetype: string;
        size: number;
}

export interface UploadDTO {
        directory: string;
        file: File;
}
