/*
  Warnings:

  - The values [TEORI,PRAKTIKUM] on the enum `Matakuliah_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `Matakuliah` MODIFY `type` ENUM('WAJIB', 'PILIHAN') NOT NULL;
