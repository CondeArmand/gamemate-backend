-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('STEAM', 'GOG');

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "igdbId" TEXT,
    "steamAppId" TEXT,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "coverUrl" TEXT,
    "releaseDate" TIMESTAMP(3),
    "rating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkedAccount" (
    "id" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "username" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkedAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserOwnedGame" (
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "playtimeMinutes" INTEGER,
    "lastPlayedAt" TIMESTAMP(3),
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserOwnedGame_pkey" PRIMARY KEY ("userId","gameId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Game_igdbId_key" ON "Game"("igdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Game_steamAppId_key" ON "Game"("steamAppId");

-- CreateIndex
CREATE UNIQUE INDEX "LinkedAccount_userId_provider_key" ON "LinkedAccount"("userId", "provider");

-- AddForeignKey
ALTER TABLE "LinkedAccount" ADD CONSTRAINT "LinkedAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOwnedGame" ADD CONSTRAINT "UserOwnedGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserOwnedGame" ADD CONSTRAINT "UserOwnedGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
