import { PrismaClient } from "@prisma/client";
import { ulid } from "ulid";

/**
 * RUANGAN SEEDER
 * ==============
 *
 * This file contains two functions:
 *
 * 1. seedRuangan() - Creates classroom rooms for theory courses
 *    - Ruang Kuliah (classroom) rooms
 *    - NO kepala lab assignment (classrooms don't need lab heads)
 *
 * 2. seedRuanganLab() - Creates laboratory rooms for praktikum courses
 *    - Laboratory rooms (Lab. prefix)
 *    - WITH random kepala lab assignment from database dosen
 *    - Requires dosen to be seeded first
 *
 * Usage:
 * - Call seedRuangan() for classroom rooms
 * - Call seedRuanganLab() for laboratory rooms (after seeding dosen)
 */

export async function seedRuangan(prisma: PrismaClient) {
        const countRuangan = await prisma.ruanganLaboratorium.count();

        if (countRuangan === 0) {
                console.log("🏫 Creating 10 ruangan for theory matakuliah...");

                // Define 10 classroom rooms for theoretical subjects (no kepala lab needed)
                const ruanganData = [
                        {
                                nama: "Ruang Kuliah A101",
                                lokasi: "Gedung A, Lantai 1",
                        },
                        {
                                nama: "Ruang Kuliah A102",
                                lokasi: "Gedung A, Lantai 1",
                        },
                        {
                                nama: "Ruang Kuliah A201",
                                lokasi: "Gedung A, Lantai 2",
                        },
                        {
                                nama: "Ruang Kuliah A202",
                                lokasi: "Gedung A, Lantai 2",
                        },
                        {
                                nama: "Ruang Kuliah B101",
                                lokasi: "Gedung B, Lantai 1",
                        },
                        {
                                nama: "Ruang Kuliah B102",
                                lokasi: "Gedung B, Lantai 1",
                        },
                        {
                                nama: "Ruang Kuliah B201",
                                lokasi: "Gedung B, Lantai 2",
                        },
                        {
                                nama: "Ruang Kuliah C101",
                                lokasi: "Gedung C, Lantai 1",
                        },
                        {
                                nama: "Ruang Kuliah C102",
                                lokasi: "Gedung C, Lantai 1",
                        },
                        {
                                nama: "Ruang Kuliah C201",
                                lokasi: "Gedung C, Lantai 2",
                        },
                ];

                // Create each classroom room without kepala lab
                for (let i = 0; i < ruanganData.length; i++) {
                        const roomData = ruanganData[i];

                        console.log(`📍 Creating ${roomData.nama}...`);

                        // Create the classroom room (no kepala lab for Ruang Kuliah)
                        await prisma.ruanganLaboratorium.create({
                                data: {
                                        id: ulid(),
                                        nama: roomData.nama,
                                        lokasi: roomData.lokasi,
                                        isActive: true,
                                        // No kepala lab assignment for classroom rooms
                                },
                        });

                        console.log(`✅ ${roomData.nama} created successfully (no kepala lab assigned)`);
                }

                console.log("🎉 All 10 ruangan for theory matakuliah have been seeded successfully!");
        } else {
                console.log(`ℹ️ Ruangan already exist (${countRuangan} found). Skipping seeder.`);
        }
}

/**
 * Additional function to seed laboratory rooms for praktikum subjects
 * Call this function separately if you also need lab rooms
 */
export async function seedRuanganLab(prisma: PrismaClient) {
        // Check if laboratory rooms already exist
        const existingLabCount = await prisma.ruanganLaboratorium.count({
                where: {
                        nama: {
                                startsWith: "Lab.",
                        },
                },
        });

        if (existingLabCount > 0) {
                console.log(`ℹ️ Laboratory rooms already exist (${existingLabCount} found). Skipping lab room seeder.`);
                return;
        }

        console.log("🧪 Creating laboratory rooms for praktikum matakuliah...");

        // Get all available dosen from database
        const allDosen = await prisma.dosen.findMany();

        if (allDosen.length === 0) {
                console.log("❌ No dosen found in database. Please seed dosen first before creating lab rooms.");
                return;
        }

        console.log(`📊 Found ${allDosen.length} dosen in database for kepala lab assignment`);

        // Define laboratory rooms for practical subjects
        const labRuanganData = [
                {
                        nama: "Lab. Database",
                        lokasi: "Gedung D, Lantai 1",
                },
                {
                        nama: "Lab. Sistem Komputer dan Jaringan",
                        lokasi: "Gedung A, Lantai 3",
                },
                {
                        nama: "Lab. GIS",
                        lokasi: "Gedung A, Lantai 3",
                },
                {
                        nama: "Lab. RPL",
                        lokasi: "Gedung A, Lantai 3",
                },
                {
                        nama: "Lab. Data Science",
                        lokasi: "Gedung A, Lantai 3",
                },
                {
                        nama: "Lab. AI",
                        lokasi: "Gedung A, Lantai 3",
                },
        ];

        // Create each lab room with random kepala lab
        for (let i = 0; i < labRuanganData.length; i++) {
                const labData = labRuanganData[i];

                console.log(`🧪 Creating ${labData.nama}...`);

                // Get random dosen for kepala lab
                const randomDosen = allDosen[Math.floor(Math.random() * allDosen.length)];

                // Create the lab room
                const ruangan = await prisma.ruanganLaboratorium.create({
                        data: {
                                id: ulid(),
                                nama: labData.nama,
                                lokasi: labData.lokasi,
                                isActive: true,
                        },
                });

                // Create history kepala lab for this room with random dosen
                const kepalaLab = await prisma.historyKepalaLab.create({
                        data: {
                                id: ulid(),
                                nama: randomDosen.nama,
                                nip: randomDosen.nip,
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

                console.log(`✅ ${labData.nama} created successfully with kepala lab: ${randomDosen.nama} (${randomDosen.nip})`);
        }

        console.log("🎉 All laboratory rooms for praktikum matakuliah have been seeded successfully!");
}
