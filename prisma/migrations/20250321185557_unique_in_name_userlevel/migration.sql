/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `UserLevels` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `UserLevels_name_key` ON `UserLevels`(`name`);
