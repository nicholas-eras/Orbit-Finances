-- DropIndex
DROP INDEX "Category_name_key";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastBankBalance" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN     "lastBankBalanceDate" TIMESTAMP(3);
