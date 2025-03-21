/*
  Warnings:

  - You are about to drop the column `date` on the `Jadwal` table. All the data in the column will be lost.
  - Added the required column `day` to the `Jadwal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Jadwal` DROP COLUMN `date`,
    ADD COLUMN `day` VARCHAR(191) NOT NULL;
