import { PrismaClient } from "@prisma/client";
import { ulid } from "ulid";
import bcrypt from "bcrypt";

export async function seedMahasiswa(prisma: PrismaClient) {
    const countMahasiswa = await prisma.mahasiswa.count();

    if (countMahasiswa === 0) {
        const hashedPassword = await bcrypt.hash("mahasiswa123", 12);

        const userLevel = await prisma.userLevels.findFirst({
            where: {
                name: "MAHASISWA",
            },
        });

        if (userLevel) {
            await prisma.mahasiswa.create({
                data: {
                    id: ulid(),
                    npm: "2108107010057",
                    nama: "Rama Dhaniansyah",
                    password: hashedPassword,
                    semester: 1,
                    tahunMasuk: "2021",
                    isActive: true,
                    userLevelId: userLevel.id,
                },
            });
        }

        console.log("Mahasiswa seeded");
    }
}
