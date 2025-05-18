/*
  Warnings:

  - Added the required column `pertemuan` to the `Meeting` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tanggal` to the `Meeting` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Jadwal` ADD COLUMN `isOverride` BOOLEAN NULL;

-- AlterTable
ALTER TABLE `Meeting` ADD COLUMN `pertemuan` INTEGER NOT NULL,
    ADD COLUMN `tanggal` VARCHAR(191) NOT NULL;
