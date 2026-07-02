-- DropForeignKey
ALTER TABLE `BuyerVerification` DROP FOREIGN KEY `BuyerVerification_userId_fkey`;

-- DropForeignKey
ALTER TABLE `CompanyVerificationSubmission` DROP FOREIGN KEY `CompanyVerificationSubmission_companyId_fkey`;

-- DropForeignKey
ALTER TABLE `CompanyVerificationSubmission` DROP FOREIGN KEY `CompanyVerificationSubmission_requirementId_fkey`;

-- DropTable
DROP TABLE `BuyerVerification`;

-- DropTable
DROP TABLE `CompanyVerificationSubmission`;

-- DropTable
DROP TABLE `CompanyVerificationRequirement`;
