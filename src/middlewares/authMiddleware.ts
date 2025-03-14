import jwt from "jsonwebtoken";
import { response_forbidden, response_internal_server_error, response_unauthorized } from "$utils/response.utils";
import { Context, Next } from "hono";
import { UserJWTDAO } from "$entities/User";
import { prisma } from "$utils/prisma.utils";

export function checkJwt(c: Context, next: Next) {
    const token = c.req.header("Authorization")?.split(" ")[1];
    const JWT_SECRET = process.env.JWT_SECRET ?? "";
    if (!token) {
        return response_unauthorized(c, "Token should be provided");
    }

    try {
        const decodedValue = jwt.verify(token, JWT_SECRET);
        c.set("jwtPayload", decodedValue);
    } catch (err) {
        console.log(err);
        return response_unauthorized(c, (err as Error).message);
    }
    next();
}

export function checkAccess(featureName: string, action: string) {
    return async (c: Context, next: Next) => {
        const user: UserJWTDAO = await c.get("jwtPayload");

        const mappingExist = await prisma.acl.findUnique({
            where: {
                namaFeature_namaAction_userLevelId: {
                    namaAction: action,
                    namaFeature: featureName,
                    userLevelId: user.userLevelId,
                },
            },
        });

        try {
            if (mappingExist) {
                await next();
            } else {
                return response_forbidden(c, "You don't have access to this feature!");
            }
        } catch (err) {
            return response_internal_server_error(c, (err as Error).message);
        }
    };
}
