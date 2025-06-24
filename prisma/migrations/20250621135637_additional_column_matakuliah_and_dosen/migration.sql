/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Dosen` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bidangMinat` to the `Dosen` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bidangMinat` to the `Matakuliah` table without a default value. This is not possible if the table is not empty.
  - Added the required column `semester` to the `Matakuliah` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Dosen` ADD COLUMN `bidangMinat` ENUM('RPL', 'DATA_MINING', 'JARINGAN', 'GIS', 'UMUM') NOT NULL;

-- AlterTable
ALTER TABLE `Matakuliah` ADD COLUMN `bidangMinat` ENUM('RPL', 'DATA_MINING', 'JARINGAN', 'GIS', 'UMUM') NOT NULL,
    ADD COLUMN `semester` INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Dosen_email_key` ON `Dosen`(`email`);
