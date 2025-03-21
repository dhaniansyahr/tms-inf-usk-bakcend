-- DropForeignKey
ALTER TABLE `Jadwal` DROP FOREIGN KEY `Jadwal_asistenLabId_fkey`;

-- DropForeignKey
ALTER TABLE `Jadwal` DROP FOREIGN KEY `Jadwal_mahasiswaId_fkey`;

-- AlterTable
ALTER TABLE `Jadwal` MODIFY `asistenLabId` VARCHAR(191) NULL,
    MODIFY `mahasiswaId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Jadwal` ADD CONSTRAINT `Jadwal_asistenLabId_fkey` FOREIGN KEY (`asistenLabId`) REFERENCES `AsistenLab`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Jadwal` ADD CONSTRAINT `Jadwal_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
