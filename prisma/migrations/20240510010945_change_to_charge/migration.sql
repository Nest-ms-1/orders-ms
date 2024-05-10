/*
  Warnings:

  - You are about to drop the column `stripeChangeId` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "stripeChangeId",
ADD COLUMN     "stripeChargeId" TEXT;
