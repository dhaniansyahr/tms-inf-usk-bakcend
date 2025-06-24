/*
  Warnings:

  - Added the required column `jadwalId` to the `PendaftaranAsistenLab` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `PendaftaranAsistenLab` DROP FOREIGN KEY `PendaftaranAsistenLab_matakuliahId_fkey`;

-- AlterTable
ALTER TABLE `PendaftaranAsistenLab` ADD COLUMN `jadwalId` VARCHAR(191) NOT NULL,
    MODIFY `matakuliahId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Shift` MODIFY `isActive` BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE `PendaftaranAsistenLab` ADD CONSTRAINT `PendaftaranAsistenLab_jadwalId_fkey` FOREIGN KEY (`jadwalId`) REFERENCES `Jadwal`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PendaftaranAsistenLab` ADD CONSTRAINT `PendaftaranAsistenLab_matakuliahId_fkey` FOREIGN KEY (`matakuliahId`) REFERENCES `Matakuliah`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
