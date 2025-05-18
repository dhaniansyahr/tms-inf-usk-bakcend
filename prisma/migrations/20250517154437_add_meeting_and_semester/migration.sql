/*
  Warnings:

  - You are about to drop the column `day` on the `Jadwal` table. All the data in the column will be lost.
  - Added the required column `hari` to the `Jadwal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `semester` to the `Jadwal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tahun` to the `Jadwal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Jadwal` DROP COLUMN `day`,
    ADD COLUMN `hari` VARCHAR(191) NOT NULL,
    ADD COLUMN `semester` ENUM('GANJIL', 'GENAP') NOT NULL,
    ADD COLUMN `tahun` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `Meeting` (
    `id` VARCHAR(191) NOT NULL,
    `jadwalId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Meeting` ADD CONSTRAINT `Meeting_jadwalId_fkey` FOREIGN KEY (`jadwalId`) REFERENCES `Jadwal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
