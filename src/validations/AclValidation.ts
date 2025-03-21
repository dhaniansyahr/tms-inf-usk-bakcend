import { AclDTO } from "$entities/Acl";
import { Context, Next } from "hono";
import { generateErrorStructure } from "./helper";
import { ErrorStructure } from "./helper";
import { response_bad_request } from "$utils/response.utils";
import { prisma } from "$utils/prisma.utils";

export async function validateAclCreate(c: Context, next: Next) {
    const data: AclDTO = await c.req.json();
    const invalidFields: ErrorStructure[] = [];

    if (!data.permissions || data.permissions.length == 0) {
        invalidFields.push(generateErrorStructure("permissions", "permissions cannot be empty"));
    } else {
        let index = 0;
        for (const permission of data.permissions) {
            if (!permission.subject)
                invalidFields.push(generateErrorStructure(`permissions[${index}].subject`, "subject cannot be empty"));
            if (!permission.action || permission.action.length == 0)
                invalidFields.push(generateErrorStructure("actions", "actions cannot be empty"));

            index++;
        }
    }

    if (!data.userLevelId) invalidFields.push(generateErrorStructure("userLevelId", "userLevelId cannot be empty"));

    if (invalidFields.length !== 0) return response_bad_request(c, "Validation Error", invalidFields);

    const userLevel = await prisma.userLevels.findUnique({
        where: {
            id: data.userLevelId,
        },
    });

    if (!userLevel) invalidFields.push(generateErrorStructure("userLevelId", "userLevelId not found"));

    for (const permission of data.permissions) {
        let index = 0;

        for (const action of permission.action) {
            const actionExist = await prisma.actions.findUnique({
                where: {
                    namaFeature_name: {
                        namaFeature: permission.subject,
                        name: action,
                    },
                },
            });

            if (!actionExist)
                invalidFields.push(
                    generateErrorStructure(
                        `permissions[${index}]`,
                        `feature ${permission.subject} and action ${action} not found`
                    )
                );
        }
    }

    if (invalidFields.length !== 0) return response_bad_request(c, "Validation Error", invalidFields);

    await next();
}
