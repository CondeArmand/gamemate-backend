-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "developers" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "publishers" TEXT[] DEFAULT ARRAY[]::TEXT[];
