/*
  Warnings:

  - Added the required column `password` to the `Dosen` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `Mahasiswa` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tahunMasuk` to the `Mahasiswa` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Dosen` ADD COLUMN `password` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Mahasiswa` ADD COLUMN `password` VARCHAR(191) NOT NULL,
    ADD COLUMN `tahunMasuk` VARCHAR(191) NOT NULL;
