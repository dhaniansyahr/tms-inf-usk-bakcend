/*
  Warnings:

  - You are about to alter the column `nilaiTeori` on the `PendaftaranAsistenLab` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(3))`.
  - You are about to alter the column `nilaiPraktikum` on the `PendaftaranAsistenLab` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(3))`.
  - You are about to alter the column `nilaiAkhir` on the `PendaftaranAsistenLab` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(3))`.

*/
-- AlterTable
ALTER TABLE `PendaftaranAsistenLab` MODIFY `nilaiTeori` ENUM('A', 'AB', 'B', 'BC', 'C', 'D', 'E') NOT NULL,
    MODIFY `nilaiPraktikum` ENUM('A', 'AB', 'B', 'BC', 'C', 'D', 'E') NOT NULL,
    MODIFY `nilaiAkhir` ENUM('A', 'AB', 'B', 'BC', 'C', 'D', 'E') NOT NULL;
