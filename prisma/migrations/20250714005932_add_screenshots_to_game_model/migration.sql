-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "screenshots" TEXT[] DEFAULT ARRAY[]::TEXT[];
