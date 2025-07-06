import { Prisma, PrismaClient } from "@prisma/client";
import { ulid } from "ulid";

export async function seedAcl(prisma: PrismaClient) {
    // Get all required user levels
    const [superAdminLevel, dosenLevel, mahasiswaLevel] = await Promise.all([
        prisma.userLevels.findFirst({ where: { name: "SUPER_ADMIN" } }),
        prisma.userLevels.findFirst({ where: { name: "DOSEN" } }),
        prisma.userLevels.findFirst({ where: { name: "MAHASISWA" } }),
    ]);

    if (!superAdminLevel || !dosenLevel || !mahasiswaLevel) {
        console.log("Required user levels not found, skipping ACL seeding");
        return;
    }

    const userLevelPermissions = [
        {
            userLevelId: superAdminLevel.id,
            permissions: [
                {
                    subject: "DASHBOARD",
                    action: ["read"],
                },
                {
                    subject: "MASTER_DATA",
                    action: ["read", "create", "update", "delete"],
                },
                {
                    subject: "ROLE_MANAGEMENT",
                    action: ["read", "create", "update", "delete"],
                },
                {
                    subject: "RUANGAN",
                    action: ["read", "create", "update", "delete"],
                },
                {
                    subject: "SHIFT",
                    action: ["read", "create", "update", "delete"],
                },
                {
                    subject: "JADWAL",
                    action: ["read", "create", "update", "delete", "generate"],
                },
                {
                    subject: "HISTORY_KEPALA_LAB",
                    action: ["create", "update"],
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
                {
                    subject: "MEETING",
                    action: ["read", "create", "update", "delete"],
                },
                {
                    subject: "MAHASISWA",
                    action: ["read", "create", "update", "delete"],
                },
                {
                    subject: "DOSEN",
                    action: ["read", "create", "update", "delete"],
                },
            ],
        },
        {
            userLevelId: dosenLevel.id,
            permissions: [
                {
                    subject: "DASHBOARD",
                    action: ["read"],
                },
                {
                    subject: "JADWAL",
                    action: ["read"],
                },
                {
                    subject: "ABSENSI",
                    action: ["read", "create", "update"],
                },
                {
                    subject: "MEETING",
                    action: ["read", "create", "update"],
                },
                {
                    subject: "MAHASISWA",
                    action: ["read"],
                },
                {
                    subject: "PENDAFTARAN_ASISTEN_LAB",
                    action: ["read"],
                },
                {
                    subject: "PENERIMAAN_ASISTEN_LAB",
                    action: ["read", "update"],
                },
                {
                    subject: "DOSEN",
                    action: ["read", "update"],
                },
            ],
        },
        {
            userLevelId: mahasiswaLevel.id,
            permissions: [
                {
                    subject: "DASHBOARD",
                    action: ["read"],
                },
                {
                    subject: "JADWAL",
                    action: ["read"],
                },
                {
                    subject: "ABSENSI",
                    action: ["read", "create"],
                },
                {
                    subject: "MEETING",
                    action: ["read"],
                },
                {
                    subject: "PENDAFTARAN_ASISTEN_LAB",
                    action: ["read", "create"],
                },
                {
                    subject: "MAHASISWA",
                    action: ["read", "update"],
                },
            ],
        },
    ];

    try {
        // Get all existing features and actions in one go to minimize queries
        const [existingFeatures, existingActions, superAdmin] =
            await Promise.all([
                prisma.features.findMany({
                    select: { name: true },
                }),
                prisma.actions.findMany({
                    select: { name: true, namaFeature: true },
                }),
                prisma.user.findUnique({
                    where: { email: "superadmin@usk.ac.id" },
                    select: { id: true, userLevelId: true },
                }),
            ]);

        // Create sets for faster lookup
        const existingFeatureNames = new Set(
            existingFeatures.map((f) => f.name)
        );
        const existingActionKeys = new Set(
            existingActions.map((a) => `${a.namaFeature}:${a.name}`)
        );

        // Prepare bulk data for features and actions
        const featuresToCreate: Prisma.FeaturesCreateManyInput[] = [];
        const actionsToCreate: Prisma.ActionsCreateManyInput[] = [];

        // Process all permissions for all user levels
        for (const userLevelPermission of userLevelPermissions) {
            for (const rule of userLevelPermission.permissions) {
                // Add feature if it doesn't exist
                if (!existingFeatureNames.has(rule.subject)) {
                    featuresToCreate.push({
                        id: ulid(),
                        name: rule.subject,
                    });
                    existingFeatureNames.add(rule.subject); // Add to set to avoid duplicates
                }

                // Add actions if they don't exist
                for (const action of rule.action) {
                    const actionKey = `${rule.subject}:${action}`;
                    if (!existingActionKeys.has(actionKey)) {
                        actionsToCreate.push({
                            id: ulid(),
                            name: action,
                            namaFeature: rule.subject,
                        });
                        existingActionKeys.add(actionKey); // Add to set to avoid duplicates
                    }
                }
            }
        }

        // Bulk create features and actions
        const createPromises: Promise<any>[] = [];

        if (featuresToCreate.length > 0) {
            createPromises.push(
                prisma.features.createMany({
                    data: featuresToCreate,
                    skipDuplicates: true,
                })
            );
        }

        if (actionsToCreate.length > 0) {
            createPromises.push(
                prisma.actions.createMany({
                    data: actionsToCreate,
                    skipDuplicates: true,
                })
            );
        }

        // Update super admin user level if needed
        if (superAdmin && !superAdmin.userLevelId) {
            createPromises.push(
                prisma.user.update({
                    where: { id: superAdmin.id },
                    data: { userLevelId: superAdminLevel.id },
                })
            );
        }

        // Execute all creation operations in parallel
        await Promise.all(createPromises);

        // Get existing ACL mappings for all user levels to avoid duplicates
        const existingAcls = await prisma.acl.findMany({
            where: {
                userLevelId: {
                    in: [superAdminLevel.id, dosenLevel.id, mahasiswaLevel.id],
                },
            },
            select: { namaFeature: true, namaAction: true, userLevelId: true },
        });

        const existingAclKeys = new Set(
            existingAcls.map(
                (acl) =>
                    `${acl.userLevelId}:${acl.namaFeature}:${acl.namaAction}`
            )
        );

        // Prepare ACL data for bulk creation
        const aclCreateManyData: Prisma.AclCreateManyInput[] = [];

        for (const userLevelPermission of userLevelPermissions) {
            for (const rule of userLevelPermission.permissions) {
                for (const action of rule.action) {
                    const aclKey = `${userLevelPermission.userLevelId}:${rule.subject}:${action}`;
                    if (!existingAclKeys.has(aclKey)) {
                        aclCreateManyData.push({
                            id: ulid(),
                            namaAction: action,
                            namaFeature: rule.subject,
                            userLevelId: userLevelPermission.userLevelId,
                        });
                    }
                }
            }
        }

        // Bulk create ACL mappings
        if (aclCreateManyData.length > 0) {
            await prisma.acl.createMany({
                data: aclCreateManyData,
                skipDuplicates: true,
            });
        }

        console.log(`ACL Seeding completed successfully:`);
        console.log(`- Features created: ${featuresToCreate.length}`);
        console.log(`- Actions created: ${actionsToCreate.length}`);
        console.log(`- ACL mappings created: ${aclCreateManyData.length}`);
        console.log(`- User levels configured: SUPER_ADMIN, DOSEN, MAHASISWA`);
    } catch (error) {
        console.error("Error seeding ACL:", error);
        throw error;
    }
}
