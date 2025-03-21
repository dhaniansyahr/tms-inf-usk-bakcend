import { UserLevelsDTO } from "$entities/UserLevels";
import { Context, Next } from "hono";
import { response_bad_request } from "$utils/response.utils";

export async function validateUserLevels(c: Context, next: Next) {
    const data: UserLevelsDTO = await c.req.json();

    const invalidFields = [];
    if (!data.name) invalidFields.push("name is required");

    if (invalidFields.length > 0) {
        return response_bad_request(c, "Bad Request", invalidFields);
    }

    await next();
}
