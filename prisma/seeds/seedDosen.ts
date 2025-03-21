import { PrismaClient } from "@prisma/client";
import { ulid } from "ulid";
import bcrypt from "bcrypt";

export async function seedDosen(prisma: PrismaClient) {
    const countDosen = await prisma.dosen.count();

    if (countDosen === 0) {
        const hashedPassword = await bcrypt.hash("dosen123", 12);

        const userLevel = await prisma.userLevels.findFirst({
            where: {
                name: "DOSEN",
            },
        });

        if (userLevel) {
            await prisma.dosen.create({
                data: {
                    id: ulid(),
                    nama: "Kurnia Saputra, ST., M.Sc.",
                    email: "kurniasaputra@test.com",
                    password: hashedPassword,
                    nip: "198003262014041001",
                    userLevelId: userLevel.id,
                },
            });
        }

        console.log("Dosen seeded");
    }
}
