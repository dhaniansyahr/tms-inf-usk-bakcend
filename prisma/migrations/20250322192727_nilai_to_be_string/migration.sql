/*
  Warnings:

  - You are about to alter the column `nilaiTeori` on the `PendaftaranAsistenLab` table. The data in that column could be lost. The data in that column will be cast from `Double` to `VarChar(191)`.
  - You are about to alter the column `nilaiPraktikum` on the `PendaftaranAsistenLab` table. The data in that column could be lost. The data in that column will be cast from `Double` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `PendaftaranAsistenLab` MODIFY `nilaiTeori` VARCHAR(191) NOT NULL,
    MODIFY `nilaiPraktikum` VARCHAR(191) NOT NULL;
