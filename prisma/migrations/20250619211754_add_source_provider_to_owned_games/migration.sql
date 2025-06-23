/*
  Warnings:

  - Added the required column `sourceProvider` to the `UserOwnedGame` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "UserOwnedGame" ADD COLUMN     "sourceProvider" "Provider" NOT NULL;
