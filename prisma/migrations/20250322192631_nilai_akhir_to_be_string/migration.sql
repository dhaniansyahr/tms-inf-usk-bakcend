/*
  Warnings:

  - You are about to alter the column `nilaiAkhir` on the `PendaftaranAsistenLab` table. The data in that column could be lost. The data in that column will be cast from `Double` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `PendaftaranAsistenLab` MODIFY `nilaiAkhir` VARCHAR(191) NOT NULL;
