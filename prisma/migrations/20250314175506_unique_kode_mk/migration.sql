/*
  Warnings:

  - A unique constraint covering the columns `[kode]` on the table `Matakuliah` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `Matakuliah_kode_key` ON `Matakuliah`(`kode`);
