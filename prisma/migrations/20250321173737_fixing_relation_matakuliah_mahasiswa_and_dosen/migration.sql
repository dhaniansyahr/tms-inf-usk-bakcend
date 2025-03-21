/*
  Warnings:

  - You are about to drop the column `userId` on the `Absensi` table. All the data in the column will be lost.
  - You are about to drop the column `asistenLabId` on the `Dosen` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Mahasiswa` table. All the data in the column will be lost.
  - Added the required column `mahasiswaId` to the `Absensi` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Absensi` DROP FOREIGN KEY `Absensi_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Dosen` DROP FOREIGN KEY `Dosen_asistenLabId_fkey`;

-- DropForeignKey
ALTER TABLE `Dosen` DROP FOREIGN KEY `Dosen_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Mahasiswa` DROP FOREIGN KEY `Mahasiswa_userId_fkey`;

-- AlterTable
ALTER TABLE `Absensi` DROP COLUMN `userId`,
    ADD COLUMN `dosenId` VARCHAR(191) NULL,
    ADD COLUMN `mahasiswaId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Dosen` DROP COLUMN `asistenLabId`;

-- AlterTable
ALTER TABLE `Mahasiswa` DROP COLUMN `userId`;

-- AddForeignKey
ALTER TABLE `Absensi` ADD CONSTRAINT `Absensi_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Absensi` ADD CONSTRAINT `Absensi_dosenId_fkey` FOREIGN KEY (`dosenId`) REFERENCES `Dosen`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
