-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `googleId` VARCHAR(191) NULL,
    `facebookId` VARCHAR(191) NULL,
    `emailVerified` DATETIME(3) NULL,
    `password` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `avatar` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION') NOT NULL DEFAULT 'PENDING_VERIFICATION',
    `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
    `lastLoginAt` DATETIME(3) NULL,
    `lastLoginIp` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_googleId_key`(`googleId`),
    UNIQUE INDEX `User_facebookId_key`(`facebookId`),
    INDEX `User_email_idx`(`email`),
    INDEX `User_status_idx`(`status`),
    INDEX `User_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Permission` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `module` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Permission_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserRole` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserRole_userId_idx`(`userId`),
    INDEX `UserRole_roleId_idx`(`roleId`),
    UNIQUE INDEX `UserRole_userId_roleId_key`(`userId`, `roleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RolePermission` (
    `id` VARCHAR(191) NOT NULL,
    `roleId` VARCHAR(191) NOT NULL,
    `permissionId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RolePermission_roleId_permissionId_key`(`roleId`, `permissionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefreshToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RefreshToken_token_key`(`token`),
    INDEX `RefreshToken_token_idx`(`token`),
    INDEX `RefreshToken_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailVerificationToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EmailVerificationToken_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PasswordResetToken` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `used` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PasswordResetToken_token_key`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TwoFactorSecret` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `secret` VARCHAR(191) NOT NULL,
    `backupCodes` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TwoFactorSecret_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Company` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `legalName` VARCHAR(191) NULL,
    `slug` VARCHAR(191) NOT NULL,
    `logo` VARCHAR(191) NULL,
    `banner` VARCHAR(191) NULL,
    `businessType` ENUM('MANUFACTURER', 'TRADING_COMPANY', 'BUYING_OFFICE', 'AGENT', 'DISTRIBUTOR', 'RETAILER', 'GOVERNMENT', 'ASSOCIATION', 'INDIVIDUAL', 'OTHER') NOT NULL DEFAULT 'MANUFACTURER',
    `registrationNumber` VARCHAR(191) NULL,
    `vatNumber` VARCHAR(191) NULL,
    `tradeLicenseNumber` VARCHAR(191) NULL,
    `exportLicenseNumber` VARCHAR(191) NULL,
    `yearEstablished` INTEGER NULL,
    `countryId` VARCHAR(191) NULL,
    `cityId` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `website` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `whatsapp` VARCHAR(191) NULL,
    `mainProducts` TEXT NULL,
    `description` LONGTEXT NULL,
    `annualRevenue` VARCHAR(191) NULL,
    `employees` VARCHAR(191) NULL,
    `factorySize` VARCHAR(191) NULL,
    `productionCapacity` VARCHAR(191) NULL,
    `exportPercentage` INTEGER NULL DEFAULT 0,
    `importPercentage` INTEGER NULL DEFAULT 0,
    `status` ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING') NOT NULL DEFAULT 'PENDING',
    `verificationStatus` ENUM('UNVERIFIED', 'EMAIL_VERIFIED', 'DOCUMENT_SUBMITTED', 'DOCUMENT_VERIFIED', 'PREMIUM_VERIFIED', 'ADMIN_VERIFIED', 'REJECTED') NOT NULL DEFAULT 'UNVERIFIED',
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `isPremium` BOOLEAN NOT NULL DEFAULT false,
    `totalViews` INTEGER NOT NULL DEFAULT 0,
    `totalInquiries` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Company_slug_key`(`slug`),
    INDEX `Company_slug_idx`(`slug`),
    INDEX `Company_status_idx`(`status`),
    INDEX `Company_verificationStatus_idx`(`verificationStatus`),
    INDEX `Company_countryId_idx`(`countryId`),
    INDEX `Company_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyUser` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `permissions` TEXT NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CompanyUser_companyId_idx`(`companyId`),
    INDEX `CompanyUser_userId_idx`(`userId`),
    UNIQUE INDEX `CompanyUser_companyId_userId_key`(`companyId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyProfile` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `overview` LONGTEXT NULL,
    `advantages` TEXT NULL,
    `missionStatement` TEXT NULL,
    `certifications` TEXT NULL,
    `qualityControl` TEXT NULL,
    `rndCapacity` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CompanyProfile_companyId_key`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyGallery` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `caption` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CompanyGallery_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyDocument` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `isPrivate` BOOLEAN NOT NULL DEFAULT true,
    `expiresAt` DATETIME(3) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CompanyDocument_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyVerification` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `status` ENUM('UNVERIFIED', 'EMAIL_VERIFIED', 'DOCUMENT_SUBMITTED', 'DOCUMENT_VERIFIED', 'PREMIUM_VERIFIED', 'ADMIN_VERIFIED', 'REJECTED') NOT NULL DEFAULT 'UNVERIFIED',
    `submittedAt` DATETIME(3) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `rejectionReason` TEXT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CompanyVerification_companyId_key`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyVerificationRequirement` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `inputType` ENUM('TEXT', 'FILE', 'BOTH') NOT NULL DEFAULT 'FILE',
    `isRequired` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CompanyVerificationRequirement_isActive_idx`(`isActive`),
    INDEX `CompanyVerificationRequirement_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyVerificationSubmission` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `requirementId` VARCHAR(191) NOT NULL,
    `textValue` LONGTEXT NULL,
    `fileUrl` TEXT NULL,
    `fileStorageKey` TEXT NULL,
    `fileName` VARCHAR(191) NULL,
    `fileMimeType` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `adminNotes` TEXT NULL,
    `submittedAt` DATETIME(3) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CompanyVerificationSubmission_companyId_idx`(`companyId`),
    INDEX `CompanyVerificationSubmission_requirementId_idx`(`requirementId`),
    INDEX `CompanyVerificationSubmission_status_idx`(`status`),
    UNIQUE INDEX `CompanyVerificationSubmission_companyId_requirementId_key`(`companyId`, `requirementId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyCertificate` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `issuedBy` VARCHAR(191) NULL,
    `issuedDate` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `documentUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CompanyCertificate_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyFactoryInfo` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `factorySize` VARCHAR(191) NULL,
    `factoryLocation` VARCHAR(191) NULL,
    `productionLines` INTEGER NULL,
    `qualityControlStaff` INTEGER NULL,
    `totalStaff` INTEGER NULL,
    `annualOutput` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CompanyFactoryInfo_companyId_key`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyTradeInfo` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `mainMarkets` TEXT NULL,
    `exportPercentage` INTEGER NULL,
    `importPercentage` INTEGER NULL,
    `nearestPort` VARCHAR(191) NULL,
    `bankName` VARCHAR(191) NULL,
    `bankAddress` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CompanyTradeInfo_companyId_key`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyMarket` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `countryId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'EXPORT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CompanyMarket_companyId_countryId_type_key`(`companyId`, `countryId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanySocialLink` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `platform` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CompanySocialLink_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyVirtualTour` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `videoUrl` VARCHAR(191) NOT NULL,
    `thumbnailUrl` VARCHAR(191) NULL,
    `durationSec` INTEGER NULL,
    `language` VARCHAR(191) NOT NULL DEFAULT 'en',
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CompanyVirtualTour_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InspectionReport` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `providerName` VARCHAR(191) NOT NULL,
    `inspectorName` VARCHAR(191) NULL,
    `reportNumber` VARCHAR(191) NOT NULL,
    `score` INTEGER NULL,
    `summary` TEXT NULL,
    `findings` LONGTEXT NULL,
    `reportUrl` VARCHAR(191) NULL,
    `reportStorageKey` VARCHAR(191) NULL,
    `reportFilename` VARCHAR(191) NULL,
    `reportMimeType` VARCHAR(191) NULL,
    `adminReviewNotes` TEXT NULL,
    `inspectedAt` DATETIME(3) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `status` ENUM('REQUESTED', 'SCHEDULED', 'COMPLETED', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'REQUESTED',
    `reviewedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InspectionReport_reportNumber_key`(`reportNumber`),
    INDEX `InspectionReport_companyId_idx`(`companyId`),
    INDEX `InspectionReport_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `subcategoryId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `tags` TEXT NULL,
    `shortDescription` TEXT NULL,
    `description` LONGTEXT NULL,
    `sku` VARCHAR(191) NULL,
    `barcode` VARCHAR(191) NULL,
    `thumbnailUrl` VARCHAR(191) NULL,
    `hsCodeId` VARCHAR(191) NULL,
    `moq` DECIMAL(15, 2) NULL,
    `moqUnit` VARCHAR(191) NULL,
    `unitTypeId` VARCHAR(191) NULL,
    `priceMin` DECIMAL(15, 2) NULL,
    `priceMax` DECIMAL(15, 2) NULL,
    `currencyId` VARCHAR(191) NULL,
    `priceNegotiable` BOOLEAN NOT NULL DEFAULT true,
    `productionCapacity` VARCHAR(191) NULL,
    `leadTime` VARCHAR(191) NULL,
    `packagingDetails` TEXT NULL,
    `status` ENUM('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED') NOT NULL DEFAULT 'DRAFT',
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `isTodaysDeal` BOOLEAN NOT NULL DEFAULT false,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `totalViews` INTEGER NOT NULL DEFAULT 0,
    `totalInquiries` INTEGER NOT NULL DEFAULT 0,
    `approvedAt` DATETIME(3) NULL,
    `approvedBy` VARCHAR(191) NULL,
    `rejectedReason` TEXT NULL,
    `seoTitle` VARCHAR(191) NULL,
    `seoDescription` TEXT NULL,
    `seoKeywords` TEXT NULL,
    `seoImageUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Product_slug_key`(`slug`),
    INDEX `Product_companyId_idx`(`companyId`),
    INDEX `Product_categoryId_idx`(`categoryId`),
    INDEX `Product_status_idx`(`status`),
    INDEX `Product_slug_idx`(`slug`),
    INDEX `Product_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductImage` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `alt` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductImage_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductVideo` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `thumbnailUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductVariant` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NULL,
    `price` DECIMAL(15, 2) NULL,
    `moq` DECIMAL(15, 2) NULL,
    `stock` INTEGER NULL,
    `imageUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductVariant_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductSpecification` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductSpecification_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductDocument` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductCertificate` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductPriceTier` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `minQty` DECIMAL(15, 2) NOT NULL,
    `maxQty` DECIMAL(15, 2) NULL,
    `price` DECIMAL(15, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductPriceTier_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductExportMarket` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `countryId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ProductExportMarket_productId_countryId_key`(`productId`, `countryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductShippingMethod` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `shippingMethodId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ProductShippingMethod_productId_shippingMethodId_key`(`productId`, `shippingMethodId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductPaymentTerm` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `paymentTermId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ProductPaymentTerm_productId_paymentTermId_key`(`productId`, `paymentTermId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductTradeTerm` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `tradeTermId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ProductTradeTerm_productId_tradeTermId_key`(`productId`, `tradeTermId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `icon` VARCHAR(191) NULL,
    `image` VARCHAR(191) NULL,
    `parentId` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `approvalStatus` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPROVED',
    `source` ENUM('ADMIN', 'SUPPLIER') NOT NULL DEFAULT 'ADMIN',
    `createdById` VARCHAR(191) NULL,
    `approvedById` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectedReason` TEXT NULL,
    `seoTitle` VARCHAR(191) NULL,
    `seoDesc` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Category_name_key`(`name`),
    UNIQUE INDEX `Category_slug_key`(`slug`),
    INDEX `Category_slug_idx`(`slug`),
    INDEX `Category_parentId_idx`(`parentId`),
    INDEX `Category_approvalStatus_idx`(`approvalStatus`),
    INDEX `Category_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubCategory` (
    `id` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `approvalStatus` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPROVED',
    `source` ENUM('ADMIN', 'SUPPLIER') NOT NULL DEFAULT 'ADMIN',
    `createdById` VARCHAR(191) NULL,
    `approvedById` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectedReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `SubCategory_slug_key`(`slug`),
    INDEX `SubCategory_categoryId_idx`(`categoryId`),
    INDEX `SubCategory_approvalStatus_idx`(`approvalStatus`),
    INDEX `SubCategory_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Country` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `dialCode` VARCHAR(191) NULL,
    `flag` VARCHAR(191) NULL,
    `continent` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Country_name_key`(`name`),
    UNIQUE INDEX `Country_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `City` (
    `id` VARCHAR(191) NOT NULL,
    `countryId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `City_countryId_idx`(`countryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Port` (
    `id` VARCHAR(191) NOT NULL,
    `countryId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'SEA',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Port_countryId_idx`(`countryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HsCode` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `chapter` VARCHAR(191) NULL,
    `heading` VARCHAR(191) NULL,
    `subheading` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `HsCode_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TradeTerm` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TradeTerm_name_key`(`name`),
    UNIQUE INDEX `TradeTerm_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentTerm` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PaymentTerm_name_key`(`name`),
    UNIQUE INDEX `PaymentTerm_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShippingMethod` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ShippingMethod_name_key`(`name`),
    UNIQUE INDEX `ShippingMethod_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Currency` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `rate` DECIMAL(15, 6) NOT NULL DEFAULT 1,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Currency_name_key`(`name`),
    UNIQUE INDEX `Currency_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UnitType` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `UnitType_name_key`(`name`),
    UNIQUE INDEX `UnitType_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Inquiry` (
    `id` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NOT NULL,
    `quantity` VARCHAR(191) NULL,
    `targetPrice` VARCHAR(191) NULL,
    `destinationCountryId` VARCHAR(191) NULL,
    `message` LONGTEXT NOT NULL,
    `status` ENUM('OPEN', 'REPLIED', 'CLOSED', 'SPAM') NOT NULL DEFAULT 'OPEN',
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `chatRoomId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Inquiry_buyerId_idx`(`buyerId`),
    INDEX `Inquiry_companyId_idx`(`companyId`),
    INDEX `Inquiry_status_idx`(`status`),
    INDEX `Inquiry_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InquiryAttachment` (
    `id` VARCHAR(191) NOT NULL,
    `inquiryId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `size` INTEGER NULL,
    `mimeType` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InquiryReply` (
    `id` VARCHAR(191) NOT NULL,
    `inquiryId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `message` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `InquiryReply_inquiryId_idx`(`inquiryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RFQ` (
    `id` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NULL,
    `productName` VARCHAR(191) NOT NULL,
    `quantity` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NULL,
    `destinationCountryId` VARCHAR(191) NULL,
    `budget` DECIMAL(15, 2) NULL,
    `currencyId` VARCHAR(191) NULL,
    `requiredDate` DATETIME(3) NULL,
    `description` LONGTEXT NULL,
    `status` ENUM('OPEN', 'RECEIVING_QUOTATIONS', 'CLOSED', 'AWARDED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'OPEN',
    `expiresAt` DATETIME(3) NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT true,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `quotationCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `RFQ_buyerId_idx`(`buyerId`),
    INDEX `RFQ_status_idx`(`status`),
    INDEX `RFQ_deletedAt_idx`(`deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RFQAttachment` (
    `id` VARCHAR(191) NOT NULL,
    `rfqId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `size` INTEGER NULL,
    `mimeType` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RFQQuotation` (
    `id` VARCHAR(191) NOT NULL,
    `rfqId` VARCHAR(191) NULL,
    `inquiryId` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `totalPrice` DECIMAL(15, 2) NOT NULL,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `deliveryTime` VARCHAR(191) NULL,
    `paymentTermId` VARCHAR(191) NULL,
    `shippingTerms` VARCHAR(191) NULL,
    `validUntil` DATETIME(3) NULL,
    `notes` LONGTEXT NULL,
    `status` ENUM('SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'REVISED') NOT NULL DEFAULT 'SENT',
    `viewedAt` DATETIME(3) NULL,
    `acceptedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `rejectedReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RFQQuotation_rfqId_idx`(`rfqId`),
    INDEX `RFQQuotation_inquiryId_idx`(`inquiryId`),
    INDEX `RFQQuotation_companyId_idx`(`companyId`),
    INDEX `RFQQuotation_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RFQQuotationItem` (
    `id` VARCHAR(191) NOT NULL,
    `quotationId` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(15, 2) NOT NULL,
    `unit` VARCHAR(191) NULL,
    `unitPrice` DECIMAL(15, 2) NOT NULL,
    `totalPrice` DECIMAL(15, 2) NOT NULL,
    `notes` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RFQQuotationAttachment` (
    `id` VARCHAR(191) NOT NULL,
    `quotationId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `size` INTEGER NULL,
    `mimeType` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatRoom` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `isGroup` BOOLEAN NOT NULL DEFAULT false,
    `companyId` VARCHAR(191) NULL,
    `inquiryId` VARCHAR(191) NULL,
    `lastMessage` TEXT NULL,
    `lastMsgAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ChatRoom_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatParticipant` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `isAdmin` BOOLEAN NOT NULL DEFAULT false,
    `isBlocked` BOOLEAN NOT NULL DEFAULT false,
    `lastReadAt` DATETIME(3) NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ChatParticipant_roomId_idx`(`roomId`),
    INDEX `ChatParticipant_userId_idx`(`userId`),
    UNIQUE INDEX `ChatParticipant_roomId_userId_key`(`roomId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Message` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NULL,
    `type` ENUM('TEXT', 'IMAGE', 'FILE', 'SYSTEM') NOT NULL DEFAULT 'TEXT',
    `isEdited` BOOLEAN NOT NULL DEFAULT false,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `replyToId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Message_roomId_idx`(`roomId`),
    INDEX `Message_senderId_idx`(`senderId`),
    INDEX `Message_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MessageAttachment` (
    `id` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `size` INTEGER NULL,
    `mimeType` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MessageReadReceipt` (
    `id` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `readAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MessageReadReceipt_messageId_userId_key`(`messageId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` ENUM('NEW_INQUIRY', 'NEW_RFQ', 'NEW_QUOTATION', 'NEW_MESSAGE', 'PRODUCT_APPROVED', 'PRODUCT_REJECTED', 'COMPANY_VERIFIED', 'SUBSCRIPTION_EXPIRING', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'TRADE_ORDER_UPDATE', 'ESCROW_UPDATE', 'SHIPMENT_UPDATE', 'SAMPLE_ORDER_UPDATE', 'BUYER_VERIFIED', 'DISPUTE_UPDATE', 'ADMIN_ANNOUNCEMENT', 'REVIEW_RECEIVED', 'COMMISSION_UPDATE', 'AD_CAMPAIGN_UPDATE', 'FINANCING_UPDATE', 'LOGISTICS_UPDATE', 'INSURANCE_UPDATE') NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `data` TEXT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userId_idx`(`userId`),
    INDEX `Notification_isRead_idx`(`isRead`),
    INDEX `Notification_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NotificationPreference` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `emailEnabled` BOOLEAN NOT NULL DEFAULT true,
    `pushEnabled` BOOLEAN NOT NULL DEFAULT true,
    `inquiryNotif` BOOLEAN NOT NULL DEFAULT true,
    `rfqNotif` BOOLEAN NOT NULL DEFAULT true,
    `quoteNotif` BOOLEAN NOT NULL DEFAULT true,
    `messageNotif` BOOLEAN NOT NULL DEFAULT true,
    `productNotif` BOOLEAN NOT NULL DEFAULT true,
    `paymentNotif` BOOLEAN NOT NULL DEFAULT true,
    `systemNotif` BOOLEAN NOT NULL DEFAULT true,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `NotificationPreference_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BuyerVerification` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NULL,
    `registrationNo` VARCHAR(191) NULL,
    `businessLicenseNo` VARCHAR(191) NULL,
    `taxId` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `companyAddress` TEXT NULL,
    `contactRole` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `documentUrls` LONGTEXT NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `submittedAt` DATETIME(3) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `rejectionReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `BuyerVerification_userId_key`(`userId`),
    INDEX `BuyerVerification_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `KYCProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NULL,
    `legalName` VARCHAR(191) NULL,
    `passportNumber` VARCHAR(191) NULL,
    `nationalIdNumber` VARCHAR(191) NULL,
    `businessLicenseNumber` VARCHAR(191) NULL,
    `bankAccountName` VARCHAR(191) NULL,
    `bankAccountNumber` VARCHAR(191) NULL,
    `bankName` VARCHAR(191) NULL,
    `documentUrls` LONGTEXT NULL,
    `notes` TEXT NULL,
    `riskLevel` VARCHAR(191) NULL DEFAULT 'MEDIUM',
    `transactionLimit` DECIMAL(15, 2) NULL,
    `status` ENUM('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `submittedAt` DATETIME(3) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `rejectionReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `KYCProfile_userId_key`(`userId`),
    INDEX `KYCProfile_status_idx`(`status`),
    INDEX `KYCProfile_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SubscriptionPlan` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `monthlyPrice` DECIMAL(10, 2) NOT NULL,
    `yearlyPrice` DECIMAL(10, 2) NOT NULL,
    `trialDays` INTEGER NOT NULL DEFAULT 0,
    `maxProducts` INTEGER NOT NULL DEFAULT 10,
    `maxStaff` INTEGER NOT NULL DEFAULT 1,
    `maxImages` INTEGER NOT NULL DEFAULT 5,
    `featuredProducts` BOOLEAN NOT NULL DEFAULT false,
    `featuredCompany` BOOLEAN NOT NULL DEFAULT false,
    `verificationBadge` BOOLEAN NOT NULL DEFAULT false,
    `analytics` BOOLEAN NOT NULL DEFAULT false,
    `priorityRanking` BOOLEAN NOT NULL DEFAULT false,
    `apiAccess` BOOLEAN NOT NULL DEFAULT false,
    `dedicatedSupport` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `stripePriceIdMonthly` VARCHAR(191) NULL,
    `stripePriceIdYearly` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SubscriptionPlan_name_key`(`name`),
    UNIQUE INDEX `SubscriptionPlan_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Subscription` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'EXPIRED', 'CANCELLED', 'TRIAL', 'PAST_DUE') NOT NULL DEFAULT 'TRIAL',
    `billingCycle` VARCHAR(191) NOT NULL DEFAULT 'MONTHLY',
    `currentPeriodStart` DATETIME(3) NOT NULL,
    `currentPeriodEnd` DATETIME(3) NOT NULL,
    `trialEndsAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `stripeSubId` VARCHAR(191) NULL,
    `stripeCustomerId` VARCHAR(191) NULL,
    `autoRenew` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Subscription_companyId_key`(`companyId`),
    INDEX `Subscription_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invoice` (
    `id` VARCHAR(191) NOT NULL,
    `subscriptionId` VARCHAR(191) NOT NULL,
    `invoiceNumber` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `tax` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `total` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `status` ENUM('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `dueDate` DATETIME(3) NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `stripeInvoiceId` VARCHAR(191) NULL,
    `pdfUrl` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Invoice_invoiceNumber_key`(`invoiceNumber`),
    INDEX `Invoice_subscriptionId_idx`(`subscriptionId`),
    INDEX `Invoice_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tradeOrderId` VARCHAR(191) NULL,
    `sampleOrderId` VARCHAR(191) NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `method` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `stripePaymentId` VARCHAR(191) NULL,
    `paypalPaymentId` VARCHAR(191) NULL,
    `transactionId` VARCHAR(191) NULL,
    `metadata` TEXT NULL,
    `failureReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Payment_userId_idx`(`userId`),
    INDEX `Payment_status_idx`(`status`),
    INDEX `Payment_tradeOrderId_idx`(`tradeOrderId`),
    INDEX `Payment_sampleOrderId_idx`(`sampleOrderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ManualPaymentRequest` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `bankName` VARCHAR(191) NULL,
    `transferRef` VARCHAR(191) NULL,
    `transferDate` DATETIME(3) NULL,
    `proofUrl` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `reviewedBy` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ManualPaymentRequest_companyId_idx`(`companyId`),
    INDEX `ManualPaymentRequest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TradeOrder` (
    `id` VARCHAR(191) NOT NULL,
    `quotationId` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `supplierCompanyId` VARCHAR(191) NOT NULL,
    `productName` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(15, 2) NOT NULL,
    `unit` VARCHAR(191) NULL,
    `unitPrice` DECIMAL(15, 2) NULL,
    `subtotal` DECIMAL(15, 2) NOT NULL,
    `shippingCost` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `escrowFee` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `platformCommissionRate` DECIMAL(5, 2) NOT NULL DEFAULT 1.5,
    `platformCommissionAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(15, 2) NOT NULL,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `shippingAddress` TEXT NULL,
    `buyerNotes` TEXT NULL,
    `supplierNotes` TEXT NULL,
    `status` ENUM('PENDING_ESCROW_PAYMENT', 'ESCROW_FUNDED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'REFUNDED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_ESCROW_PAYMENT',
    `acceptedAt` DATETIME(3) NULL,
    `fundedAt` DATETIME(3) NULL,
    `shippedAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TradeOrder_quotationId_key`(`quotationId`),
    INDEX `TradeOrder_buyerId_idx`(`buyerId`),
    INDEX `TradeOrder_supplierCompanyId_idx`(`supplierCompanyId`),
    INDEX `TradeOrder_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EscrowAccount` (
    `id` VARCHAR(191) NOT NULL,
    `tradeOrderId` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `supplierCompanyId` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NULL,
    `amountHeld` DECIMAL(15, 2) NOT NULL,
    `amountReleased` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `amountRefunded` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `status` ENUM('PENDING', 'HELD', 'RELEASE_REQUESTED', 'RELEASED', 'REFUND_PENDING', 'REFUNDED', 'DISPUTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `termsAccepted` BOOLEAN NOT NULL DEFAULT false,
    `fundedAt` DATETIME(3) NULL,
    `releaseRequestedAt` DATETIME(3) NULL,
    `releasedAt` DATETIME(3) NULL,
    `refundedAt` DATETIME(3) NULL,
    `disputeDeadline` DATETIME(3) NULL,
    `releaseNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EscrowAccount_tradeOrderId_key`(`tradeOrderId`),
    UNIQUE INDEX `EscrowAccount_paymentId_key`(`paymentId`),
    INDEX `EscrowAccount_buyerId_idx`(`buyerId`),
    INDEX `EscrowAccount_supplierCompanyId_idx`(`supplierCompanyId`),
    INDEX `EscrowAccount_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SampleOrder` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `supplierCompanyId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(15, 2) NOT NULL DEFAULT 1,
    `unit` VARCHAR(191) NULL,
    `samplePrice` DECIMAL(15, 2) NOT NULL,
    `shippingCost` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `platformCommissionRate` DECIMAL(5, 2) NOT NULL DEFAULT 0.75,
    `platformCommissionAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(15, 2) NOT NULL,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `shippingAddress` TEXT NULL,
    `requirements` TEXT NULL,
    `buyerNotes` TEXT NULL,
    `supplierNotes` TEXT NULL,
    `status` ENUM('PENDING_PAYMENT', 'PENDING_SUPPLIER_CONFIRMATION', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_PAYMENT',
    `confirmedAt` DATETIME(3) NULL,
    `shippedAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SampleOrder_productId_idx`(`productId`),
    INDEX `SampleOrder_buyerId_idx`(`buyerId`),
    INDEX `SampleOrder_supplierCompanyId_idx`(`supplierCompanyId`),
    INDEX `SampleOrder_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Shipment` (
    `id` VARCHAR(191) NOT NULL,
    `tradeOrderId` VARCHAR(191) NULL,
    `sampleOrderId` VARCHAR(191) NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `supplierCompanyId` VARCHAR(191) NOT NULL,
    `carrier` VARCHAR(191) NOT NULL,
    `trackingNumber` VARCHAR(191) NOT NULL,
    `awbNumber` VARCHAR(191) NULL,
    `trackingUrl` VARCHAR(191) NULL,
    `serviceLevel` VARCHAR(191) NULL,
    `status` ENUM('LABEL_CREATED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION', 'DELAYED', 'RETURNED', 'CANCELLED') NOT NULL DEFAULT 'LABEL_CREATED',
    `originCountryId` VARCHAR(191) NULL,
    `destinationCountryId` VARCHAR(191) NULL,
    `estimatedDeliveryAt` DATETIME(3) NULL,
    `shippedAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `lastEvent` TEXT NULL,
    `lastLocation` VARCHAR(191) NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `metadata` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Shipment_tradeOrderId_idx`(`tradeOrderId`),
    INDEX `Shipment_sampleOrderId_idx`(`sampleOrderId`),
    INDEX `Shipment_buyerId_idx`(`buyerId`),
    INDEX `Shipment_supplierCompanyId_idx`(`supplierCompanyId`),
    INDEX `Shipment_trackingNumber_idx`(`trackingNumber`),
    INDEX `Shipment_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShipmentEvent` (
    `id` VARCHAR(191) NOT NULL,
    `shipmentId` VARCHAR(191) NOT NULL,
    `status` ENUM('LABEL_CREATED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION', 'DELAYED', 'RETURNED', 'CANCELLED') NOT NULL,
    `description` TEXT NOT NULL,
    `location` VARCHAR(191) NULL,
    `eventTime` DATETIME(3) NOT NULL,
    `rawPayload` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ShipmentEvent_shipmentId_idx`(`shipmentId`),
    INDEX `ShipmentEvent_eventTime_idx`(`eventTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EscrowDispute` (
    `id` VARCHAR(191) NOT NULL,
    `tradeOrderId` VARCHAR(191) NOT NULL,
    `escrowId` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `supplierCompanyId` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NOT NULL,
    `evidenceUrls` LONGTEXT NULL,
    `refundAmount` DECIMAL(15, 2) NULL,
    `status` ENUM('OPEN', 'UNDER_REVIEW', 'RESOLVED_BUYER', 'RESOLVED_SUPPLIER', 'PARTIAL_REFUND', 'REJECTED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `resolutionNotes` TEXT NULL,
    `resolvedBy` VARCHAR(191) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EscrowDispute_tradeOrderId_idx`(`tradeOrderId`),
    INDEX `EscrowDispute_escrowId_idx`(`escrowId`),
    INDEX `EscrowDispute_buyerId_idx`(`buyerId`),
    INDEX `EscrowDispute_supplierCompanyId_idx`(`supplierCompanyId`),
    INDEX `EscrowDispute_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TradeDocument` (
    `id` VARCHAR(191) NOT NULL,
    `tradeOrderId` VARCHAR(191) NULL,
    `sampleOrderId` VARCHAR(191) NULL,
    `type` ENUM('PROFORMA_INVOICE', 'COMMERCIAL_INVOICE', 'PACKING_LIST', 'BILL_OF_LADING') NOT NULL,
    `documentNo` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `payload` LONGTEXT NOT NULL,
    `html` LONGTEXT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TradeDocument_tradeOrderId_idx`(`tradeOrderId`),
    INDEX `TradeDocument_sampleOrderId_idx`(`sampleOrderId`),
    INDEX `TradeDocument_createdById_idx`(`createdById`),
    INDEX `TradeDocument_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TransactionRating` (
    `id` VARCHAR(191) NOT NULL,
    `tradeOrderId` VARCHAR(191) NULL,
    `sampleOrderId` VARCHAR(191) NULL,
    `authorUserId` VARCHAR(191) NOT NULL,
    `recipientUserId` VARCHAR(191) NULL,
    `recipientCompanyId` VARCHAR(191) NULL,
    `rating` INTEGER NOT NULL,
    `qualityRating` INTEGER NULL,
    `communicationRating` INTEGER NULL,
    `deliveryRating` INTEGER NULL,
    `title` VARCHAR(191) NULL,
    `comment` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TransactionRating_tradeOrderId_idx`(`tradeOrderId`),
    INDEX `TransactionRating_sampleOrderId_idx`(`sampleOrderId`),
    INDEX `TransactionRating_authorUserId_idx`(`authorUserId`),
    INDEX `TransactionRating_recipientUserId_idx`(`recipientUserId`),
    INDEX `TransactionRating_recipientCompanyId_idx`(`recipientCompanyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FraudAlert` (
    `id` VARCHAR(191) NOT NULL,
    `reportedById` VARCHAR(191) NOT NULL,
    `targetUserId` VARCHAR(191) NULL,
    `targetCompanyId` VARCHAR(191) NULL,
    `tradeOrderId` VARCHAR(191) NULL,
    `sampleOrderId` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `evidenceUrls` LONGTEXT NULL,
    `signalScore` INTEGER NOT NULL DEFAULT 0,
    `status` ENUM('OPEN', 'INVESTIGATING', 'WATCHLIST', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'OPEN',
    `adminNotes` TEXT NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FraudAlert_status_idx`(`status`),
    INDEX `FraudAlert_targetCompanyId_idx`(`targetCompanyId`),
    INDEX `FraudAlert_targetUserId_idx`(`targetUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CreditProfile` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NULL,
    `score` INTEGER NOT NULL DEFAULT 50,
    `successfulDeals` INTEGER NOT NULL DEFAULT 0,
    `disputesCount` INTEGER NOT NULL DEFAULT 0,
    `fraudReportsCount` INTEGER NOT NULL DEFAULT 0,
    `completedKyc` BOOLEAN NOT NULL DEFAULT false,
    `verifiedInspection` BOOLEAN NOT NULL DEFAULT false,
    `notes` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CreditProfile_userId_key`(`userId`),
    UNIQUE INDEX `CreditProfile_companyId_key`(`companyId`),
    INDEX `CreditProfile_score_idx`(`score`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformCommission` (
    `id` VARCHAR(191) NOT NULL,
    `tradeOrderId` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `rate` DECIMAL(5, 2) NOT NULL,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `status` ENUM('PENDING', 'ACCRUED', 'SETTLED', 'WAIVED') NOT NULL DEFAULT 'PENDING',
    `recognizedAt` DATETIME(3) NULL,
    `settledAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PlatformCommission_tradeOrderId_key`(`tradeOrderId`),
    INDEX `PlatformCommission_companyId_idx`(`companyId`),
    INDEX `PlatformCommission_buyerId_idx`(`buyerId`),
    INDEX `PlatformCommission_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AdCampaign` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `placement` ENUM('SEARCH_TOP', 'HOMEPAGE_HERO', 'HOMEPAGE_FEATURED', 'CATEGORY_SPOTLIGHT') NOT NULL,
    `budget` DECIMAL(15, 2) NOT NULL,
    `spent` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `bidAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `targetKeyword` VARCHAR(191) NULL,
    `creativeUrl` VARCHAR(191) NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `status` ENUM('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'PAUSED', 'COMPLETED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    `approvedBy` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AdCampaign_companyId_idx`(`companyId`),
    INDEX `AdCampaign_productId_idx`(`productId`),
    INDEX `AdCampaign_status_idx`(`status`),
    INDEX `AdCampaign_placement_idx`(`placement`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FinancingRequest` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `requesterUserId` VARCHAR(191) NOT NULL,
    `tradeOrderId` VARCHAR(191) NULL,
    `partnerId` VARCHAR(191) NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `purpose` VARCHAR(191) NOT NULL,
    `facilityType` VARCHAR(191) NOT NULL DEFAULT 'WORKING_CAPITAL',
    `termDays` INTEGER NULL,
    `partnerName` VARCHAR(191) NULL,
    `status` ENUM('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'DISBURSED', 'CLOSED') NOT NULL DEFAULT 'SUBMITTED',
    `riskScore` INTEGER NOT NULL DEFAULT 50,
    `recommendedLimit` DECIMAL(15, 2) NULL,
    `riskNotes` TEXT NULL,
    `reviewNotes` TEXT NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `FinancingRequest_companyId_idx`(`companyId`),
    INDEX `FinancingRequest_requesterUserId_idx`(`requesterUserId`),
    INDEX `FinancingRequest_partnerId_idx`(`partnerId`),
    INDEX `FinancingRequest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LogisticsBooking` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `tradeOrderId` VARCHAR(191) NULL,
    `sampleOrderId` VARCHAR(191) NULL,
    `providerName` VARCHAR(191) NOT NULL,
    `serviceMode` VARCHAR(191) NOT NULL,
    `bookingReference` VARCHAR(191) NULL,
    `origin` VARCHAR(191) NOT NULL,
    `destination` VARCHAR(191) NOT NULL,
    `quotedCost` DECIMAL(15, 2) NOT NULL,
    `finalCost` DECIMAL(15, 2) NULL,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `trackingNumber` VARCHAR(191) NULL,
    `status` ENUM('QUOTED', 'BOOKED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'QUOTED',
    `estimatedDeliveryAt` DATETIME(3) NULL,
    `bookedAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `metadata` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LogisticsBooking_bookingReference_key`(`bookingReference`),
    INDEX `LogisticsBooking_companyId_idx`(`companyId`),
    INDEX `LogisticsBooking_buyerId_idx`(`buyerId`),
    INDEX `LogisticsBooking_tradeOrderId_idx`(`tradeOrderId`),
    INDEX `LogisticsBooking_sampleOrderId_idx`(`sampleOrderId`),
    INDEX `LogisticsBooking_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InsurancePolicy` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NULL,
    `productId` VARCHAR(191) NULL,
    `tradeOrderId` VARCHAR(191) NULL,
    `sampleOrderId` VARCHAR(191) NULL,
    `partnerId` VARCHAR(191) NULL,
    `providerName` VARCHAR(191) NOT NULL,
    `policyType` VARCHAR(191) NOT NULL,
    `policyNumber` VARCHAR(191) NULL,
    `insuredAmount` DECIMAL(15, 2) NOT NULL,
    `premiumAmount` DECIMAL(15, 2) NOT NULL,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `coverageSummary` TEXT NULL,
    `claimInstructions` TEXT NULL,
    `documentUrl` VARCHAR(191) NULL,
    `status` ENUM('QUOTED', 'ACTIVE', 'CLAIM_OPEN', 'CLAIM_SETTLED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'QUOTED',
    `underwriterNotes` TEXT NULL,
    `startsAt` DATETIME(3) NULL,
    `endsAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InsurancePolicy_policyNumber_key`(`policyNumber`),
    INDEX `InsurancePolicy_companyId_idx`(`companyId`),
    INDEX `InsurancePolicy_buyerId_idx`(`buyerId`),
    INDEX `InsurancePolicy_productId_idx`(`productId`),
    INDEX `InsurancePolicy_tradeOrderId_idx`(`tradeOrderId`),
    INDEX `InsurancePolicy_sampleOrderId_idx`(`sampleOrderId`),
    INDEX `InsurancePolicy_partnerId_idx`(`partnerId`),
    INDEX `InsurancePolicy_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InsuranceClaim` (
    `id` VARCHAR(191) NOT NULL,
    `policyId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `buyerId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `claimAmount` DECIMAL(15, 2) NOT NULL,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `evidenceUrls` LONGTEXT NULL,
    `status` ENUM('OPEN', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SETTLED') NOT NULL DEFAULT 'OPEN',
    `resolutionNotes` TEXT NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `settledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InsuranceClaim_policyId_idx`(`policyId`),
    INDEX `InsuranceClaim_companyId_idx`(`companyId`),
    INDEX `InsuranceClaim_buyerId_idx`(`buyerId`),
    INDEX `InsuranceClaim_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Review` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `title` VARCHAR(191) NULL,
    `content` TEXT NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Review_companyId_idx`(`companyId`),
    INDEX `Review_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReviewMedia` (
    `id` VARCHAR(191) NOT NULL,
    `reviewId` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'IMAGE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FavoriteProduct` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FavoriteProduct_userId_idx`(`userId`),
    UNIQUE INDEX `FavoriteProduct_userId_productId_key`(`userId`, `productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FavoriteCompany` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FavoriteCompany_userId_idx`(`userId`),
    UNIQUE INDEX `FavoriteCompany_userId_companyId_key`(`userId`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserSearchHistory` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `query` VARCHAR(191) NOT NULL,
    `normalizedQuery` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NOT NULL,
    `mode` VARCHAR(191) NULL,
    `resultsCount` INTEGER NULL,
    `filters` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `UserSearchHistory_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `UserSearchHistory_scope_idx`(`scope`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UserViewHistory` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `entityType` ENUM('PRODUCT', 'COMPANY') NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NULL,
    `slug` VARCHAR(191) NULL,
    `metadata` LONGTEXT NULL,
    `viewCount` INTEGER NOT NULL DEFAULT 1,
    `firstViewedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastViewedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UserViewHistory_userId_lastViewedAt_idx`(`userId`, `lastViewedAt`),
    INDEX `UserViewHistory_productId_idx`(`productId`),
    INDEX `UserViewHistory_companyId_idx`(`companyId`),
    UNIQUE INDEX `UserViewHistory_userId_entityType_entityId_key`(`userId`, `entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BlogCategory` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BlogCategory_name_key`(`name`),
    UNIQUE INDEX `BlogCategory_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BlogPost` (
    `id` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `excerpt` TEXT NULL,
    `content` LONGTEXT NOT NULL,
    `coverImage` VARCHAR(191) NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `seoTitle` VARCHAR(191) NULL,
    `seoDesc` TEXT NULL,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `BlogPost_slug_key`(`slug`),
    INDEX `BlogPost_slug_idx`(`slug`),
    INDEX `BlogPost_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BlogTag` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `BlogTag_name_key`(`name`),
    UNIQUE INDEX `BlogTag_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BlogPostTag` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `tagId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `BlogPostTag_postId_tagId_key`(`postId`, `tagId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Report` (
    `id` VARCHAR(191) NOT NULL,
    `reportedById` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(191) NOT NULL,
    `targetId` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('PENDING', 'REVIEWED', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'PENDING',
    `reviewedBy` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Report_targetType_targetId_idx`(`targetType`, `targetId`),
    INDEX `Report_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `action` ENUM('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'SUSPEND', 'ACTIVATE', 'VIEW', 'EXPORT', 'IMPORT') NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `targetType` VARCHAR(191) NULL,
    `targetId` VARCHAR(191) NULL,
    `oldData` LONGTEXT NULL,
    `newData` LONGTEXT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_userId_idx`(`userId`),
    INDEX `AuditLog_action_idx`(`action`),
    INDEX `AuditLog_module_idx`(`module`),
    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SystemSetting` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` LONGTEXT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'STRING',
    `group` VARCHAR(191) NOT NULL DEFAULT 'GENERAL',
    `label` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `isSecret` BOOLEAN NOT NULL DEFAULT false,
    `updatedBy` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SystemSetting_key_key`(`key`),
    INDEX `SystemSetting_key_idx`(`key`),
    INDEX `SystemSetting_group_idx`(`group`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppLanguage` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `nativeName` VARCHAR(191) NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isRtl` BOOLEAN NOT NULL DEFAULT false,
    `autoTranslateReady` BOOLEAN NOT NULL DEFAULT false,
    `lastTranslatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AppLanguage_code_key`(`code`),
    INDEX `AppLanguage_code_idx`(`code`),
    INDEX `AppLanguage_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppTranslation` (
    `id` VARCHAR(191) NOT NULL,
    `languageId` VARCHAR(191) NOT NULL,
    `translationKey` VARCHAR(191) NOT NULL,
    `value` LONGTEXT NOT NULL,
    `isAutoTranslated` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AppTranslation_translationKey_idx`(`translationKey`),
    INDEX `AppTranslation_languageId_idx`(`languageId`),
    UNIQUE INDEX `AppTranslation_languageId_translationKey_key`(`languageId`, `translationKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServicePartner` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('FINANCING', 'INSURANCE') NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `website` VARCHAR(191) NULL,
    `contactEmail` VARCHAR(191) NULL,
    `apiBaseUrl` VARCHAR(191) NULL,
    `apiKey` TEXT NULL,
    `apiSecret` TEXT NULL,
    `accessToken` TEXT NULL,
    `metadata` LONGTEXT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ServicePartner_code_key`(`code`),
    UNIQUE INDEX `ServicePartner_slug_key`(`slug`),
    INDEX `ServicePartner_type_idx`(`type`),
    INDEX `ServicePartner_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SeoMeta` (
    `id` VARCHAR(191) NOT NULL,
    `page` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `keywords` TEXT NULL,
    `ogTitle` VARCHAR(191) NULL,
    `ogDesc` TEXT NULL,
    `ogImage` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SeoMeta_page_key`(`page`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Banner` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `imageUrl` VARCHAR(191) NOT NULL,
    `linkUrl` VARCHAR(191) NULL,
    `position` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `clickCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContactMessage` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `repliedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `NewsletterSubscriber` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `subscribedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `NewsletterSubscriber_userId_key`(`userId`),
    UNIQUE INDEX `NewsletterSubscriber_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyAnalytic` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `profileViews` INTEGER NOT NULL DEFAULT 0,
    `productViews` INTEGER NOT NULL DEFAULT 0,
    `inquiries` INTEGER NOT NULL DEFAULT 0,
    `rfqs` INTEGER NOT NULL DEFAULT 0,
    `messages` INTEGER NOT NULL DEFAULT 0,
    `quotations` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CompanyAnalytic_companyId_idx`(`companyId`),
    INDEX `CompanyAnalytic_date_idx`(`date`),
    UNIQUE INDEX `CompanyAnalytic_companyId_date_key`(`companyId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductAnalytic` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `views` INTEGER NOT NULL DEFAULT 0,
    `inquiries` INTEGER NOT NULL DEFAULT 0,
    `impressions` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductAnalytic_productId_idx`(`productId`),
    UNIQUE INDEX `ProductAnalytic_productId_date_key`(`productId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RolePermission` ADD CONSTRAINT `RolePermission_permissionId_fkey` FOREIGN KEY (`permissionId`) REFERENCES `Permission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefreshToken` ADD CONSTRAINT `RefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailVerificationToken` ADD CONSTRAINT `EmailVerificationToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PasswordResetToken` ADD CONSTRAINT `PasswordResetToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TwoFactorSecret` ADD CONSTRAINT `TwoFactorSecret_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Company` ADD CONSTRAINT `Company_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `Country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Company` ADD CONSTRAINT `Company_cityId_fkey` FOREIGN KEY (`cityId`) REFERENCES `City`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyUser` ADD CONSTRAINT `CompanyUser_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyUser` ADD CONSTRAINT `CompanyUser_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyProfile` ADD CONSTRAINT `CompanyProfile_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyGallery` ADD CONSTRAINT `CompanyGallery_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyDocument` ADD CONSTRAINT `CompanyDocument_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyVerification` ADD CONSTRAINT `CompanyVerification_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyVerificationSubmission` ADD CONSTRAINT `CompanyVerificationSubmission_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyVerificationSubmission` ADD CONSTRAINT `CompanyVerificationSubmission_requirementId_fkey` FOREIGN KEY (`requirementId`) REFERENCES `CompanyVerificationRequirement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyCertificate` ADD CONSTRAINT `CompanyCertificate_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyFactoryInfo` ADD CONSTRAINT `CompanyFactoryInfo_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyTradeInfo` ADD CONSTRAINT `CompanyTradeInfo_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyMarket` ADD CONSTRAINT `CompanyMarket_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyMarket` ADD CONSTRAINT `CompanyMarket_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `Country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanySocialLink` ADD CONSTRAINT `CompanySocialLink_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyVirtualTour` ADD CONSTRAINT `CompanyVirtualTour_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InspectionReport` ADD CONSTRAINT `InspectionReport_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_subcategoryId_fkey` FOREIGN KEY (`subcategoryId`) REFERENCES `SubCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_hsCodeId_fkey` FOREIGN KEY (`hsCodeId`) REFERENCES `HsCode`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_unitTypeId_fkey` FOREIGN KEY (`unitTypeId`) REFERENCES `UnitType`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_currencyId_fkey` FOREIGN KEY (`currencyId`) REFERENCES `Currency`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductImage` ADD CONSTRAINT `ProductImage_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductVideo` ADD CONSTRAINT `ProductVideo_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductVariant` ADD CONSTRAINT `ProductVariant_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductSpecification` ADD CONSTRAINT `ProductSpecification_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductDocument` ADD CONSTRAINT `ProductDocument_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductCertificate` ADD CONSTRAINT `ProductCertificate_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductPriceTier` ADD CONSTRAINT `ProductPriceTier_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductExportMarket` ADD CONSTRAINT `ProductExportMarket_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductExportMarket` ADD CONSTRAINT `ProductExportMarket_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `Country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductShippingMethod` ADD CONSTRAINT `ProductShippingMethod_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductShippingMethod` ADD CONSTRAINT `ProductShippingMethod_shippingMethodId_fkey` FOREIGN KEY (`shippingMethodId`) REFERENCES `ShippingMethod`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductPaymentTerm` ADD CONSTRAINT `ProductPaymentTerm_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductPaymentTerm` ADD CONSTRAINT `ProductPaymentTerm_paymentTermId_fkey` FOREIGN KEY (`paymentTermId`) REFERENCES `PaymentTerm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductTradeTerm` ADD CONSTRAINT `ProductTradeTerm_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductTradeTerm` ADD CONSTRAINT `ProductTradeTerm_tradeTermId_fkey` FOREIGN KEY (`tradeTermId`) REFERENCES `TradeTerm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubCategory` ADD CONSTRAINT `SubCategory_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubCategory` ADD CONSTRAINT `SubCategory_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SubCategory` ADD CONSTRAINT `SubCategory_approvedById_fkey` FOREIGN KEY (`approvedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `City` ADD CONSTRAINT `City_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `Country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Port` ADD CONSTRAINT `Port_countryId_fkey` FOREIGN KEY (`countryId`) REFERENCES `Country`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inquiry` ADD CONSTRAINT `Inquiry_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inquiry` ADD CONSTRAINT `Inquiry_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inquiry` ADD CONSTRAINT `Inquiry_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inquiry` ADD CONSTRAINT `Inquiry_destinationCountryId_fkey` FOREIGN KEY (`destinationCountryId`) REFERENCES `Country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Inquiry` ADD CONSTRAINT `Inquiry_chatRoomId_fkey` FOREIGN KEY (`chatRoomId`) REFERENCES `ChatRoom`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InquiryAttachment` ADD CONSTRAINT `InquiryAttachment_inquiryId_fkey` FOREIGN KEY (`inquiryId`) REFERENCES `Inquiry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InquiryReply` ADD CONSTRAINT `InquiryReply_inquiryId_fkey` FOREIGN KEY (`inquiryId`) REFERENCES `Inquiry`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RFQ` ADD CONSTRAINT `RFQ_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RFQ` ADD CONSTRAINT `RFQ_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RFQ` ADD CONSTRAINT `RFQ_destinationCountryId_fkey` FOREIGN KEY (`destinationCountryId`) REFERENCES `Country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RFQ` ADD CONSTRAINT `RFQ_currencyId_fkey` FOREIGN KEY (`currencyId`) REFERENCES `Currency`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RFQAttachment` ADD CONSTRAINT `RFQAttachment_rfqId_fkey` FOREIGN KEY (`rfqId`) REFERENCES `RFQ`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RFQQuotation` ADD CONSTRAINT `RFQQuotation_rfqId_fkey` FOREIGN KEY (`rfqId`) REFERENCES `RFQ`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RFQQuotation` ADD CONSTRAINT `RFQQuotation_inquiryId_fkey` FOREIGN KEY (`inquiryId`) REFERENCES `Inquiry`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RFQQuotation` ADD CONSTRAINT `RFQQuotation_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RFQQuotation` ADD CONSTRAINT `RFQQuotation_paymentTermId_fkey` FOREIGN KEY (`paymentTermId`) REFERENCES `PaymentTerm`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RFQQuotationItem` ADD CONSTRAINT `RFQQuotationItem_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `RFQQuotation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RFQQuotationAttachment` ADD CONSTRAINT `RFQQuotationAttachment_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `RFQQuotation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatRoom` ADD CONSTRAINT `ChatRoom_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatParticipant` ADD CONSTRAINT `ChatParticipant_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `ChatRoom`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatParticipant` ADD CONSTRAINT `ChatParticipant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `ChatRoom`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Message` ADD CONSTRAINT `Message_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MessageAttachment` ADD CONSTRAINT `MessageAttachment_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `Message`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MessageReadReceipt` ADD CONSTRAINT `MessageReadReceipt_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `Message`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NotificationPreference` ADD CONSTRAINT `NotificationPreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BuyerVerification` ADD CONSTRAINT `BuyerVerification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KYCProfile` ADD CONSTRAINT `KYCProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `KYCProfile` ADD CONSTRAINT `KYCProfile_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Subscription` ADD CONSTRAINT `Subscription_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `SubscriptionPlan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `Subscription`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_tradeOrderId_fkey` FOREIGN KEY (`tradeOrderId`) REFERENCES `TradeOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_sampleOrderId_fkey` FOREIGN KEY (`sampleOrderId`) REFERENCES `SampleOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TradeOrder` ADD CONSTRAINT `TradeOrder_quotationId_fkey` FOREIGN KEY (`quotationId`) REFERENCES `RFQQuotation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TradeOrder` ADD CONSTRAINT `TradeOrder_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TradeOrder` ADD CONSTRAINT `TradeOrder_supplierCompanyId_fkey` FOREIGN KEY (`supplierCompanyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EscrowAccount` ADD CONSTRAINT `EscrowAccount_tradeOrderId_fkey` FOREIGN KEY (`tradeOrderId`) REFERENCES `TradeOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EscrowAccount` ADD CONSTRAINT `EscrowAccount_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EscrowAccount` ADD CONSTRAINT `EscrowAccount_supplierCompanyId_fkey` FOREIGN KEY (`supplierCompanyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EscrowAccount` ADD CONSTRAINT `EscrowAccount_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SampleOrder` ADD CONSTRAINT `SampleOrder_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SampleOrder` ADD CONSTRAINT `SampleOrder_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SampleOrder` ADD CONSTRAINT `SampleOrder_supplierCompanyId_fkey` FOREIGN KEY (`supplierCompanyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_tradeOrderId_fkey` FOREIGN KEY (`tradeOrderId`) REFERENCES `TradeOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_sampleOrderId_fkey` FOREIGN KEY (`sampleOrderId`) REFERENCES `SampleOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_supplierCompanyId_fkey` FOREIGN KEY (`supplierCompanyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_originCountryId_fkey` FOREIGN KEY (`originCountryId`) REFERENCES `Country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Shipment` ADD CONSTRAINT `Shipment_destinationCountryId_fkey` FOREIGN KEY (`destinationCountryId`) REFERENCES `Country`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShipmentEvent` ADD CONSTRAINT `ShipmentEvent_shipmentId_fkey` FOREIGN KEY (`shipmentId`) REFERENCES `Shipment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EscrowDispute` ADD CONSTRAINT `EscrowDispute_tradeOrderId_fkey` FOREIGN KEY (`tradeOrderId`) REFERENCES `TradeOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EscrowDispute` ADD CONSTRAINT `EscrowDispute_escrowId_fkey` FOREIGN KEY (`escrowId`) REFERENCES `EscrowAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EscrowDispute` ADD CONSTRAINT `EscrowDispute_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EscrowDispute` ADD CONSTRAINT `EscrowDispute_supplierCompanyId_fkey` FOREIGN KEY (`supplierCompanyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TradeDocument` ADD CONSTRAINT `TradeDocument_tradeOrderId_fkey` FOREIGN KEY (`tradeOrderId`) REFERENCES `TradeOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TradeDocument` ADD CONSTRAINT `TradeDocument_sampleOrderId_fkey` FOREIGN KEY (`sampleOrderId`) REFERENCES `SampleOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TradeDocument` ADD CONSTRAINT `TradeDocument_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransactionRating` ADD CONSTRAINT `TransactionRating_tradeOrderId_fkey` FOREIGN KEY (`tradeOrderId`) REFERENCES `TradeOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransactionRating` ADD CONSTRAINT `TransactionRating_sampleOrderId_fkey` FOREIGN KEY (`sampleOrderId`) REFERENCES `SampleOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransactionRating` ADD CONSTRAINT `TransactionRating_authorUserId_fkey` FOREIGN KEY (`authorUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransactionRating` ADD CONSTRAINT `TransactionRating_recipientUserId_fkey` FOREIGN KEY (`recipientUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TransactionRating` ADD CONSTRAINT `TransactionRating_recipientCompanyId_fkey` FOREIGN KEY (`recipientCompanyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FraudAlert` ADD CONSTRAINT `FraudAlert_reportedById_fkey` FOREIGN KEY (`reportedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FraudAlert` ADD CONSTRAINT `FraudAlert_targetCompanyId_fkey` FOREIGN KEY (`targetCompanyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FraudAlert` ADD CONSTRAINT `FraudAlert_tradeOrderId_fkey` FOREIGN KEY (`tradeOrderId`) REFERENCES `TradeOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FraudAlert` ADD CONSTRAINT `FraudAlert_sampleOrderId_fkey` FOREIGN KEY (`sampleOrderId`) REFERENCES `SampleOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditProfile` ADD CONSTRAINT `CreditProfile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CreditProfile` ADD CONSTRAINT `CreditProfile_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformCommission` ADD CONSTRAINT `PlatformCommission_tradeOrderId_fkey` FOREIGN KEY (`tradeOrderId`) REFERENCES `TradeOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformCommission` ADD CONSTRAINT `PlatformCommission_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformCommission` ADD CONSTRAINT `PlatformCommission_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdCampaign` ADD CONSTRAINT `AdCampaign_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AdCampaign` ADD CONSTRAINT `AdCampaign_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinancingRequest` ADD CONSTRAINT `FinancingRequest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinancingRequest` ADD CONSTRAINT `FinancingRequest_requesterUserId_fkey` FOREIGN KEY (`requesterUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FinancingRequest` ADD CONSTRAINT `FinancingRequest_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `ServicePartner`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LogisticsBooking` ADD CONSTRAINT `LogisticsBooking_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LogisticsBooking` ADD CONSTRAINT `LogisticsBooking_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LogisticsBooking` ADD CONSTRAINT `LogisticsBooking_tradeOrderId_fkey` FOREIGN KEY (`tradeOrderId`) REFERENCES `TradeOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LogisticsBooking` ADD CONSTRAINT `LogisticsBooking_sampleOrderId_fkey` FOREIGN KEY (`sampleOrderId`) REFERENCES `SampleOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsurancePolicy` ADD CONSTRAINT `InsurancePolicy_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsurancePolicy` ADD CONSTRAINT `InsurancePolicy_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsurancePolicy` ADD CONSTRAINT `InsurancePolicy_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsurancePolicy` ADD CONSTRAINT `InsurancePolicy_tradeOrderId_fkey` FOREIGN KEY (`tradeOrderId`) REFERENCES `TradeOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsurancePolicy` ADD CONSTRAINT `InsurancePolicy_sampleOrderId_fkey` FOREIGN KEY (`sampleOrderId`) REFERENCES `SampleOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsurancePolicy` ADD CONSTRAINT `InsurancePolicy_partnerId_fkey` FOREIGN KEY (`partnerId`) REFERENCES `ServicePartner`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsuranceClaim` ADD CONSTRAINT `InsuranceClaim_policyId_fkey` FOREIGN KEY (`policyId`) REFERENCES `InsurancePolicy`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsuranceClaim` ADD CONSTRAINT `InsuranceClaim_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsuranceClaim` ADD CONSTRAINT `InsuranceClaim_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewMedia` ADD CONSTRAINT `ReviewMedia_reviewId_fkey` FOREIGN KEY (`reviewId`) REFERENCES `Review`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FavoriteProduct` ADD CONSTRAINT `FavoriteProduct_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FavoriteProduct` ADD CONSTRAINT `FavoriteProduct_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FavoriteCompany` ADD CONSTRAINT `FavoriteCompany_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FavoriteCompany` ADD CONSTRAINT `FavoriteCompany_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserSearchHistory` ADD CONSTRAINT `UserSearchHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserViewHistory` ADD CONSTRAINT `UserViewHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserViewHistory` ADD CONSTRAINT `UserViewHistory_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserViewHistory` ADD CONSTRAINT `UserViewHistory_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BlogPost` ADD CONSTRAINT `BlogPost_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `BlogCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BlogPostTag` ADD CONSTRAINT `BlogPostTag_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `BlogPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BlogPostTag` ADD CONSTRAINT `BlogPostTag_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `BlogTag`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Report` ADD CONSTRAINT `Report_reportedById_fkey` FOREIGN KEY (`reportedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AppTranslation` ADD CONSTRAINT `AppTranslation_languageId_fkey` FOREIGN KEY (`languageId`) REFERENCES `AppLanguage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContactMessage` ADD CONSTRAINT `ContactMessage_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `NewsletterSubscriber` ADD CONSTRAINT `NewsletterSubscriber_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyAnalytic` ADD CONSTRAINT `CompanyAnalytic_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductAnalytic` ADD CONSTRAINT `ProductAnalytic_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

