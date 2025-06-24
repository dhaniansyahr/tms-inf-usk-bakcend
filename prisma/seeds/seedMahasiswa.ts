import { PrismaClient } from "@prisma/client";
import { ulid } from "ulid";
import bcrypt from "bcrypt";
import { faker } from "@faker-js/faker";

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
                        // Seed angkatan 2021
                        for (let i = 1; i <= 100; i++) {
                                const npm = `2108107010${i.toString().padStart(3, "0")}`;
                                await prisma.mahasiswa.create({
                                        data: {
                                                id: ulid(),
                                                npm: npm,
                                                nama: faker.person.fullName(),
                                                password: hashedPassword,
                                                semester: 7,
                                                tahunMasuk: "2021",
                                                isActive: true,
                                                userLevelId: userLevel.id,
                                        },
                                });
                        }

                        // Seed angkatan 2022
                        for (let i = 1; i <= 100; i++) {
                                const npm = `2208107010${i.toString().padStart(3, "0")}`;
                                await prisma.mahasiswa.create({
                                        data: {
                                                id: ulid(),
                                                npm: npm,
                                                nama: faker.person.fullName(),
                                                password: hashedPassword,
                                                semester: 5,
                                                tahunMasuk: "2022",
                                                isActive: true,
                                                userLevelId: userLevel.id,
                                        },
                                });
                        }

                        // Seed angkatan 2023
                        for (let i = 1; i <= 100; i++) {
                                const npm = `2308107010${i.toString().padStart(3, "0")}`;
                                await prisma.mahasiswa.create({
                                        data: {
                                                id: ulid(),
                                                npm: npm,
                                                nama: faker.person.fullName(),
                                                password: hashedPassword,
                                                semester: 3,
                                                tahunMasuk: "2023",
                                                isActive: true,
                                                userLevelId: userLevel.id,
                                        },
                                });
                        }

                        // Seed angkatan 2024
                        for (let i = 1; i <= 100; i++) {
                                const npm = `2408107010${i.toString().padStart(3, "0")}`;
                                await prisma.mahasiswa.create({
                                        data: {
                                                id: ulid(),
                                                npm: npm,
                                                nama: faker.person.fullName(),
                                                password: hashedPassword,
                                                semester: 1,
                                                tahunMasuk: "2024",
                                                isActive: true,
                                                userLevelId: userLevel.id,
                                        },
                                });
                        }
                }

                console.log("400 Mahasiswa seeded");
        } else {
                console.log("Mahasiswa already seeded");
        }
}
