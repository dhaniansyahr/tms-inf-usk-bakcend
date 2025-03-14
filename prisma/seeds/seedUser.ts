import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { ulid } from "ulid";

export async function seedUsers(prisma: PrismaClient) {
    const countUser = await prisma.user.count();

    if (countUser === 0) {
        const laboranLevel = await prisma.userLevels.findFirst({
            where: {
                name: "LABORAN",
            },
        });

        const countLaboran = await prisma.user.count({
            where: {
                userLevelId: laboranLevel?.id,
            },
        });

        if (countLaboran === 0 && laboranLevel) {
            const hashedPassword = await bcrypt.hash("laboran123", 12);

            await prisma.user.create({
                data: {
                    id: ulid(),
                    fullName: "Laboran",
                    email: "laboran@test.com",
                    password: hashedPassword,
                    userLevelId: laboranLevel?.id,
                },
            });

            console.log("Laboran seeded");
        }

        const kelapalabLevel = await prisma.userLevels.findFirst({
            where: {
                name: "KEPALA_LABORATORIUM",
            },
        });

        const countKelapalab = await prisma.user.count({
            where: {
                userLevelId: kelapalabLevel?.id,
            },
        });

        if (countKelapalab === 0 && kelapalabLevel) {
            const hashedPassword = await bcrypt.hash("kelapalab123", 12);

            await prisma.user.create({
                data: {
                    id: ulid(),
                    fullName: "Kepala Laboratorium",
                    email: "kelapalab@test.com",
                    password: hashedPassword,
                    userLevelId: kelapalabLevel?.id,
                },
            });

            console.log("Kepala Laboratorium seeded");
        }

        const dosenLevel = await prisma.userLevels.findFirst({
            where: {
                name: "DOSEN",
            },
        });

        const countDosen = await prisma.dosen.count();

        if (countDosen === 0 && dosenLevel) {
            const hashedPassword = await bcrypt.hash("dosen123", 12);

            const user = await prisma.user.create({
                data: {
                    id: ulid(),
                    fullName: "Dosen",
                    email: "dosen@test.com",
                    password: hashedPassword,
                    userLevelId: dosenLevel?.id,
                },
            });

            await prisma.dosen.create({
                data: {
                    id: ulid(),
                    nama: "Dosen",
                    email: "dosen@test.com",
                    nip: Math.floor(Math.random() * 10000000000000000)
                        .toString()
                        .padStart(16, "0"),
                    userId: user.id,
                },
            });

            console.log("Dosen seeded");
        }

        const mahasiswaLevel = await prisma.userLevels.findFirst({
            where: {
                name: "MAHASISWA",
            },
        });

        const countMahasiswa = await prisma.mahasiswa.count();

        if (countMahasiswa === 0 && mahasiswaLevel) {
            const hashedPassword = await bcrypt.hash("mahasiswa123", 12);

            const user = await prisma.user.create({
                data: {
                    id: ulid(),
                    fullName: "Mahasiswa",
                    email: "mahasiswa@test.com",
                    password: hashedPassword,
                    userLevelId: mahasiswaLevel?.id,
                },
            });

            await prisma.mahasiswa.create({
                data: {
                    id: ulid(),
                    nama: "Mahasiswa",
                    npm: Math.floor(Math.random() * 10000000000000000)
                        .toString()
                        .padStart(13, "0"),
                    semester: 1,
                    isActive: true,
                    userId: user.id,
                },
            });

            console.log("Mahasiswa seeded");
        }

        const operatorKeuanganLevel = await prisma.userLevels.findFirst({
            where: {
                name: "OPERATOR_KEUANGAN",
            },
        });

        const countOperatorKeuangan = await prisma.user.count({
            where: {
                userLevelId: operatorKeuanganLevel?.id,
            },
        });

        if (countOperatorKeuangan === 0 && operatorKeuanganLevel) {
            const hashedPassword = await bcrypt.hash("operatorkeuangan123", 12);

            await prisma.user.create({
                data: {
                    id: ulid(),
                    fullName: "Operator Keuangan",
                    email: "operatorkeuangan@test.com",
                    password: hashedPassword,
                    userLevelId: operatorKeuanganLevel?.id,
                },
            });

            console.log("Operator Keuangan seeded");
        }

        const superAdminLevel = await prisma.userLevels.findFirst({
            where: {
                name: "SUPER_ADMIN",
            },
        });

        const countSuperAdmin = await prisma.user.count({
            where: {
                userLevelId: superAdminLevel?.id,
            },
        });

        if (countSuperAdmin === 0 && superAdminLevel) {
            const hashedPassword = await bcrypt.hash("superadmin123", 12);

            await prisma.user.create({
                data: {
                    id: ulid(),
                    fullName: "Super Admin",
                    email: "superadmin@test.com",
                    password: hashedPassword,
                    userLevelId: superAdminLevel?.id,
                },
            });

            console.log("Super Admin seeded");
        }
    }
}
