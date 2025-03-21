/*
  Warnings:

  - You are about to drop the column `meetingId` on the `Absensi` table. All the data in the column will be lost.
  - You are about to drop the `Meetings` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[jadwalId]` on the table `Absensi` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nip]` on the table `Dosen` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[npm]` on the table `Mahasiswa` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `jadwalId` to the `Absensi` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Absensi` DROP FOREIGN KEY `Absensi_meetingId_fkey`;

-- DropForeignKey
ALTER TABLE `AsistenLab` DROP FOREIGN KEY `AsistenLab_jadwalId_fkey`;

-- DropForeignKey
ALTER TABLE `AsistenLab` DROP FOREIGN KEY `AsistenLab_mahasiswaId_fkey`;

-- DropForeignKey
ALTER TABLE `Jadwal` DROP FOREIGN KEY `Jadwal_asistenLabId_fkey`;

-- DropForeignKey
ALTER TABLE `Meetings` DROP FOREIGN KEY `Meetings_jadwalId_fkey`;

-- DropForeignKey
ALTER TABLE `RuanganLaboratorium` DROP FOREIGN KEY `RuanganLaboratorium_histroyKepalaLabId_fkey`;

-- AlterTable
ALTER TABLE `Absensi` DROP COLUMN `meetingId`,
    ADD COLUMN `jadwalId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Dosen` ADD COLUMN `asistenLabId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Mahasiswa` ADD COLUMN `asistenLabId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `RuanganLaboratorium` MODIFY `histroyKepalaLabId` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `Meetings`;

-- CreateIndex
CREATE UNIQUE INDEX `Absensi_jadwalId_key` ON `Absensi`(`jadwalId`);

-- CreateIndex
CREATE UNIQUE INDEX `Dosen_nip_key` ON `Dosen`(`nip`);

-- CreateIndex
CREATE UNIQUE INDEX `Mahasiswa_npm_key` ON `Mahasiswa`(`npm`);

-- AddForeignKey
ALTER TABLE `Dosen` ADD CONSTRAINT `Dosen_asistenLabId_fkey` FOREIGN KEY (`asistenLabId`) REFERENCES `AsistenLab`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mahasiswa` ADD CONSTRAINT `Mahasiswa_asistenLabId_fkey` FOREIGN KEY (`asistenLabId`) REFERENCES `AsistenLab`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Jadwal` ADD CONSTRAINT `Jadwal_asistenLabId_fkey` FOREIGN KEY (`asistenLabId`) REFERENCES `AsistenLab`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RuanganLaboratorium` ADD CONSTRAINT `RuanganLaboratorium_histroyKepalaLabId_fkey` FOREIGN KEY (`histroyKepalaLabId`) REFERENCES `HistoryKepalaLab`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Absensi` ADD CONSTRAINT `Absensi_jadwalId_fkey` FOREIGN KEY (`jadwalId`) REFERENCES `Jadwal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
