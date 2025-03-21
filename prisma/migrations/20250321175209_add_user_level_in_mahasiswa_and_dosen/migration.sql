/*
  Warnings:

  - You are about to drop the column `userId` on the `Dosen` table. All the data in the column will be lost.
  - Added the required column `userLevelId` to the `AsistenLab` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userLevelId` to the `Dosen` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userLevelId` to the `Mahasiswa` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `Dosen_userId_key` ON `Dosen`;

-- AlterTable
ALTER TABLE `AsistenLab` ADD COLUMN `userLevelId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Dosen` DROP COLUMN `userId`,
    ADD COLUMN `userLevelId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `Mahasiswa` ADD COLUMN `userLevelId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `Dosen` ADD CONSTRAINT `Dosen_userLevelId_fkey` FOREIGN KEY (`userLevelId`) REFERENCES `UserLevels`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AsistenLab` ADD CONSTRAINT `AsistenLab_userLevelId_fkey` FOREIGN KEY (`userLevelId`) REFERENCES `UserLevels`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mahasiswa` ADD CONSTRAINT `Mahasiswa_userLevelId_fkey` FOREIGN KEY (`userLevelId`) REFERENCES `UserLevels`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
