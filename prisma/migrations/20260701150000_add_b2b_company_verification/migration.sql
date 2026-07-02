-- CreateTable
CREATE TABLE `B2BCompany` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NOT NULL,
    `legalName` VARCHAR(191) NULL,
    `companyType` ENUM('BUYER', 'SUPPLIER', 'MANUFACTURER', 'DISTRIBUTOR', 'WHOLESALER', 'RETAILER') NOT NULL,
    `registrationNumber` VARCHAR(191) NULL,
    `taxNumber` VARCHAR(191) NULL,
    `country` VARCHAR(191) NOT NULL,
    `city` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `website` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NOT NULL,
    `businessEmail` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `logo` VARCHAR(191) NULL,
    `tradeLicenseFile` VARCHAR(191) NULL,
    `taxDocumentFile` VARCHAR(191) NULL,
    `buyerVerificationStatus` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `buyerVerificationNote` TEXT NULL,
    `buyerVerifiedAt` DATETIME(3) NULL,
    `buyerVerifiedBy` VARCHAR(191) NULL,
    `supplierVerificationStatus` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `supplierVerificationNote` TEXT NULL,
    `supplierVerifiedAt` DATETIME(3) NULL,
    `supplierVerifiedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `B2BCompany_userId_key`(`userId`),
    INDEX `B2BCompany_companyType_idx`(`companyType`),
    INDEX `B2BCompany_buyerVerificationStatus_idx`(`buyerVerificationStatus`),
    INDEX `B2BCompany_supplierVerificationStatus_idx`(`supplierVerificationStatus`),
    INDEX `B2BCompany_country_idx`(`country`),
    INDEX `B2BCompany_buyerVerifiedBy_idx`(`buyerVerifiedBy`),
    INDEX `B2BCompany_supplierVerifiedBy_idx`(`supplierVerifiedBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `B2BCompany` ADD CONSTRAINT `B2BCompany_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `B2BCompany` ADD CONSTRAINT `B2BCompany_buyerVerifiedBy_fkey` FOREIGN KEY (`buyerVerifiedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `B2BCompany` ADD CONSTRAINT `B2BCompany_supplierVerifiedBy_fkey` FOREIGN KEY (`supplierVerifiedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
