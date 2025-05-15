/*
  Warnings:

  - You are about to drop the column `status` on the `AsistenLab` table. All the data in the column will be lost.
  - You are about to drop the column `deletedAt` on the `Shift` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `AsistenLab` DROP COLUMN `status`;

-- AlterTable
ALTER TABLE `Shift` DROP COLUMN `deletedAt`;

-- CreateTable
CREATE TABLE `PendaftaranAsistenLab` (
    `id` VARCHAR(191) NOT NULL,
    `mahasiswaId` VARCHAR(191) NOT NULL,
    `matakuliahId` VARCHAR(191) NOT NULL,
    `nilaiTeori` DOUBLE NOT NULL,
    `nilaiPraktikum` DOUBLE NOT NULL,
    `nilaiAkhir` DOUBLE NOT NULL,
    `status` ENUM('DITOLAK', 'PENDING', 'DISETUJUI') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PendaftaranAsistenLab` ADD CONSTRAINT `PendaftaranAsistenLab_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PendaftaranAsistenLab` ADD CONSTRAINT `PendaftaranAsistenLab_matakuliahId_fkey` FOREIGN KEY (`matakuliahId`) REFERENCES `Matakuliah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
