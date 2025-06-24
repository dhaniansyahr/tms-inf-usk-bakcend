import { PrismaClient } from "@prisma/client";
import { ulid } from "ulid";

export async function seedRuangan(prisma: PrismaClient) {
        const countRuangan = await prisma.ruanganLaboratorium.count();

        if (countRuangan === 0) {
                console.log("🏫 Creating 10 ruangan for non-praktikum matakuliah...");

                // Define 10 rooms for theoretical/non-praktikum subjects
                const ruanganData = [
                        {
                                nama: "Ruang Kuliah A101",
                                lokasi: "Gedung A, Lantai 1",
                                kepalaLab: "Dr. Ahmad Wijaya, M.Kom",
                                nip: "198501152010011001",
                        },
                        {
                                nama: "Ruang Kuliah A102",
                                lokasi: "Gedung A, Lantai 1",
                                kepalaLab: "Dr. Siti Nurhaliza, M.T",
                                nip: "198703222012012001",
                        },
                        {
                                nama: "Ruang Kuliah A201",
                                lokasi: "Gedung A, Lantai 2",
                                kepalaLab: "Prof. Bambang Sutrisno, Ph.D",
                                nip: "197912101998031001",
                        },
                        {
                                nama: "Ruang Kuliah A202",
                                lokasi: "Gedung A, Lantai 2",
                                kepalaLab: "Dr. Maya Sari, M.Kom",
                                nip: "198406152009012002",
                        },
                        {
                                nama: "Ruang Kuliah B101",
                                lokasi: "Gedung B, Lantai 1",
                                kepalaLab: "Dr. Rudi Hartono, M.T",
                                nip: "198209081999031002",
                        },
                        {
                                nama: "Ruang Kuliah B102",
                                lokasi: "Gedung B, Lantai 1",
                                kepalaLab: "Dr. Indira Kusuma, M.Kom",
                                nip: "198812252015012001",
                        },
                        {
                                nama: "Ruang Kuliah B201",
                                lokasi: "Gedung B, Lantai 2",
                                kepalaLab: "Prof. Joko Widodo, M.Sc",
                                nip: "197605141997031001",
                        },
                        {
                                nama: "Ruang Kuliah C101",
                                lokasi: "Gedung C, Lantai 1",
                                kepalaLab: "Dr. Rina Setiawati, M.T",
                                nip: "198510302010012001",
                        },
                        {
                                nama: "Ruang Kuliah C102",
                                lokasi: "Gedung C, Lantai 1",
                                kepalaLab: "Dr. Agus Prasetyo, M.Kom",
                                nip: "198104161999031001",
                        },
                        {
                                nama: "Ruang Kuliah C201",
                                lokasi: "Gedung C, Lantai 2",
                                kepalaLab: "Dr. Dewi Maharani, M.T",
                                nip: "198907122012012002",
                        },
                ];

                // Create each room with its corresponding kepala lab
                for (let i = 0; i < ruanganData.length; i++) {
                        const roomData = ruanganData[i];

                        console.log(`📍 Creating ${roomData.nama}...`);

                        // Create the room first
                        const ruangan = await prisma.ruanganLaboratorium.create({
                                data: {
                                        id: ulid(),
                                        nama: roomData.nama,
                                        lokasi: roomData.lokasi,
                                        isActive: true,
                                },
                        });

                        // Create history kepala lab for this room
                        const kepalaLab = await prisma.historyKepalaLab.create({
                                data: {
                                        id: ulid(),
                                        nama: roomData.kepalaLab,
                                        nip: roomData.nip,
                                        ruanganLabId: ruangan.id,
                                },
                        });

                        // Update the room with kepala lab information
                        await prisma.ruanganLaboratorium.update({
                                where: { id: ruangan.id },
                                data: {
                                        histroyKepalaLabId: kepalaLab.id,
                                        namaKepalaLab: kepalaLab.nama,
                                        nipKepalaLab: kepalaLab.nip,
                                },
                        });

                        console.log(`✅ ${roomData.nama} created successfully`);
                }

                console.log("🎉 All 10 ruangan for non-praktikum matakuliah have been seeded successfully!");
        } else {
                console.log(`ℹ️ Ruangan already exist (${countRuangan} found). Skipping seeder.`);
        }
}

/**
 * Additional function to seed laboratory rooms for praktikum subjects
 * Call this function separately if you also need lab rooms
 */
export async function seedRuanganLab(prisma: PrismaClient) {
        console.log("🧪 Creating laboratory rooms for praktikum matakuliah...");

        // Define laboratory rooms for practical subjects
        const labRuanganData = [
                {
                        nama: "Lab. Database",
                        lokasi: "Gedung D, Lantai 1",
                        kepalaLab: "Dr. Budi Santoso, M.T",
                        nip: "198205141998031003",
                },
                {
                        nama: "Lab. Sistem Komputer dan Jaringan",
                        lokasi: "Gedung A, Lantai 3",
                        kepalaLab: "Dr. Lisa Permata, M.Kom",
                        nip: "198808192010012003",
                },
                {
                        nama: "Lab. GIS",
                        lokasi: "Gedung A, Lantai 3",
                        kepalaLab: "Dr. Andi Rahman, M.T",
                        nip: "198112252005011002",
                },
                {
                        nama: "Lab. RPL",
                        lokasi: "Gedung A, Lantai 3",
                        kepalaLab: "Dr. Citra Dewi, M.Kom",
                        nip: "198609102012012004",
                },
                {
                        nama: "Lab. Data Science",
                        lokasi: "Gedung A, Lantai 3",
                        kepalaLab: "Dr. Rizki Pratama, M.T",
                        nip: "198903181999031003",
                },
                {
                        nama: "Lab. AI",
                        lokasi: "Gedung A, Lantai 3",
                        kepalaLab: "Dr. Rizki Pratama, M.T",
                        nip: "198903181999031003",
                },
        ];

        // Create each lab room
        for (let i = 0; i < labRuanganData.length; i++) {
                const labData = labRuanganData[i];

                console.log(`🧪 Creating ${labData.nama}...`);

                // Create the lab room
                const ruangan = await prisma.ruanganLaboratorium.create({
                        data: {
                                id: ulid(),
                                nama: labData.nama,
                                lokasi: labData.lokasi,
                                isActive: true,
                        },
                });

                // Create history kepala lab for this room
                const kepalaLab = await prisma.historyKepalaLab.create({
                        data: {
                                id: ulid(),
                                nama: labData.kepalaLab,
                                nip: labData.nip,
                                ruanganLabId: ruangan.id,
                        },
                });

                // Update the room with kepala lab information
                await prisma.ruanganLaboratorium.update({
                        where: { id: ruangan.id },
                        data: {
                                histroyKepalaLabId: kepalaLab.id,
                                namaKepalaLab: kepalaLab.nama,
                                nipKepalaLab: kepalaLab.nip,
                        },
                });

                console.log(`✅ ${labData.nama} created successfully`);
        }

        console.log("🎉 All laboratory rooms for praktikum matakuliah have been seeded successfully!");
}
