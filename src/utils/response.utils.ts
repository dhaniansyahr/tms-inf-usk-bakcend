import { ServiceResponse } from "$entities/Service";
import { HttpStatusCode } from "axios";
import { Context } from "hono";
import { TypedResponse } from "hono/types";
import { StatusCode } from "hono/utils/http-status";

export const MIME_TYPE = {
        PDF: "application/pdf",
        XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

const MIME_TYPE_EXTENSION: Record<string, string> = {
        "application/pdf": "pdf",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};
/**
 * Base of response handler
 * Note: `should not be used in controller`
 * @param c context object from Hono
 * @param status  - status code of a response
 * @param content - the response data
 * @param message - description of a response
 * @param errors  - list of errors if any
 * @returns response
 */
export const response_handler = (c: Context, status: StatusCode, content: unknown = null, message = "", errors: Array<string> = []): TypedResponse => {
        c.status(status);
        return c.json({ content, message, errors });
};

/**
 * Bad Request :
 * The server could not understand the request due to invalid syntax
 * @param c context object from Hono
 * @param message description
 * @param errors list of errors
 */
export const response_bad_request = (c: Context, message = "Bad Request", errors: Array<any> = []): TypedResponse => {
        return response_handler(c, 400, undefined, message, errors);
};

/**
 * Unauthorized :
 * The client must authenticate itself to get the requested response
 * @param c context object from Hono
 * @param message description
 * @param errors list of errors
 */
export const response_unauthorized = (c: Context, message = "Unauthorized", errors: Array<string> = []): TypedResponse => {
        return response_handler(c, 401, undefined, message, errors);
};

/**
 * Forbidden :
 * The client does not have access rights to the content
 * @param c context object from Hono
 * @param message description
 * @param errors list of errors
 */
export const response_forbidden = (c: Context, message = "Forbidden", errors: Array<string> = []): TypedResponse => {
        return response_handler(c, 403, undefined, message, errors);
};

/**
 * Not Found
 * The server can not find the requested resource
 * @param c context object from Hono
 * @param message description
 * @param errors list of errors
 */
export const response_not_found = (c: Context, message = "Not Found", errors: Array<string> = []): TypedResponse => {
        return response_handler(c, 404, undefined, message, errors);
};

/**
 * Conflict
 * This response is sent when a request conflicts with the current state of the server
 * @param c context object from Hono
 * @param message description
 * @param errors list of errors
 */
export const response_conflict = (c: Context, message = "Conflict", errors: Array<string> = []): TypedResponse => {
        return response_handler(c, 409, undefined, message, errors);
};

/**
 * Unprocessable Entity
 * The request was well-formed but was unable to be followed due to semantic errors
 * @param c context object from Hono
 * @param message description
 * @param errors list of errors
 */
export const response_unprocessable_entity = (c: Context, message = "Unprocessable Entity", errors: Array<string> = []): TypedResponse => {
        return response_handler(c, 422, undefined, message, errors);
};

/**
 * Internal Server Error
 * The server encountered an unexpected condition that prevented it from fulfilling the request
 * @param c context object from Hono
 * @param message description
 * @param errors list of errors
 */
export const response_internal_server_error = (c: Context, message = "Internal Server Error", errors: Array<string> = []): TypedResponse => {
        return response_handler(c, 500, undefined, message, errors);
};

/**
 * Ok
 * The request has succeeded
 * @param c context object from Hono
 * @param content response data
 * @param message description
 */
export const response_success = (c: Context, content: unknown = null, message = "Success"): TypedResponse => {
        return response_handler(c, 200, content, message, undefined);
};

/**
 * Created
 * The request has succeeded and a new resource has been created as a result
 * @param c context object from Hono
 * @param content response data
 * @param message description
 */
export const response_created = (c: Context, content: unknown = null, message = "Created"): TypedResponse => {
        return response_handler(c, 201, content, message, undefined);
};

/**
 * Buffer
 * The request has succeeded and a new resource has been created as a result
 * @param c context object from Hono
 * @param fileName name of the file
 * @param mimeType mime type of the file, can be acquired from MIME_TYPE const
 * @param buffer Buffer that will sent to client-side
 */
export const response_buffer = (c: Context, fileName: string, mimeType: string, buffer: Buffer): Response => {
        const extension = MIME_TYPE_EXTENSION[mimeType];
        c.header("Access-Control-Expose-Headers", "content-disposition");
        c.header("content-disposition", `attachment; filename=${fileName}.${extension}`);
        c.header("Content-Type", mimeType);

        return c.body(buffer, HttpStatusCode.Ok);
};

export const handleServiceErrorWithResponse = (c: Context, serviceResponse: ServiceResponse<any>): TypedResponse => {
        switch (serviceResponse.err?.code) {
                case 400:
                        return response_bad_request(c, serviceResponse.err?.message);
                case 404:
                        return response_not_found(c, serviceResponse.err?.message);
                case 401:
                        return response_unauthorized(c, serviceResponse.err?.message);
                case 409:
                        return response_conflict(c, serviceResponse.err.message);
                default:
                        return response_internal_server_error(c, serviceResponse.err?.message);
        }
};
