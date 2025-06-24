/*
  Warnings:

  - A unique constraint covering the columns `[mahasiswaId,meetingId]` on the table `Absensi` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `Absensi` ADD COLUMN `isPresent` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `keterangan` VARCHAR(191) NULL,
    ADD COLUMN `meetingId` VARCHAR(191) NULL,
    ADD COLUMN `waktuAbsen` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Absensi_mahasiswaId_meetingId_key` ON `Absensi`(`mahasiswaId`, `meetingId`);

-- AddForeignKey
ALTER TABLE `Absensi` ADD CONSTRAINT `Absensi_meetingId_fkey` FOREIGN KEY (`meetingId`) REFERENCES `Meeting`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
