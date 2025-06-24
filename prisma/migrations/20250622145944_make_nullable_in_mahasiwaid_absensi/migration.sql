-- DropForeignKey
ALTER TABLE `Absensi` DROP FOREIGN KEY `Absensi_mahasiswaId_fkey`;

-- AlterTable
ALTER TABLE `Absensi` MODIFY `mahasiswaId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Absensi` ADD CONSTRAINT `Absensi_mahasiswaId_fkey` FOREIGN KEY (`mahasiswaId`) REFERENCES `Mahasiswa`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
