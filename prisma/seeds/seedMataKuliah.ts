import { PrismaClient, TYPE_MATKUL } from "@prisma/client";
import { ulid } from "ulid";

export async function seedMataKuliah(prisma: PrismaClient) {
    const countMataKuliah = await prisma.matakuliah.count();

    if (countMataKuliah === 0) {
        const matakuliah = await prisma.matakuliah.create({
            data: {
                id: ulid(),
                nama: "PEMROGRAMAN",
                kode: "SINF1001",
                type: TYPE_MATKUL.TEORI,
                sks: 3,
            },
        });

        // Create Dosen Pengampu Mata Kuliah
        const dosenPengampu = await prisma.dosen.findFirst();

        if (dosenPengampu) {
            await prisma.dosenPengampuMK.create({
                data: {
                    id: ulid(),
                    dosenId: dosenPengampu.id,
                    matakuliahId: matakuliah.id,
                },
            });
        }
    }

    console.log("Mata Kuliah seeded");
}
