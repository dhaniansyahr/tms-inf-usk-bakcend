-- DropIndex
DROP INDEX `AsistenLab_jadwalId_fkey` ON `AsistenLab`;

-- DropIndex
DROP INDEX `AsistenLab_mahasiswaId_fkey` ON `AsistenLab`;

-- AlterTable
ALTER TABLE `RuanganLaboratorium` MODIFY `namaKepalaLab` VARCHAR(191) NULL,
    MODIFY `nipKepalaLab` VARCHAR(191) NULL;
