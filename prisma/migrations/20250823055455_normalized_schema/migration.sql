/*
  Warnings:

  - You are about to drop the column `namaAction` on the `Acl` table. All the data in the column will be lost.
  - You are about to drop the column `namaFeature` on the `Acl` table. All the data in the column will be lost.
  - You are about to drop the column `namaFeature` on the `Actions` table. All the data in the column will be lost.
  - You are about to drop the column `jadwalId` on the `AsistenLab` table. All the data in the column will be lost.
  - You are about to drop the column `userLevelId` on the `AsistenLab` table. All the data in the column will be lost.
  - You are about to alter the column `tahun` on the `AsistenLab` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to drop the column `nama` on the `HistoryKepalaLab` table. All the data in the column will be lost.
  - You are about to drop the column `nip` on the `HistoryKepalaLab` table. All the data in the column will be lost.
  - You are about to drop the column `day` on the `Holidays` table. All the data in the column will be lost.
  - You are about to drop the column `month` on the `Holidays` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `Holidays` table. All the data in the column will be lost.
  - You are about to alter the column `date` on the `Holidays` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `DateTime(3)`.
  - You are about to alter the column `tahun` on the `Jadwal` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to drop the column `asistenLabId` on the `Mahasiswa` table. All the data in the column will be lost.
  - You are about to alter the column `tahunMasuk` on the `Mahasiswa` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to alter the column `tanggal` on the `Meeting` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `DateTime(3)`.
  - You are about to drop the column `histroyKepalaLabId` on the `RuanganLaboratorium` table. All the data in the column will be lost.
  - You are about to drop the column `namaKepalaLab` on the `RuanganLaboratorium` table. All the data in the column will be lost.
  - You are about to drop the column `nipKepalaLab` on the `RuanganLaboratorium` table. All the data in the column will be lost.
  - You are about to drop the `_AsistenLabToJadwal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_DosenToJadwal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_JadwalToMahasiswa` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[featureId,actionId,userLevelId]` on the table `Acl` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[featureId,name]` on the table `Actions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[dosenId,matakuliahId]` on the table `DosenPengampuMK` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[mahasiswaId,jadwalId]` on the table `PendaftaranAsistenLab` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `actionId` to the `Acl` table without a default value. This is not possible if the table is not empty.
  - Added the required column `featureId` to the `Acl` table without a default value. This is not possible if the table is not empty.
  - Added the required column `featureId` to the `Actions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kepalaLabId` to the `HistoryKepalaLab` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `HistoryKepalaLab` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Holidays` table without a default value. This is not possible if the table is not empty.
  - Made the column `jadwalId` on table `Meeting` required. This step will fail if there are existing NULL values in that column.
  - Made the column `jadwalId` on table `OverrideJadwal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `matakuliahId` on table `PendaftaranAsistenLab` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `Acl` DROP FOREIGN KEY `Acl_namaFeature_fkey`;

-- DropForeignKey
ALTER TABLE `Actions` DROP FOREIGN KEY `Actions_namaFeature_fkey`;

-- DropForeignKey
ALTER TABLE `AsistenLab` DROP FOREIGN KEY `AsistenLab_userLevelId_fkey`;

-- DropForeignKey
ALTER TABLE `Mahasiswa` DROP FOREIGN KEY `Mahasiswa_asistenLabId_fkey`;

-- DropForeignKey
ALTER TABLE `Meeting` DROP FOREIGN KEY `Meeting_jadwalId_fkey`;

-- DropForeignKey
ALTER TABLE `OverrideJadwal` DROP FOREIGN KEY `OverrideJadwal_jadwalId_fkey`;

-- DropForeignKey
ALTER TABLE `PendaftaranAsistenLab` DROP FOREIGN KEY `PendaftaranAsistenLab_matakuliahId_fkey`;

-- DropForeignKey
ALTER TABLE `RuanganLaboratorium` DROP FOREIGN KEY `RuanganLaboratorium_histroyKepalaLabId_fkey`;

-- DropForeignKey
ALTER TABLE `_AsistenLabToJadwal` DROP FOREIGN KEY `_AsistenLabToJadwal_A_fkey`;

-- DropForeignKey
ALTER TABLE `_AsistenLabToJadwal` DROP FOREIGN KEY `_AsistenLabToJadwal_B_fkey`;

-- DropForeignKey
ALTER TABLE `_DosenToJadwal` DROP FOREIGN KEY `_DosenToJadwal_A_fkey`;

-- DropForeignKey
ALTER TABLE `_DosenToJadwal` DROP FOREIGN KEY `_DosenToJadwal_B_fkey`;

-- DropForeignKey
ALTER TABLE `_JadwalToMahasiswa` DROP FOREIGN KEY `_JadwalToMahasiswa_A_fkey`;

-- DropForeignKey
ALTER TABLE `_JadwalToMahasiswa` DROP FOREIGN KEY `_JadwalToMahasiswa_B_fkey`;

-- DropIndex
DROP INDEX `Acl_namaFeature_namaAction_userLevelId_key` ON `Acl`;

-- DropIndex
DROP INDEX `Actions_namaFeature_name_key` ON `Actions`;

-- AlterTable
ALTER TABLE `Acl` DROP COLUMN `namaAction`,
    DROP COLUMN `namaFeature`,
    ADD COLUMN `actionId` VARCHAR(191) NOT NULL,
    ADD COLUMN `featureId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Actions` DROP COLUMN `namaFeature`,
    ADD COLUMN `featureId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `AsistenLab` DROP COLUMN `jadwalId`,
    DROP COLUMN `userLevelId`,
    MODIFY `tahun` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `HistoryKepalaLab` DROP COLUMN `nama`,
    DROP COLUMN `nip`,
    ADD COLUMN `endDate` DATETIME(3) NULL,
    ADD COLUMN `kepalaLabId` VARCHAR(191) NOT NULL,
    ADD COLUMN `startDate` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `Holidays` DROP COLUMN `day`,
    DROP COLUMN `month`,
    DROP COLUMN `year`,
    ADD COLUMN `isRecurring` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `name` VARCHAR(191) NOT NULL,
    MODIFY `date` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `Jadwal` MODIFY `tahun` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Mahasiswa` DROP COLUMN `asistenLabId`,
    MODIFY `tahunMasuk` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `Meeting` MODIFY `jadwalId` VARCHAR(191) NOT NULL,
    MODIFY `tanggal` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `OverrideJadwal` MODIFY `jadwalId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `PendaftaranAsistenLab` MODIFY `matakuliahId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `RuanganLaboratorium` DROP COLUMN `histroyKepalaLabId`,
    DROP COLUMN `namaKepalaLab`,
    DROP COLUMN `nipKepalaLab`,
    ADD COLUMN `kepalaLabId` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `_AsistenLabToJadwal`;

-- DropTable
DROP TABLE `_DosenToJadwal`;

-- DropTable
DROP TABLE `_JadwalToMahasiswa`;

-- CreateTable
CREATE TABLE `JadwalDosen` (
    `id` VARCHAR(191) NOT NULL,
    `jadwalId` VARCHAR(191) NOT NULL,
    `dosenId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `JadwalDosen_jadwalId_dosenId_key`(`jadwalId`, `dosenId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JadwalMahasiswa` (
    `id` VARCHAR(191) NOT NULL,
    `jadwalId` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `JadwalMahasiswa_jadwalId_mahasiswaId_key`(`jadwalId`, `mahasiswaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JadwalAsistenLab` (
    `id` VARCHAR(191) NOT NULL,
    `jadwalId` VARCHAR(191) NOT NULL,
    `asistenLabId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `JadwalAsistenLab_jadwalId_asistenLabId_key`(`jadwalId`, `asistenLabId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KepalaLab` (
    `id` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `nip` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `KepalaLab_nip_key`(`nip`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Acl_featureId_actionId_userLevelId_key` ON `Acl`(`featureId`, `actionId`, `userLevelId`);

-- CreateIndex
CREATE UNIQUE INDEX `Actions_featureId_name_key` ON `Actions`(`featureId`, `name`);

-- CreateIndex
CREATE UNIQUE INDEX `DosenPengampuMK_dosenId_matakuliahId_key` ON `DosenPengampuMK`(`dosenId`, `matakuliahId`);

-- CreateIndex
CREATE UNIQUE INDEX `PendaftaranAsistenLab_mahasiswaId_jadwalId_key` ON `PendaftaranAsistenLab`(`mahasiswaId`, `jadwalId`);

-- AddForeignKey
ALTER TABLE `Actions` ADD CONSTRAINT `Actions_featureId_fkey` FOREIGN KEY (`featureId`) REFERENCES `Features`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Acl` ADD CONSTRAINT `Acl_featureId_fkey` FOREIGN KEY (`featureId`) REFERENCES `Features`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JadwalDosen` ADD CONSTRAINT `JadwalDosen_jadwalId_fkey` FOREIGN KEY (`jadwalId`) REFERENCES `Jadwal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JadwalDosen` ADD CONSTRAINT `JadwalDosen_dosenId_fkey` FOREIGN KEY (`dosenId`) REFERENCES `Dosen`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JadwalMahasiswa` ADD CONSTRAINT `JadwalMahasiswa_jadwalId_fkey` FOREIGN KEY (`jadwalId`) REFERENCES `Jadwal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JadwalMahasiswa` ADD CONSTRAINT `JadwalMahasiswa_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JadwalAsistenLab` ADD CONSTRAINT `JadwalAsistenLab_jadwalId_fkey` FOREIGN KEY (`jadwalId`) REFERENCES `Jadwal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JadwalAsistenLab` ADD CONSTRAINT `JadwalAsistenLab_asistenLabId_fkey` FOREIGN KEY (`asistenLabId`) REFERENCES `AsistenLab`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AsistenLab` ADD CONSTRAINT `AsistenLab_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PendaftaranAsistenLab` ADD CONSTRAINT `PendaftaranAsistenLab_matakuliahId_fkey` FOREIGN KEY (`matakuliahId`) REFERENCES `Matakuliah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OverrideJadwal` ADD CONSTRAINT `OverrideJadwal_jadwalId_fkey` FOREIGN KEY (`jadwalId`) REFERENCES `Jadwal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Meeting` ADD CONSTRAINT `Meeting_jadwalId_fkey` FOREIGN KEY (`jadwalId`) REFERENCES `Jadwal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RuanganLaboratorium` ADD CONSTRAINT `RuanganLaboratorium_kepalaLabId_fkey` FOREIGN KEY (`kepalaLabId`) REFERENCES `KepalaLab`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistoryKepalaLab` ADD CONSTRAINT `HistoryKepalaLab_kepalaLabId_fkey` FOREIGN KEY (`kepalaLabId`) REFERENCES `KepalaLab`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
