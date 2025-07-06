import {
    BadRequestWithMessage,
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
export async function create(
    data: AclDTO
): Promise<ServiceResponse<CreateResponse>> {
    try {
        // Create or find user level first
        let userLevel = await prisma.userLevels.findFirst({
            where: {
                name: data.roleName,
            },
        });

        if (!userLevel) {
            userLevel = await prisma.userLevels.create({
                data: {
                    id: ulid(),
                    name: data.roleName,
                },
            });
        }

        const aclCreateManyInputData: Prisma.AclCreateManyInput[] = [];

        for (const permission of data.permissions) {
            for (const action of permission.action) {
                aclCreateManyInputData.push({
                    id: ulid(),
                    namaAction: action,
                    namaFeature: permission.subject,
                    userLevelId: userLevel.id,
                });
            }
        }

        await prisma.$transaction([
            prisma.acl.deleteMany({
                where: {
                    userLevelId: userLevel.id,
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

export async function getAclByUserLevelId(
    userLevelId: string
): Promise<ServiceResponse<{}>> {
    try {
        const acl = await prisma.acl.findMany({
            where: {
                userLevelId,
            },
        });

        if (!acl) return INVALID_ID_SERVICE_RESPONSE;

        const formattedAcl = acl.reduce((acc: any, current: any) => {
            if (!acc[current.namaFeature]) {
                acc[current.namaFeature] = {};
            }
            acc[current.namaFeature][current.namaAction] = true;
            return acc;
        }, {});

        return {
            status: true,
            data: formattedAcl,
        };
    } catch (err) {
        Logger.error(`AclService.getAclByUserLevelId : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function update(
    data: AclDTO
): Promise<ServiceResponse<CreateResponse>> {
    try {
        // Validate that the user level exists
        const userLevel = await prisma.userLevels.findFirst({
            where: { name: data.roleName },
        });

        if (!userLevel) return BadRequestWithMessage("Role tidak ditemukan!");

        // Get existing ACL permissions for comparison
        const existingAcls = await prisma.acl.findMany({
            where: { userLevelId: userLevel.id },
            select: { namaFeature: true, namaAction: true },
        });

        const existingPermissionKeys = new Set(
            existingAcls.map((acl) => `${acl.namaFeature}:${acl.namaAction}`)
        );

        // Prepare new permissions data
        const newAclData: Prisma.AclCreateManyInput[] = [];
        const newPermissionKeys = new Set<string>();

        for (const permission of data.permissions) {
            for (const action of permission.action) {
                const permissionKey = `${permission.subject}:${action}`;
                newPermissionKeys.add(permissionKey);

                // Only add if it doesn't already exist
                if (!existingPermissionKeys.has(permissionKey)) {
                    newAclData.push({
                        id: ulid(),
                        namaAction: action,
                        namaFeature: permission.subject,
                        userLevelId: userLevel.id,
                    });
                }
            }
        }

        // Find permissions to remove (exist in DB but not in new data)
        const permissionsToRemove = existingAcls.filter(
            (acl) =>
                !newPermissionKeys.has(`${acl.namaFeature}:${acl.namaAction}`)
        );

        // Execute update in transaction
        const transactionOperations: any[] = [];

        // Remove permissions that are no longer needed
        if (permissionsToRemove.length > 0) {
            transactionOperations.push(
                prisma.acl.deleteMany({
                    where: {
                        userLevelId: userLevel.id,
                        OR: permissionsToRemove.map((perm) => ({
                            namaFeature: perm.namaFeature,
                            namaAction: perm.namaAction,
                        })),
                    },
                })
            );
        }

        // Add new permissions
        if (newAclData.length > 0) {
            transactionOperations.push(
                prisma.acl.createMany({
                    data: newAclData,
                    skipDuplicates: true,
                })
            );
        }

        // Execute transaction only if there are operations to perform
        if (transactionOperations.length > 0) {
            await prisma.$transaction(transactionOperations);
        }

        // Get updated ACL data to return
        const updatedAcls = await prisma.acl.findMany({
            where: { userLevelId: userLevel.id },
        });

        return {
            status: true,
            data: {
                userLevelId: userLevel.id,
                permissionsAdded: newAclData.length,
                permissionsRemoved: permissionsToRemove.length,
                totalPermissions: updatedAcls.length,
                updatedAcls,
            },
        };
    } catch (err) {
        Logger.error(`AclService.update : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function addPermissions(
    userLevelId: string,
    permissions: { subject: string; action: string[] }[]
): Promise<ServiceResponse<{}>> {
    try {
        // Validate that the user level exists
        const userLevel = await prisma.userLevels.findUnique({
            where: { id: userLevelId },
        });

        if (!userLevel) {
            return {
                status: false,
                err: {
                    message: "User level not found",
                    code: 404,
                },
                data: {},
            };
        }

        // Get existing permissions to avoid duplicates
        const existingAcls = await prisma.acl.findMany({
            where: { userLevelId },
            select: { namaFeature: true, namaAction: true },
        });

        const existingPermissionKeys = new Set(
            existingAcls.map((acl) => `${acl.namaFeature}:${acl.namaAction}`)
        );

        // Prepare new permissions data
        const newAclData: Prisma.AclCreateManyInput[] = [];

        for (const permission of permissions) {
            for (const action of permission.action) {
                const permissionKey = `${permission.subject}:${action}`;

                // Only add if it doesn't already exist
                if (!existingPermissionKeys.has(permissionKey)) {
                    newAclData.push({
                        id: ulid(),
                        namaAction: action,
                        namaFeature: permission.subject,
                        userLevelId,
                    });
                }
            }
        }

        if (newAclData.length > 0) {
            await prisma.acl.createMany({
                data: newAclData,
                skipDuplicates: true,
            });
        }

        return {
            status: true,
            data: {
                userLevelId,
                permissionsAdded: newAclData.length,
                message: `Successfully added ${newAclData.length} new permissions`,
            },
        };
    } catch (err) {
        Logger.error(`AclService.addPermissions : ${err}`);
        return INTERNAL_SERVER_ERROR_SERVICE_RESPONSE;
    }
}

export async function removePermissions(
    userLevelId: string,
    permissions: { subject: string; action: string[] }[]
): Promise<ServiceResponse<{}>> {
    try {
        // Validate that the user level exists
        const userLevel = await prisma.userLevels.findUnique({
            where: { id: userLevelId },
        });

        if (!userLevel) {
            return {
                status: false,
                err: {
                    message: "User level not found",
                    code: 404,
                },
                data: {},
            };
        }

        // Prepare conditions for permissions to remove
        const removeConditions: { namaFeature: string; namaAction: string }[] =
            [];

        for (const permission of permissions) {
            for (const action of permission.action) {
                removeConditions.push({
                    namaFeature: permission.subject,
                    namaAction: action,
                });
            }
        }

        if (removeConditions.length > 0) {
            const deleteResult = await prisma.acl.deleteMany({
                where: {
                    userLevelId,
                    OR: removeConditions,
                },
            });

            return {
                status: true,
                data: {
                    userLevelId,
                    permissionsRemoved: deleteResult.count,
                    message: `Successfully removed ${deleteResult.count} permissions`,
                },
            };
        }

        return {
            status: true,
            data: {
                userLevelId,
                permissionsRemoved: 0,
                message: "No permissions to remove",
            },
        };
    } catch (err) {
        Logger.error(`AclService.removePermissions : ${err}`);
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
