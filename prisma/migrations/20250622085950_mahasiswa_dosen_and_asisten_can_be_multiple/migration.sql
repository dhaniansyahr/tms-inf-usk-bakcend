/*
  Warnings:

  - You are about to drop the column `asistenLabId` on the `Jadwal` table. All the data in the column will be lost.
  - You are about to drop the column `dosenId` on the `Jadwal` table. All the data in the column will be lost.
  - You are about to drop the column `mahasiswaId` on the `Jadwal` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `Jadwal` DROP FOREIGN KEY `Jadwal_asistenLabId_fkey`;

-- DropForeignKey
ALTER TABLE `Jadwal` DROP FOREIGN KEY `Jadwal_dosenId_fkey`;

-- DropForeignKey
ALTER TABLE `Jadwal` DROP FOREIGN KEY `Jadwal_mahasiswaId_fkey`;

-- AlterTable
ALTER TABLE `Jadwal` DROP COLUMN `asistenLabId`,
    DROP COLUMN `dosenId`,
    DROP COLUMN `mahasiswaId`;

-- CreateTable
CREATE TABLE `_DosenToJadwal` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_DosenToJadwal_AB_unique`(`A`, `B`),
    INDEX `_DosenToJadwal_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_AsistenLabToJadwal` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_AsistenLabToJadwal_AB_unique`(`A`, `B`),
    INDEX `_AsistenLabToJadwal_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_JadwalToMahasiswa` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_JadwalToMahasiswa_AB_unique`(`A`, `B`),
    INDEX `_JadwalToMahasiswa_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_DosenToJadwal` ADD CONSTRAINT `_DosenToJadwal_A_fkey` FOREIGN KEY (`A`) REFERENCES `Dosen`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DosenToJadwal` ADD CONSTRAINT `_DosenToJadwal_B_fkey` FOREIGN KEY (`B`) REFERENCES `Jadwal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AsistenLabToJadwal` ADD CONSTRAINT `_AsistenLabToJadwal_A_fkey` FOREIGN KEY (`A`) REFERENCES `AsistenLab`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AsistenLabToJadwal` ADD CONSTRAINT `_AsistenLabToJadwal_B_fkey` FOREIGN KEY (`B`) REFERENCES `Jadwal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_JadwalToMahasiswa` ADD CONSTRAINT `_JadwalToMahasiswa_A_fkey` FOREIGN KEY (`A`) REFERENCES `Jadwal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_JadwalToMahasiswa` ADD CONSTRAINT `_JadwalToMahasiswa_B_fkey` FOREIGN KEY (`B`) REFERENCES `Mahasiswa`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
