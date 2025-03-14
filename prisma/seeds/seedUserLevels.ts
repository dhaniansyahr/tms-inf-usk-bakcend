import { PrismaClient } from "@prisma/client";
import { ulid } from "ulid";

export async function seedUserLevels(prisma: PrismaClient) {
    const countUserLevels = await prisma.userLevels.count();

    const userLevelAkses = [
        "LABORAN",
        "KEPALA_LABORATORIUM",
        "DOSEN",
        "ASISTEN_LABORATORIUM",
        "MAHASISWA",
        "OPERATOR_JURUSAN",
        "OPERATOR_KEUANGAN",
        "PIMPINAN_JURUSAN",
        "SUPER_ADMIN",
    ];

    if (countUserLevels === 0) {
        userLevelAkses.forEach(async (userLevel) => {
            await prisma.userLevels.create({
                data: {
                    id: ulid(),
                    name: userLevel,
                },
            });
        });
    }

    console.log("User Levels seeded");
}
