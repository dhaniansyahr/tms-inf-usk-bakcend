import { PrismaClient } from "@prisma/client";
import { ulid } from "ulid";

export async function seedRuangan(prisma: PrismaClient) {
    const countRuangan = await prisma.ruanganLaboratorium.count();

    if (countRuangan === 0) {
        const historyKepalaLab = await prisma.historyKepalaLab.count();

        if (historyKepalaLab === 0) {
            const historyKepalaLab = await prisma.historyKepalaLab.create({
                data: {
                    id: ulid(),
                    nama: "Kepala Lab 1",
                    nip: Math.floor(Math.random() * 10000000000000000)
                        .toString()
                        .padStart(16, "0"),
                    ruanganLabId: ulid(),
                },
            });

            if (historyKepalaLab) {
                await prisma.ruanganLaboratorium.create({
                    data: {
                        id: ulid(),
                        nama: "Lab. Database",
                        lokasi: "Gedung A, Lantai 3",
                        namaKepalaLab: historyKepalaLab.nama,
                        nipKepalaLab: historyKepalaLab.nip,
                        histroyKepalaLabId: historyKepalaLab.id,
                    },
                });
            }

            console.log("Ruangan seeded");
        }
    }
}
