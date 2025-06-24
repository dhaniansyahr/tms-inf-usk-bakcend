import { BIDANG_MINAT, PrismaClient } from "@prisma/client";
import { ulid } from "ulid";
import bcrypt from "bcrypt";
import * as XLSX from "xlsx";
import path from "path";

interface DosenExcel {
        NAMA: string;
        NIP: string;
        BIDANG_MINAT: string;
}

function readExcelFile(filePath: string): DosenExcel[] {
        try {
                const workbook = XLSX.readFile(filePath);
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                return XLSX.utils.sheet_to_json<DosenExcel>(worksheet);
        } catch (error) {
                console.error("Error reading Excel file:", error);
                return [];
        }
}

function randomNip(): string {
        return Math.floor(1000000000000000 + Math.random() * 9000000000000000).toString();
}

function generateEmail(nama: string): string {
        // Remove titles and degrees
        const cleanName = nama.replace(/(Prof\.|Dr\.|Ir\.|S\.Si,|S\.T\.,|M\.Tech|M\.Si|M\.Sc\.|M\.Kom|M\.S\.|IPM\.|M\.Inf\.Tech|M\.Inf\.)/gi, "").trim();

        // Split into parts and take first two parts
        const nameParts = cleanName.split(" ").filter((part) => part.length > 0);
        const emailName = nameParts.slice(0, 2).join(".").toLowerCase();

        // Remove special characters and replace spaces
        const sanitizedEmail = emailName
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9.]/g, "");

        return `${sanitizedEmail}@usk.ac.id`;
}

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
                        // Read from Excel file in the seeds/data directory
                        const excelPath = path.join(__dirname, "data", "dosen.xlsx");
                        const dosenData = readExcelFile(excelPath);

                        console.log(`Found ${dosenData.length} dosen in Excel`);

                        for (const data of dosenData) {
                                await prisma.dosen.create({
                                        data: {
                                                id: ulid(),
                                                nama: data.NAMA,
                                                email: generateEmail(data.NAMA),
                                                password: hashedPassword,
                                                nip: data.NIP || randomNip(),
                                                bidangMinat: data.BIDANG_MINAT as BIDANG_MINAT,
                                                userLevelId: userLevel.id,
                                        },
                                });
                        }

                        console.log(`${dosenData.length} Dosen seeded`);
                }
        } else {
                console.log("Dosen already seeded");
        }
}
