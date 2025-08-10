/*
  Warnings:

  - Made the column `isOverride` on table `Jadwal` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `Jadwal` MODIFY `isOverride` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `OverrideJadwal` (
    `id` VARCHAR(191) NOT NULL,
    `message` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `jadwalId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OverrideJadwal` ADD CONSTRAINT `OverrideJadwal_jadwalId_fkey` FOREIGN KEY (`jadwalId`) REFERENCES `Jadwal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
