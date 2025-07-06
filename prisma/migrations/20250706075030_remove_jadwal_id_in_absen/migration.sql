/*
  Warnings:

  - You are about to drop the column `jadwalId` on the `Absensi` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `Absensi` DROP FOREIGN KEY `Absensi_jadwalId_fkey`;

-- AlterTable
ALTER TABLE `Absensi` DROP COLUMN `jadwalId`;
