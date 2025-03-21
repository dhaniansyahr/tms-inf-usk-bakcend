import { Prisma, PrismaClient } from "@prisma/client";
import { ulid } from "ulid";
export async function seedAcl(prisma: PrismaClient) {
    const superAdminLevel = await prisma.userLevels.findFirst({
        where: {
            name: "SUPER_ADMIN",
        },
    });

    if (superAdminLevel) {
        const rawRules = {
            userLevelId: superAdminLevel.id,
            permissions: [
                {
                    subject: "USER_MANAGEMENT",
                    action: ["read", "create", "update", "delete"],
                },
                {
                    subject: "ROLE_MANAGEMENT",
                    action: ["read", "create", "update", "delete"],
                },
                {
                    subject: "ACL",
                    action: ["read", "create", "update", "delete"],
                },
                {
                    subject: "RUANGAN_LABORATORIUM",
                    action: ["read", "create", "update", "delete"],
                },
                {
                    subject: "SHIFT",
                    action: ["read", "create", "update", "delete"],
                },
                {
                    subject: "JADWAL",
                    action: ["read", "create", "update", "delete"],
                },
                {
                    subject: "HISTORY_KEPALA_LAB",
                    action: ["read", "create", "update", "delete"],
                },
                {
                    subject: "PENDAFTARAN_ASISTEN_LAB",
                    action: ["read", "create", "update", "delete"],
                },
                {
                    subject: "PENERIMAAN_ASISTEN_LAB",
                    action: ["read", "create", "update", "delete"],
                },
                {
                    subject: "ABSENSI",
                    action: ["read", "create", "update", "delete"],
                },
            ],
        };

        for (const rule of rawRules.permissions) {
            const existingFeature = await prisma.features.findUnique({
                where: {
                    name: rule.subject,
                },
            });

            if (!existingFeature) {
                await prisma.features.create({
                    data: {
                        id: ulid(),
                        name: rule.subject,
                    },
                });
            }

            const actionCreateManyData: Prisma.ActionsCreateManyInput[] = [];
            for (const action of rule.action) {
                const existingFeatureAction = await prisma.actions.findUnique({
                    where: {
                        namaFeature_name: {
                            name: action,
                            namaFeature: rule.subject,
                        },
                    },
                });

                if (!existingFeatureAction) {
                    actionCreateManyData.push({
                        id: ulid(),
                        name: action,
                        namaFeature: rule.subject,
                    });
                }
            }

            await prisma.actions.createMany({
                data: actionCreateManyData,
            });
        }

        const [allSubFeatures, userLevel, superAdmin] = await Promise.all([
            prisma.actions.findMany({
                include: {
                    feature: true,
                },
            }),
            prisma.userLevels.findUnique({
                where: {
                    name: "SUPER_ADMIN",
                },
            }),
            prisma.user.findUnique({
                where: {
                    email: "superadmin@test.com",
                },
            }),
        ]);

        if (!userLevel || !superAdmin) {
            return "seedAcl error";
        }

        if (!superAdmin.userLevelId) {
            await prisma.user.update({
                where: {
                    id: superAdmin.id,
                },
                data: {
                    userLevelId: userLevel.id,
                },
            });
        }

        const aclCreateManyData: Prisma.AclCreateManyInput[] = [];
        for (const action of allSubFeatures) {
            const aclAdminMappingExist = await prisma.acl.findUnique({
                where: {
                    namaFeature_namaAction_userLevelId: {
                        namaFeature: action.feature.name,
                        namaAction: action.name,
                        userLevelId: userLevel.id,
                    },
                },
            });

            if (!aclAdminMappingExist) {
                aclCreateManyData.push({
                    id: ulid(),
                    namaAction: action.name,
                    namaFeature: action.feature.name,
                    userLevelId: userLevel.id,
                });
            }
        }

        await prisma.acl.createMany({
            data: aclCreateManyData,
        });
    }

    console.log("All Acl Seeded");
}
