/*
  Warnings:

  - Added the required column `userId` to the `StatusPage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."StatusPage" ADD COLUMN     "userId" TEXT NOT NULL;
