-- AlterTable
ALTER TABLE `sampleorder` MODIFY `platformCommissionRate` DECIMAL(5, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `tradeorder` MODIFY `platformCommissionRate` DECIMAL(5, 2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `ServiceFeeCategory` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ServiceFeeCategory_code_key`(`code`),
    INDEX `ServiceFeeCategory_isActive_idx`(`isActive`),
    INDEX `ServiceFeeCategory_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceFeeSetting` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `feeType` ENUM('PERCENTAGE', 'FIXED', 'FREE') NOT NULL DEFAULT 'FIXED',
    `feeValue` DECIMAL(15, 4) NOT NULL DEFAULT 0,
    `minFee` DECIMAL(15, 2) NULL,
    `maxFee` DECIMAL(15, 2) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `appliesTo` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `description` TEXT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `updatedById` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ServiceFeeSetting_code_key`(`code`),
    INDEX `ServiceFeeSetting_categoryId_idx`(`categoryId`),
    INDEX `ServiceFeeSetting_isActive_idx`(`isActive`),
    INDEX `ServiceFeeSetting_status_idx`(`status`),
    INDEX `ServiceFeeSetting_updatedById_idx`(`updatedById`),
    INDEX `ServiceFeeSetting_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformRevenueLedger` (
    `id` VARCHAR(191) NOT NULL,
    `sourceType` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NULL,
    `orderId` VARCHAR(191) NULL,
    `tradeOrderId` VARCHAR(191) NULL,
    `sampleOrderId` VARCHAR(191) NULL,
    `paymentId` VARCHAR(191) NULL,
    `grossAmount` DECIMAL(15, 2) NOT NULL,
    `feeAmount` DECIMAL(15, 2) NOT NULL,
    `netAmount` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `status` ENUM('PENDING', 'POSTED', 'REVERSED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `revenueType` ENUM('CREDIT', 'REVERSAL') NOT NULL DEFAULT 'CREDIT',
    `refundableAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `nonRefundableAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `taxSettingId` VARCHAR(191) NULL,
    `parentLedgerId` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PlatformRevenueLedger_sourceType_sourceId_idx`(`sourceType`, `sourceId`),
    INDEX `PlatformRevenueLedger_userId_idx`(`userId`),
    INDEX `PlatformRevenueLedger_companyId_idx`(`companyId`),
    INDEX `PlatformRevenueLedger_orderId_idx`(`orderId`),
    INDEX `PlatformRevenueLedger_tradeOrderId_idx`(`tradeOrderId`),
    INDEX `PlatformRevenueLedger_sampleOrderId_idx`(`sampleOrderId`),
    INDEX `PlatformRevenueLedger_paymentId_idx`(`paymentId`),
    INDEX `PlatformRevenueLedger_status_idx`(`status`),
    INDEX `PlatformRevenueLedger_revenueType_idx`(`revenueType`),
    INDEX `PlatformRevenueLedger_taxSettingId_idx`(`taxSettingId`),
    INDEX `PlatformRevenueLedger_parentLedgerId_idx`(`parentLedgerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SupplierPayoutLedger` (
    `id` VARCHAR(191) NOT NULL,
    `supplierId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NULL,
    `tradeOrderId` VARCHAR(191) NULL,
    `paymentId` VARCHAR(191) NULL,
    `revenueLedgerId` VARCHAR(191) NULL,
    `grossOrderAmount` DECIMAL(15, 2) NOT NULL,
    `platformFee` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `escrowFee` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `shippingFee` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `otherDeduction` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `netPayoutAmount` DECIMAL(15, 2) NOT NULL,
    `payoutStatus` ENUM('PENDING', 'PROCESSING', 'PAID', 'HELD', 'REVERSED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SupplierPayoutLedger_supplierId_idx`(`supplierId`),
    INDEX `SupplierPayoutLedger_companyId_idx`(`companyId`),
    INDEX `SupplierPayoutLedger_orderId_idx`(`orderId`),
    INDEX `SupplierPayoutLedger_tradeOrderId_idx`(`tradeOrderId`),
    INDEX `SupplierPayoutLedger_paymentId_idx`(`paymentId`),
    INDEX `SupplierPayoutLedger_revenueLedgerId_idx`(`revenueLedgerId`),
    INDEX `SupplierPayoutLedger_payoutStatus_idx`(`payoutStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EscrowTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `escrowAccountId` VARCHAR(191) NOT NULL,
    `tradeOrderId` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `feeAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `supplierPayable` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `platformProfit` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `status` ENUM('DRAFT', 'PENDING', 'AWAITING_PAYMENT', 'PAID', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `snapshotId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `EscrowTransaction_escrowAccountId_idx`(`escrowAccountId`),
    INDEX `EscrowTransaction_tradeOrderId_idx`(`tradeOrderId`),
    INDEX `EscrowTransaction_paymentId_idx`(`paymentId`),
    INDEX `EscrowTransaction_snapshotId_idx`(`snapshotId`),
    INDEX `EscrowTransaction_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShippingCommission` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `tradeOrderId` VARCHAR(191) NULL,
    `sampleOrderId` VARCHAR(191) NULL,
    `logisticsBookingId` VARCHAR(191) NULL,
    `originalCost` DECIMAL(15, 2) NOT NULL,
    `commissionAmount` DECIMAL(15, 2) NOT NULL,
    `finalBuyerCost` DECIMAL(15, 2) NOT NULL,
    `platformProfit` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `snapshotId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ShippingCommission_companyId_idx`(`companyId`),
    INDEX `ShippingCommission_tradeOrderId_idx`(`tradeOrderId`),
    INDEX `ShippingCommission_sampleOrderId_idx`(`sampleOrderId`),
    INDEX `ShippingCommission_logisticsBookingId_idx`(`logisticsBookingId`),
    INDEX `ShippingCommission_snapshotId_idx`(`snapshotId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VerificationRequest` (
    `id` VARCHAR(191) NOT NULL,
    `requesterUserId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `verificationType` VARCHAR(191) NOT NULL,
    `serviceFeeSettingId` VARCHAR(191) NULL,
    `paymentId` VARCHAR(191) NULL,
    `revenueLedgerId` VARCHAR(191) NULL,
    `snapshotId` VARCHAR(191) NULL,
    `paymentStatus` ENUM('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `verificationStatus` ENUM('DRAFT', 'PENDING', 'AWAITING_PAYMENT', 'PAID', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `feeAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `VerificationRequest_requesterUserId_idx`(`requesterUserId`),
    INDEX `VerificationRequest_companyId_idx`(`companyId`),
    INDEX `VerificationRequest_serviceFeeSettingId_idx`(`serviceFeeSettingId`),
    INDEX `VerificationRequest_paymentId_idx`(`paymentId`),
    INDEX `VerificationRequest_revenueLedgerId_idx`(`revenueLedgerId`),
    INDEX `VerificationRequest_snapshotId_idx`(`snapshotId`),
    INDEX `VerificationRequest_paymentStatus_idx`(`paymentStatus`),
    INDEX `VerificationRequest_verificationStatus_idx`(`verificationStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InspectionRequest` (
    `id` VARCHAR(191) NOT NULL,
    `requesterUserId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `inspectionType` VARCHAR(191) NOT NULL,
    `providerName` VARCHAR(191) NULL,
    `inspectionCost` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `platformCommission` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `providerPayout` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `serviceFeeSettingId` VARCHAR(191) NULL,
    `revenueLedgerId` VARCHAR(191) NULL,
    `snapshotId` VARCHAR(191) NULL,
    `paymentStatus` ENUM('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `requestStatus` ENUM('DRAFT', 'PENDING', 'AWAITING_PAYMENT', 'PAID', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InspectionRequest_requesterUserId_idx`(`requesterUserId`),
    INDEX `InspectionRequest_companyId_idx`(`companyId`),
    INDEX `InspectionRequest_serviceFeeSettingId_idx`(`serviceFeeSettingId`),
    INDEX `InspectionRequest_revenueLedgerId_idx`(`revenueLedgerId`),
    INDEX `InspectionRequest_snapshotId_idx`(`snapshotId`),
    INDEX `InspectionRequest_paymentStatus_idx`(`paymentStatus`),
    INDEX `InspectionRequest_requestStatus_idx`(`requestStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InsuranceRequest` (
    `id` VARCHAR(191) NOT NULL,
    `requesterUserId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `insuranceType` VARCHAR(191) NOT NULL,
    `providerName` VARCHAR(191) NULL,
    `insuranceCost` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `platformCommission` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `providerPayout` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `serviceFeeSettingId` VARCHAR(191) NULL,
    `revenueLedgerId` VARCHAR(191) NULL,
    `snapshotId` VARCHAR(191) NULL,
    `paymentStatus` ENUM('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `requestStatus` ENUM('DRAFT', 'PENDING', 'AWAITING_PAYMENT', 'PAID', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InsuranceRequest_requesterUserId_idx`(`requesterUserId`),
    INDEX `InsuranceRequest_companyId_idx`(`companyId`),
    INDEX `InsuranceRequest_serviceFeeSettingId_idx`(`serviceFeeSettingId`),
    INDEX `InsuranceRequest_revenueLedgerId_idx`(`revenueLedgerId`),
    INDEX `InsuranceRequest_snapshotId_idx`(`snapshotId`),
    INDEX `InsuranceRequest_paymentStatus_idx`(`paymentStatus`),
    INDEX `InsuranceRequest_requestStatus_idx`(`requestStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AiPlan` (
    `id` VARCHAR(191) NOT NULL,
    `serviceFeeSettingId` VARCHAR(191) NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `monthlyPrice` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `featureLimits` LONGTEXT NULL,
    `usageLimits` LONGTEXT NULL,
    `features` LONGTEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AiPlan_code_key`(`code`),
    INDEX `AiPlan_serviceFeeSettingId_idx`(`serviceFeeSettingId`),
    INDEX `AiPlan_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AiSubscription` (
    `id` VARCHAR(191) NOT NULL,
    `planId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NULL,
    `revenueLedgerId` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'EXPIRED', 'CANCELLED', 'TRIAL', 'PAST_DUE') NOT NULL DEFAULT 'ACTIVE',
    `renewalDate` DATETIME(3) NOT NULL,
    `startsAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endsAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `usageSnapshot` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AiSubscription_planId_idx`(`planId`),
    INDEX `AiSubscription_userId_idx`(`userId`),
    INDEX `AiSubscription_companyId_idx`(`companyId`),
    INDEX `AiSubscription_revenueLedgerId_idx`(`revenueLedgerId`),
    INDEX `AiSubscription_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AiUsageLog` (
    `id` VARCHAR(191) NOT NULL,
    `subscriptionId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `featureCode` VARCHAR(191) NOT NULL,
    `usageCount` INTEGER NOT NULL DEFAULT 1,
    `metadata` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AiUsageLog_subscriptionId_idx`(`subscriptionId`),
    INDEX `AiUsageLog_userId_idx`(`userId`),
    INDEX `AiUsageLog_featureCode_idx`(`featureCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RfqCreditPackage` (
    `id` VARCHAR(191) NOT NULL,
    `serviceFeeSettingId` VARCHAR(191) NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `credits` INTEGER NOT NULL,
    `price` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `expiryDays` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RfqCreditPackage_code_key`(`code`),
    INDEX `RfqCreditPackage_serviceFeeSettingId_idx`(`serviceFeeSettingId`),
    INDEX `RfqCreditPackage_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RfqCreditWallet` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NULL,
    `freeCredits` INTEGER NOT NULL DEFAULT 0,
    `purchasedCredits` INTEGER NOT NULL DEFAULT 0,
    `usedCredits` INTEGER NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RfqCreditWallet_userId_idx`(`userId`),
    INDEX `RfqCreditWallet_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RfqCreditTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `walletId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `packageId` VARCHAR(191) NULL,
    `revenueLedgerId` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `credits` INTEGER NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `balanceAfter` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RfqCreditTransaction_walletId_idx`(`walletId`),
    INDEX `RfqCreditTransaction_userId_idx`(`userId`),
    INDEX `RfqCreditTransaction_packageId_idx`(`packageId`),
    INDEX `RfqCreditTransaction_revenueLedgerId_idx`(`revenueLedgerId`),
    INDEX `RfqCreditTransaction_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TradeDocumentRequest` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NULL,
    `tradeOrderId` VARCHAR(191) NULL,
    `sampleOrderId` VARCHAR(191) NULL,
    `documentType` VARCHAR(191) NOT NULL,
    `serviceFeeSettingId` VARCHAR(191) NULL,
    `revenueLedgerId` VARCHAR(191) NULL,
    `snapshotId` VARCHAR(191) NULL,
    `paymentStatus` ENUM('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `requestStatus` ENUM('DRAFT', 'PENDING', 'AWAITING_PAYMENT', 'PAID', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `feeAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TradeDocumentRequest_userId_idx`(`userId`),
    INDEX `TradeDocumentRequest_companyId_idx`(`companyId`),
    INDEX `TradeDocumentRequest_tradeOrderId_idx`(`tradeOrderId`),
    INDEX `TradeDocumentRequest_sampleOrderId_idx`(`sampleOrderId`),
    INDEX `TradeDocumentRequest_serviceFeeSettingId_idx`(`serviceFeeSettingId`),
    INDEX `TradeDocumentRequest_revenueLedgerId_idx`(`revenueLedgerId`),
    INDEX `TradeDocumentRequest_snapshotId_idx`(`snapshotId`),
    INDEX `TradeDocumentRequest_paymentStatus_idx`(`paymentStatus`),
    INDEX `TradeDocumentRequest_requestStatus_idx`(`requestStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ComplianceServiceRequest` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NULL,
    `serviceName` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `serviceFeeSettingId` VARCHAR(191) NULL,
    `revenueLedgerId` VARCHAR(191) NULL,
    `snapshotId` VARCHAR(191) NULL,
    `paymentStatus` ENUM('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    `requestStatus` ENUM('DRAFT', 'PENDING', 'AWAITING_PAYMENT', 'PAID', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `feeAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ComplianceServiceRequest_userId_idx`(`userId`),
    INDEX `ComplianceServiceRequest_companyId_idx`(`companyId`),
    INDEX `ComplianceServiceRequest_serviceFeeSettingId_idx`(`serviceFeeSettingId`),
    INDEX `ComplianceServiceRequest_revenueLedgerId_idx`(`revenueLedgerId`),
    INDEX `ComplianceServiceRequest_snapshotId_idx`(`snapshotId`),
    INDEX `ComplianceServiceRequest_paymentStatus_idx`(`paymentStatus`),
    INDEX `ComplianceServiceRequest_requestStatus_idx`(`requestStatus`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SampleOrderFee` (
    `id` VARCHAR(191) NOT NULL,
    `sampleOrderId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `serviceFeeSettingId` VARCHAR(191) NULL,
    `revenueLedgerId` VARCHAR(191) NULL,
    `snapshotId` VARCHAR(191) NULL,
    `sampleProductCost` DECIMAL(15, 2) NOT NULL,
    `sampleServiceFee` DECIMAL(15, 2) NOT NULL,
    `shippingCost` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalBuyerPayable` DECIMAL(15, 2) NOT NULL,
    `platformProfit` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SampleOrderFee_sampleOrderId_idx`(`sampleOrderId`),
    INDEX `SampleOrderFee_userId_idx`(`userId`),
    INDEX `SampleOrderFee_companyId_idx`(`companyId`),
    INDEX `SampleOrderFee_serviceFeeSettingId_idx`(`serviceFeeSettingId`),
    INDEX `SampleOrderFee_revenueLedgerId_idx`(`revenueLedgerId`),
    INDEX `SampleOrderFee_snapshotId_idx`(`snapshotId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeeCalculationSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `sourceType` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NULL,
    `orderId` VARCHAR(191) NULL,
    `tradeOrderId` VARCHAR(191) NULL,
    `sampleOrderId` VARCHAR(191) NULL,
    `paymentId` VARCHAR(191) NULL,
    `serviceFeeSettingId` VARCHAR(191) NULL,
    `revenueLedgerId` VARCHAR(191) NULL,
    `baseAmount` DECIMAL(15, 2) NOT NULL,
    `feeAmount` DECIMAL(15, 2) NOT NULL,
    `taxAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `calculationData` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FeeCalculationSnapshot_code_idx`(`code`),
    INDEX `FeeCalculationSnapshot_sourceType_sourceId_idx`(`sourceType`, `sourceId`),
    INDEX `FeeCalculationSnapshot_userId_idx`(`userId`),
    INDEX `FeeCalculationSnapshot_companyId_idx`(`companyId`),
    INDEX `FeeCalculationSnapshot_orderId_idx`(`orderId`),
    INDEX `FeeCalculationSnapshot_tradeOrderId_idx`(`tradeOrderId`),
    INDEX `FeeCalculationSnapshot_sampleOrderId_idx`(`sampleOrderId`),
    INDEX `FeeCalculationSnapshot_paymentId_idx`(`paymentId`),
    INDEX `FeeCalculationSnapshot_serviceFeeSettingId_idx`(`serviceFeeSettingId`),
    INDEX `FeeCalculationSnapshot_revenueLedgerId_idx`(`revenueLedgerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DisputeCase` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NULL,
    `chargedCompanyId` VARCHAR(191) NULL,
    `tradeOrderId` VARCHAR(191) NULL,
    `sampleOrderId` VARCHAR(191) NULL,
    `paymentId` VARCHAR(191) NULL,
    `revenueLedgerId` VARCHAR(191) NULL,
    `serviceFeeSettingId` VARCHAR(191) NULL,
    `openedById` VARCHAR(191) NOT NULL,
    `assignedToId` VARCHAR(191) NULL,
    `disputeType` VARCHAR(191) NOT NULL,
    `disputeReason` VARCHAR(191) NOT NULL,
    `status` ENUM('OPEN', 'UNDER_REVIEW', 'MEDIATION', 'RESOLVED', 'CLOSED', 'REJECTED') NOT NULL DEFAULT 'OPEN',
    `payer` ENUM('BUYER', 'SUPPLIER', 'BOTH', 'LOSING_PARTY', 'NONE') NOT NULL DEFAULT 'NONE',
    `feeAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `refundAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `penaltyAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `resolutionResult` ENUM('BUYER_REFUND', 'SUPPLIER_RELEASE', 'SPLIT_SETTLEMENT', 'PENALTY_APPLIED', 'REJECTED', 'OTHER') NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DisputeCase_companyId_idx`(`companyId`),
    INDEX `DisputeCase_chargedCompanyId_idx`(`chargedCompanyId`),
    INDEX `DisputeCase_tradeOrderId_idx`(`tradeOrderId`),
    INDEX `DisputeCase_sampleOrderId_idx`(`sampleOrderId`),
    INDEX `DisputeCase_paymentId_idx`(`paymentId`),
    INDEX `DisputeCase_revenueLedgerId_idx`(`revenueLedgerId`),
    INDEX `DisputeCase_serviceFeeSettingId_idx`(`serviceFeeSettingId`),
    INDEX `DisputeCase_openedById_idx`(`openedById`),
    INDEX `DisputeCase_assignedToId_idx`(`assignedToId`),
    INDEX `DisputeCase_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DisputeEvidence` (
    `id` VARCHAR(191) NOT NULL,
    `disputeCaseId` VARCHAR(191) NOT NULL,
    `uploadedById` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `fileUrl` TEXT NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DisputeEvidence_disputeCaseId_idx`(`disputeCaseId`),
    INDEX `DisputeEvidence_uploadedById_idx`(`uploadedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DisputeResolution` (
    `id` VARCHAR(191) NOT NULL,
    `disputeCaseId` VARCHAR(191) NOT NULL,
    `resolvedById` VARCHAR(191) NOT NULL,
    `result` ENUM('BUYER_REFUND', 'SUPPLIER_RELEASE', 'SPLIT_SETTLEMENT', 'PENALTY_APPLIED', 'REJECTED', 'OTHER') NOT NULL,
    `summary` TEXT NULL,
    `refundAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `penaltyAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `DisputeResolution_disputeCaseId_idx`(`disputeCaseId`),
    INDEX `DisputeResolution_resolvedById_idx`(`resolvedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefundRequest` (
    `id` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NULL,
    `disputeCaseId` VARCHAR(191) NULL,
    `revenueLedgerId` VARCHAR(191) NULL,
    `requestedById` VARCHAR(191) NOT NULL,
    `reviewedById` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `originalPaidAmount` DECIMAL(15, 2) NOT NULL,
    `refundableAmount` DECIMAL(15, 2) NOT NULL,
    `nonRefundableFee` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `gatewayFeeLoss` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `supplierAdjustment` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `approvedAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `reason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RefundRequest_paymentId_idx`(`paymentId`),
    INDEX `RefundRequest_companyId_idx`(`companyId`),
    INDEX `RefundRequest_disputeCaseId_idx`(`disputeCaseId`),
    INDEX `RefundRequest_revenueLedgerId_idx`(`revenueLedgerId`),
    INDEX `RefundRequest_requestedById_idx`(`requestedById`),
    INDEX `RefundRequest_reviewedById_idx`(`reviewedById`),
    INDEX `RefundRequest_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChargebackCase` (
    `id` VARCHAR(191) NOT NULL,
    `paymentId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NULL,
    `revenueLedgerId` VARCHAR(191) NULL,
    `openedById` VARCHAR(191) NOT NULL,
    `status` ENUM('OPEN', 'UNDER_REVIEW', 'WON', 'LOST', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `originalPaidAmount` DECIMAL(15, 2) NOT NULL,
    `refundableAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `nonRefundableFee` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `gatewayFeeLoss` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `supplierAdjustment` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ChargebackCase_paymentId_idx`(`paymentId`),
    INDEX `ChargebackCase_companyId_idx`(`companyId`),
    INDEX `ChargebackCase_revenueLedgerId_idx`(`revenueLedgerId`),
    INDEX `ChargebackCase_openedById_idx`(`openedById`),
    INDEX `ChargebackCase_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaxVatSetting` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NOT NULL,
    `stateRegion` VARCHAR(191) NULL,
    `taxName` VARCHAR(191) NOT NULL,
    `taxRate` DECIMAL(8, 4) NOT NULL,
    `taxType` ENUM('VAT', 'GST', 'SALES_TAX', 'WITHHOLDING', 'OTHER') NOT NULL,
    `applicationMode` ENUM('INCLUSIVE', 'EXCLUSIVE') NOT NULL DEFAULT 'EXCLUSIVE',
    `appliesToBuyer` BOOLEAN NOT NULL DEFAULT true,
    `appliesToSupplier` BOOLEAN NOT NULL DEFAULT false,
    `appliesToServiceFee` BOOLEAN NOT NULL DEFAULT true,
    `appliesToSubscription` BOOLEAN NOT NULL DEFAULT true,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `updatedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `TaxVatSetting_code_key`(`code`),
    INDEX `TaxVatSetting_country_idx`(`country`),
    INDEX `TaxVatSetting_stateRegion_idx`(`stateRegion`),
    INDEX `TaxVatSetting_isActive_idx`(`isActive`),
    INDEX `TaxVatSetting_updatedById_idx`(`updatedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaxCalculationSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `sourceType` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `paymentId` VARCHAR(191) NULL,
    `revenueLedgerId` VARCHAR(191) NULL,
    `taxSettingId` VARCHAR(191) NULL,
    `baseAmount` DECIMAL(15, 2) NOT NULL,
    `feeAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(15, 2) NOT NULL,
    `totalAmount` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `snapshotData` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TaxCalculationSnapshot_sourceType_sourceId_idx`(`sourceType`, `sourceId`),
    INDEX `TaxCalculationSnapshot_userId_idx`(`userId`),
    INDEX `TaxCalculationSnapshot_paymentId_idx`(`paymentId`),
    INDEX `TaxCalculationSnapshot_revenueLedgerId_idx`(`revenueLedgerId`),
    INDEX `TaxCalculationSnapshot_taxSettingId_idx`(`taxSettingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RevenueReversalLedger` (
    `id` VARCHAR(191) NOT NULL,
    `originalLedgerId` VARCHAR(191) NOT NULL,
    `reversalLedgerId` VARCHAR(191) NULL,
    `paymentId` VARCHAR(191) NULL,
    `refundRequestId` VARCHAR(191) NULL,
    `chargebackCaseId` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `reason` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RevenueReversalLedger_originalLedgerId_idx`(`originalLedgerId`),
    INDEX `RevenueReversalLedger_reversalLedgerId_idx`(`reversalLedgerId`),
    INDEX `RevenueReversalLedger_paymentId_idx`(`paymentId`),
    INDEX `RevenueReversalLedger_refundRequestId_idx`(`refundRequestId`),
    INDEX `RevenueReversalLedger_chargebackCaseId_idx`(`chargebackCaseId`),
    INDEX `RevenueReversalLedger_companyId_idx`(`companyId`),
    INDEX `RevenueReversalLedger_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ServiceFeeSetting` ADD CONSTRAINT `ServiceFeeSetting_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `ServiceFeeCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceFeeSetting` ADD CONSTRAINT `ServiceFeeSetting_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceFeeSetting` ADD CONSTRAINT `ServiceFeeSetting_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformRevenueLedger` ADD CONSTRAINT `PlatformRevenueLedger_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformRevenueLedger` ADD CONSTRAINT `PlatformRevenueLedger_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformRevenueLedger` ADD CONSTRAINT `PlatformRevenueLedger_tradeOrderId_fkey` FOREIGN KEY (`tradeOrderId`) REFERENCES `TradeOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformRevenueLedger` ADD CONSTRAINT `PlatformRevenueLedger_sampleOrderId_fkey` FOREIGN KEY (`sampleOrderId`) REFERENCES `SampleOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformRevenueLedger` ADD CONSTRAINT `PlatformRevenueLedger_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformRevenueLedger` ADD CONSTRAINT `PlatformRevenueLedger_taxSettingId_fkey` FOREIGN KEY (`taxSettingId`) REFERENCES `TaxVatSetting`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformRevenueLedger` ADD CONSTRAINT `PlatformRevenueLedger_parentLedgerId_fkey` FOREIGN KEY (`parentLedgerId`) REFERENCES `PlatformRevenueLedger`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplierPayoutLedger` ADD CONSTRAINT `SupplierPayoutLedger_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplierPayoutLedger` ADD CONSTRAINT `SupplierPayoutLedger_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplierPayoutLedger` ADD CONSTRAINT `SupplierPayoutLedger_tradeOrderId_fkey` FOREIGN KEY (`tradeOrderId`) REFERENCES `TradeOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplierPayoutLedger` ADD CONSTRAINT `SupplierPayoutLedger_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SupplierPayoutLedger` ADD CONSTRAINT `SupplierPayoutLedger_revenueLedgerId_fkey` FOREIGN KEY (`revenueLedgerId`) REFERENCES `PlatformRevenueLedger`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EscrowTransaction` ADD CONSTRAINT `EscrowTransaction_escrowAccountId_fkey` FOREIGN KEY (`escrowAccountId`) REFERENCES `EscrowAccount`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EscrowTransaction` ADD CONSTRAINT `EscrowTransaction_tradeOrderId_fkey` FOREIGN KEY (`tradeOrderId`) REFERENCES `TradeOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EscrowTransaction` ADD CONSTRAINT `EscrowTransaction_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EscrowTransaction` ADD CONSTRAINT `EscrowTransaction_snapshotId_fkey` FOREIGN KEY (`snapshotId`) REFERENCES `FeeCalculationSnapshot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShippingCommission` ADD CONSTRAINT `ShippingCommission_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShippingCommission` ADD CONSTRAINT `ShippingCommission_tradeOrderId_fkey` FOREIGN KEY (`tradeOrderId`) REFERENCES `TradeOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShippingCommission` ADD CONSTRAINT `ShippingCommission_sampleOrderId_fkey` FOREIGN KEY (`sampleOrderId`) REFERENCES `SampleOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShippingCommission` ADD CONSTRAINT `ShippingCommission_logisticsBookingId_fkey` FOREIGN KEY (`logisticsBookingId`) REFERENCES `LogisticsBooking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ShippingCommission` ADD CONSTRAINT `ShippingCommission_snapshotId_fkey` FOREIGN KEY (`snapshotId`) REFERENCES `FeeCalculationSnapshot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VerificationRequest` ADD CONSTRAINT `VerificationRequest_requesterUserId_fkey` FOREIGN KEY (`requesterUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VerificationRequest` ADD CONSTRAINT `VerificationRequest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VerificationRequest` ADD CONSTRAINT `VerificationRequest_serviceFeeSettingId_fkey` FOREIGN KEY (`serviceFeeSettingId`) REFERENCES `ServiceFeeSetting`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VerificationRequest` ADD CONSTRAINT `VerificationRequest_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VerificationRequest` ADD CONSTRAINT `VerificationRequest_revenueLedgerId_fkey` FOREIGN KEY (`revenueLedgerId`) REFERENCES `PlatformRevenueLedger`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VerificationRequest` ADD CONSTRAINT `VerificationRequest_snapshotId_fkey` FOREIGN KEY (`snapshotId`) REFERENCES `FeeCalculationSnapshot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InspectionRequest` ADD CONSTRAINT `InspectionRequest_requesterUserId_fkey` FOREIGN KEY (`requesterUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InspectionRequest` ADD CONSTRAINT `InspectionRequest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InspectionRequest` ADD CONSTRAINT `InspectionRequest_serviceFeeSettingId_fkey` FOREIGN KEY (`serviceFeeSettingId`) REFERENCES `ServiceFeeSetting`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InspectionRequest` ADD CONSTRAINT `InspectionRequest_revenueLedgerId_fkey` FOREIGN KEY (`revenueLedgerId`) REFERENCES `PlatformRevenueLedger`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InspectionRequest` ADD CONSTRAINT `InspectionRequest_snapshotId_fkey` FOREIGN KEY (`snapshotId`) REFERENCES `FeeCalculationSnapshot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsuranceRequest` ADD CONSTRAINT `InsuranceRequest_requesterUserId_fkey` FOREIGN KEY (`requesterUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsuranceRequest` ADD CONSTRAINT `InsuranceRequest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsuranceRequest` ADD CONSTRAINT `InsuranceRequest_serviceFeeSettingId_fkey` FOREIGN KEY (`serviceFeeSettingId`) REFERENCES `ServiceFeeSetting`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsuranceRequest` ADD CONSTRAINT `InsuranceRequest_revenueLedgerId_fkey` FOREIGN KEY (`revenueLedgerId`) REFERENCES `PlatformRevenueLedger`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InsuranceRequest` ADD CONSTRAINT `InsuranceRequest_snapshotId_fkey` FOREIGN KEY (`snapshotId`) REFERENCES `FeeCalculationSnapshot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiPlan` ADD CONSTRAINT `AiPlan_serviceFeeSettingId_fkey` FOREIGN KEY (`serviceFeeSettingId`) REFERENCES `ServiceFeeSetting`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiSubscription` ADD CONSTRAINT `AiSubscription_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `AiPlan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiSubscription` ADD CONSTRAINT `AiSubscription_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiSubscription` ADD CONSTRAINT `AiSubscription_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiSubscription` ADD CONSTRAINT `AiSubscription_revenueLedgerId_fkey` FOREIGN KEY (`revenueLedgerId`) REFERENCES `PlatformRevenueLedger`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiUsageLog` ADD CONSTRAINT `AiUsageLog_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `AiSubscription`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AiUsageLog` ADD CONSTRAINT `AiUsageLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RfqCreditPackage` ADD CONSTRAINT `RfqCreditPackage_serviceFeeSettingId_fkey` FOREIGN KEY (`serviceFeeSettingId`) REFERENCES `ServiceFeeSetting`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RfqCreditWallet` ADD CONSTRAINT `RfqCreditWallet_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RfqCreditWallet` ADD CONSTRAINT `RfqCreditWallet_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RfqCreditTransaction` ADD CONSTRAINT `RfqCreditTransaction_walletId_fkey` FOREIGN KEY (`walletId`) REFERENCES `RfqCreditWallet`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RfqCreditTransaction` ADD CONSTRAINT `RfqCreditTransaction_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RfqCreditTransaction` ADD CONSTRAINT `RfqCreditTransaction_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `RfqCreditPackage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RfqCreditTransaction` ADD CONSTRAINT `RfqCreditTransaction_revenueLedgerId_fkey` FOREIGN KEY (`revenueLedgerId`) REFERENCES `PlatformRevenueLedger`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TradeDocumentRequest` ADD CONSTRAINT `TradeDocumentRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TradeDocumentRequest` ADD CONSTRAINT `TradeDocumentRequest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TradeDocumentRequest` ADD CONSTRAINT `TradeDocumentRequest_tradeOrderId_fkey` FOREIGN KEY (`tradeOrderId`) REFERENCES `TradeOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TradeDocumentRequest` ADD CONSTRAINT `TradeDocumentRequest_sampleOrderId_fkey` FOREIGN KEY (`sampleOrderId`) REFERENCES `SampleOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TradeDocumentRequest` ADD CONSTRAINT `TradeDocumentRequest_serviceFeeSettingId_fkey` FOREIGN KEY (`serviceFeeSettingId`) REFERENCES `ServiceFeeSetting`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TradeDocumentRequest` ADD CONSTRAINT `TradeDocumentRequest_revenueLedgerId_fkey` FOREIGN KEY (`revenueLedgerId`) REFERENCES `PlatformRevenueLedger`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TradeDocumentRequest` ADD CONSTRAINT `TradeDocumentRequest_snapshotId_fkey` FOREIGN KEY (`snapshotId`) REFERENCES `FeeCalculationSnapshot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComplianceServiceRequest` ADD CONSTRAINT `ComplianceServiceRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComplianceServiceRequest` ADD CONSTRAINT `ComplianceServiceRequest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComplianceServiceRequest` ADD CONSTRAINT `ComplianceServiceRequest_serviceFeeSettingId_fkey` FOREIGN KEY (`serviceFeeSettingId`) REFERENCES `ServiceFeeSetting`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComplianceServiceRequest` ADD CONSTRAINT `ComplianceServiceRequest_revenueLedgerId_fkey` FOREIGN KEY (`revenueLedgerId`) REFERENCES `PlatformRevenueLedger`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ComplianceServiceRequest` ADD CONSTRAINT `ComplianceServiceRequest_snapshotId_fkey` FOREIGN KEY (`snapshotId`) REFERENCES `FeeCalculationSnapshot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SampleOrderFee` ADD CONSTRAINT `SampleOrderFee_sampleOrderId_fkey` FOREIGN KEY (`sampleOrderId`) REFERENCES `SampleOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SampleOrderFee` ADD CONSTRAINT `SampleOrderFee_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SampleOrderFee` ADD CONSTRAINT `SampleOrderFee_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SampleOrderFee` ADD CONSTRAINT `SampleOrderFee_serviceFeeSettingId_fkey` FOREIGN KEY (`serviceFeeSettingId`) REFERENCES `ServiceFeeSetting`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SampleOrderFee` ADD CONSTRAINT `SampleOrderFee_revenueLedgerId_fkey` FOREIGN KEY (`revenueLedgerId`) REFERENCES `PlatformRevenueLedger`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SampleOrderFee` ADD CONSTRAINT `SampleOrderFee_snapshotId_fkey` FOREIGN KEY (`snapshotId`) REFERENCES `FeeCalculationSnapshot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeeCalculationSnapshot` ADD CONSTRAINT `FeeCalculationSnapshot_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeeCalculationSnapshot` ADD CONSTRAINT `FeeCalculationSnapshot_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeeCalculationSnapshot` ADD CONSTRAINT `FeeCalculationSnapshot_tradeOrderId_fkey` FOREIGN KEY (`tradeOrderId`) REFERENCES `TradeOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeeCalculationSnapshot` ADD CONSTRAINT `FeeCalculationSnapshot_sampleOrderId_fkey` FOREIGN KEY (`sampleOrderId`) REFERENCES `SampleOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeeCalculationSnapshot` ADD CONSTRAINT `FeeCalculationSnapshot_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeeCalculationSnapshot` ADD CONSTRAINT `FeeCalculationSnapshot_serviceFeeSettingId_fkey` FOREIGN KEY (`serviceFeeSettingId`) REFERENCES `ServiceFeeSetting`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeeCalculationSnapshot` ADD CONSTRAINT `FeeCalculationSnapshot_revenueLedgerId_fkey` FOREIGN KEY (`revenueLedgerId`) REFERENCES `PlatformRevenueLedger`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DisputeCase` ADD CONSTRAINT `DisputeCase_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DisputeCase` ADD CONSTRAINT `DisputeCase_chargedCompanyId_fkey` FOREIGN KEY (`chargedCompanyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DisputeCase` ADD CONSTRAINT `DisputeCase_tradeOrderId_fkey` FOREIGN KEY (`tradeOrderId`) REFERENCES `TradeOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DisputeCase` ADD CONSTRAINT `DisputeCase_sampleOrderId_fkey` FOREIGN KEY (`sampleOrderId`) REFERENCES `SampleOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DisputeCase` ADD CONSTRAINT `DisputeCase_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DisputeCase` ADD CONSTRAINT `DisputeCase_revenueLedgerId_fkey` FOREIGN KEY (`revenueLedgerId`) REFERENCES `PlatformRevenueLedger`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DisputeCase` ADD CONSTRAINT `DisputeCase_serviceFeeSettingId_fkey` FOREIGN KEY (`serviceFeeSettingId`) REFERENCES `ServiceFeeSetting`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DisputeCase` ADD CONSTRAINT `DisputeCase_openedById_fkey` FOREIGN KEY (`openedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DisputeCase` ADD CONSTRAINT `DisputeCase_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DisputeEvidence` ADD CONSTRAINT `DisputeEvidence_disputeCaseId_fkey` FOREIGN KEY (`disputeCaseId`) REFERENCES `DisputeCase`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DisputeEvidence` ADD CONSTRAINT `DisputeEvidence_uploadedById_fkey` FOREIGN KEY (`uploadedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DisputeResolution` ADD CONSTRAINT `DisputeResolution_disputeCaseId_fkey` FOREIGN KEY (`disputeCaseId`) REFERENCES `DisputeCase`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DisputeResolution` ADD CONSTRAINT `DisputeResolution_resolvedById_fkey` FOREIGN KEY (`resolvedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefundRequest` ADD CONSTRAINT `RefundRequest_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefundRequest` ADD CONSTRAINT `RefundRequest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefundRequest` ADD CONSTRAINT `RefundRequest_disputeCaseId_fkey` FOREIGN KEY (`disputeCaseId`) REFERENCES `DisputeCase`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefundRequest` ADD CONSTRAINT `RefundRequest_revenueLedgerId_fkey` FOREIGN KEY (`revenueLedgerId`) REFERENCES `PlatformRevenueLedger`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefundRequest` ADD CONSTRAINT `RefundRequest_requestedById_fkey` FOREIGN KEY (`requestedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefundRequest` ADD CONSTRAINT `RefundRequest_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChargebackCase` ADD CONSTRAINT `ChargebackCase_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChargebackCase` ADD CONSTRAINT `ChargebackCase_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChargebackCase` ADD CONSTRAINT `ChargebackCase_revenueLedgerId_fkey` FOREIGN KEY (`revenueLedgerId`) REFERENCES `PlatformRevenueLedger`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChargebackCase` ADD CONSTRAINT `ChargebackCase_openedById_fkey` FOREIGN KEY (`openedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxVatSetting` ADD CONSTRAINT `TaxVatSetting_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxCalculationSnapshot` ADD CONSTRAINT `TaxCalculationSnapshot_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxCalculationSnapshot` ADD CONSTRAINT `TaxCalculationSnapshot_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxCalculationSnapshot` ADD CONSTRAINT `TaxCalculationSnapshot_revenueLedgerId_fkey` FOREIGN KEY (`revenueLedgerId`) REFERENCES `PlatformRevenueLedger`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaxCalculationSnapshot` ADD CONSTRAINT `TaxCalculationSnapshot_taxSettingId_fkey` FOREIGN KEY (`taxSettingId`) REFERENCES `TaxVatSetting`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RevenueReversalLedger` ADD CONSTRAINT `RevenueReversalLedger_originalLedgerId_fkey` FOREIGN KEY (`originalLedgerId`) REFERENCES `PlatformRevenueLedger`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RevenueReversalLedger` ADD CONSTRAINT `RevenueReversalLedger_reversalLedgerId_fkey` FOREIGN KEY (`reversalLedgerId`) REFERENCES `PlatformRevenueLedger`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RevenueReversalLedger` ADD CONSTRAINT `RevenueReversalLedger_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `Payment`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RevenueReversalLedger` ADD CONSTRAINT `RevenueReversalLedger_refundRequestId_fkey` FOREIGN KEY (`refundRequestId`) REFERENCES `RefundRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RevenueReversalLedger` ADD CONSTRAINT `RevenueReversalLedger_chargebackCaseId_fkey` FOREIGN KEY (`chargebackCaseId`) REFERENCES `ChargebackCase`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RevenueReversalLedger` ADD CONSTRAINT `RevenueReversalLedger_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RevenueReversalLedger` ADD CONSTRAINT `RevenueReversalLedger_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
