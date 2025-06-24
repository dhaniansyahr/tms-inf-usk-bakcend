import { BIDANG_MINAT, PrismaClient, TYPE_MATKUL } from "@prisma/client";
import { ulid } from "ulid";
import * as XLSX from "xlsx";
import path from "path";

interface MataKuliahExcel {
        KODE: string;
        NAMA: string;
        TYPE: string;
        SKS: number;
        BIDANG_MINAT: string;
        SEMESTER: number;
}

function readExcelFile(filePath: string): MataKuliahExcel[] {
        try {
                const workbook = XLSX.readFile(filePath);
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                return XLSX.utils.sheet_to_json<MataKuliahExcel>(worksheet);
        } catch (error) {
                console.error("Error reading Excel file:", error);
                return [];
        }
}

export async function seedMataKuliah(prisma: PrismaClient) {
        const countMataKuliah = await prisma.matakuliah.count();

        if (countMataKuliah === 0) {
                // Read from Excel file in the seeds/data directory
                const excelPath = path.join(__dirname, "data", "matakuliah.xlsx");
                const matakuliahData = readExcelFile(excelPath);

                console.log(`Found ${matakuliahData.length} matakuliah in Excel`);

                for (const data of matakuliahData) {
                        await prisma.matakuliah.create({
                                data: {
                                        id: ulid(),
                                        nama: data.NAMA,
                                        kode: data.KODE,
                                        type: data.TYPE as TYPE_MATKUL,
                                        sks: data.SKS,
                                        bidangMinat: data.BIDANG_MINAT as BIDANG_MINAT,
                                        semester: data.SEMESTER,
                                },
                        });

                        // Find and assign dosen pengampu if specified in Excel
                        // const dosenPengampu = await prisma.dosen.findFirst();
                        // if (dosenPengampu) {
                        //     await prisma.dosenPengampuMK.create({
                        //         data: {
                        //             id: ulid(),
                        //             dosenId: dosenPengampu.id,
                        //             matakuliahId: matakuliah.id,
                        //         },
                        //     });
                        // }
                }

                console.log(`${matakuliahData.length} Mata Kuliah seeded`);
        } else {
                console.log("Mata Kuliah already seeded");
        }
}
