import {
    INTERNAL_SERVER_ERROR_SERVICE_RESPONSE,
    INVALID_ID_SERVICE_RESPONSE,
    ServiceResponse,
} from "$entities/Service";
import Logger from "$pkg/logger";
import { prisma } from "$utils/prisma.utils";
import { Acl, Prisma } from "@prisma/client";
import { AclDTO } from "$entities/Acl";
import { ulid } from "ulid";

export type CreateResponse = Acl | {};
export async function create(data: AclDTO): Promise<ServiceResponse<CreateResponse>> {
    try {
        const aclCreateManyInputData: Prisma.AclCreateManyInput[] = [];

        for (const permission of data.permissions) {
            for (const action of permission.action) {
                aclCreateManyInputData.push({
                    id: ulid(),
                    namaAction: action,
                    namaFeature: permission.subject,
                    userLevelId: data.userLevelId,
                });
            }
        }

        await prisma.$transaction([
            prisma.acl.deleteMany({
                where: {
                    userLevelId: data.userLevelId,
                },
            }),
            prisma.acl.createMany({
                data: aclCreateManyInputData,
            }),
        ]);

        return {
            status: true,
            data: aclCreateManyInputData,
        };
    } catch (err) {
        Logger.error(`AclService.create : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function getAclByUserLevelId(userLevelId: string): Promise<ServiceResponse<{}>> {
    try {
        const acl = await prisma.acl.findMany({
            where: {
                userLevelId,
            },
        });

        if (!acl) return INVALID_ID_SERVICE_RESPONSE;

        const formattedAcl = acl.reduce((acc: any, current: any) => {
            const existingSubject = acc.find((item: any) => item.subject === current.namaFeature);
            if (!existingSubject) {
                return acc.concat([{ subject: current.namaFeature, actions: [current.namaAction] }]);
            } else {
                existingSubject.actions.push(current.namaAction);
                return acc;
            }
        }, []);

        return {
            status: true,
            data: {
                userLevelId,
                permissions: formattedAcl,
            },
        };
    } catch (err) {
        Logger.error(`AclService.getAclByUserLevelId : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function getAllFeatures(): Promise<ServiceResponse<{}>> {
    try {
        const features = await prisma.features.findMany({
            include: {
                actions: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        return {
            status: true,
            data: features,
        };
    } catch (err) {
        Logger.error(`AclService.getAllFeatures : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}
