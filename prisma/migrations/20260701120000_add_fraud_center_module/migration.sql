-- AlterTable
ALTER TABLE `User`
  ADD COLUMN `fraudRiskScore` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `fraudRiskLevel` ENUM('SAFE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'BLOCKED') NOT NULL DEFAULT 'SAFE',
  ADD COLUMN `fraudPublicFlag` ENUM('VERIFIED', 'UNDER_REVIEW', 'LIMITED_ACCESS', 'HIGH_RISK', 'BLOCKED') NULL,
  ADD COLUMN `fraudRestrictedActions` LONGTEXT NULL,
  ADD COLUMN `fraudNotes` TEXT NULL,
  ADD COLUMN `fraudLastReviewedAt` DATETIME(3) NULL,
  ADD COLUMN `fraudLastNotifiedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `Company`
  ADD COLUMN `fraudRiskScore` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `fraudRiskLevel` ENUM('SAFE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'BLOCKED') NOT NULL DEFAULT 'SAFE',
  ADD COLUMN `fraudPublicFlag` ENUM('VERIFIED', 'UNDER_REVIEW', 'LIMITED_ACCESS', 'HIGH_RISK', 'BLOCKED') NULL,
  ADD COLUMN `fraudRestrictedActions` LONGTEXT NULL,
  ADD COLUMN `fraudNotes` TEXT NULL,
  ADD COLUMN `fraudLastReviewedAt` DATETIME(3) NULL,
  ADD COLUMN `fraudLastNotifiedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `FraudRiskHistory` (
  `id` VARCHAR(191) NOT NULL,
  `entityType` ENUM('USER', 'COMPANY') NOT NULL,
  `userId` VARCHAR(191) NULL,
  `companyId` VARCHAR(191) NULL,
  `actorUserId` VARCHAR(191) NULL,
  `eventType` ENUM('REGISTRATION', 'LOGIN', 'PROFILE_UPDATE', 'DOCUMENT_UPLOAD', 'PRODUCT_CREATE', 'RFQ_CREATE', 'QUOTATION_CREATE', 'ORDER_CREATE', 'PAYMENT_ACTIVITY', 'REPORT_ACTIVITY', 'SUSPICIOUS_ACTIVITY', 'KYC_SUBMISSION', 'INQUIRY_CREATE', 'COMPANY_CREATE', 'COMPANY_UPDATE', 'MANUAL_REVIEW') NOT NULL,
  `sourceModule` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `summary` TEXT NULL,
  `payload` LONGTEXT NULL,
  `matchedRules` LONGTEXT NULL,
  `aiProvider` VARCHAR(191) NULL,
  `aiSummary` TEXT NULL,
  `aiRaw` LONGTEXT NULL,
  `ruleScore` INTEGER NOT NULL DEFAULT 0,
  `aiScore` INTEGER NULL,
  `finalScore` INTEGER NOT NULL DEFAULT 0,
  `resultingScore` INTEGER NOT NULL DEFAULT 0,
  `resultingLevel` ENUM('SAFE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'BLOCKED') NOT NULL,
  `publicFlag` ENUM('VERIFIED', 'UNDER_REVIEW', 'LIMITED_ACCESS', 'HIGH_RISK', 'BLOCKED') NULL,
  `restrictedActions` LONGTEXT NULL,
  `ipAddress` VARCHAR(191) NULL,
  `userAgent` TEXT NULL,
  `deviceFingerprint` VARCHAR(191) NULL,
  `triggeredAlert` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FraudReview` (
  `id` VARCHAR(191) NOT NULL,
  `entityType` ENUM('USER', 'COMPANY') NOT NULL,
  `userId` VARCHAR(191) NULL,
  `companyId` VARCHAR(191) NULL,
  `alertId` VARCHAR(191) NULL,
  `historyId` VARCHAR(191) NULL,
  `reviewedById` VARCHAR(191) NOT NULL,
  `decision` ENUM('APPROVE', 'CLEAR_RESTRICTIONS', 'RESTRICT', 'BLOCK', 'REQUEST_DOCUMENTS') NOT NULL,
  `note` TEXT NULL,
  `requestedDocuments` LONGTEXT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FraudDeviceLog` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `ipAddress` VARCHAR(191) NOT NULL,
  `userAgent` TEXT NULL,
  `deviceFingerprint` VARCHAR(191) NULL,
  `firstSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `loginCount` INTEGER NOT NULL DEFAULT 0,
  `lastRiskLevel` ENUM('SAFE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'BLOCKED') NULL,
  `isFlagged` BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Indexes
CREATE INDEX `User_fraudRiskLevel_idx` ON `User`(`fraudRiskLevel`);
CREATE INDEX `Company_fraudRiskLevel_idx` ON `Company`(`fraudRiskLevel`);
CREATE INDEX `FraudRiskHistory_entityType_createdAt_idx` ON `FraudRiskHistory`(`entityType`, `createdAt`);
CREATE INDEX `FraudRiskHistory_userId_createdAt_idx` ON `FraudRiskHistory`(`userId`, `createdAt`);
CREATE INDEX `FraudRiskHistory_companyId_createdAt_idx` ON `FraudRiskHistory`(`companyId`, `createdAt`);
CREATE INDEX `FraudRiskHistory_resultingLevel_createdAt_idx` ON `FraudRiskHistory`(`resultingLevel`, `createdAt`);
CREATE INDEX `FraudRiskHistory_eventType_createdAt_idx` ON `FraudRiskHistory`(`eventType`, `createdAt`);
CREATE INDEX `FraudReview_userId_createdAt_idx` ON `FraudReview`(`userId`, `createdAt`);
CREATE INDEX `FraudReview_companyId_createdAt_idx` ON `FraudReview`(`companyId`, `createdAt`);
CREATE INDEX `FraudReview_decision_createdAt_idx` ON `FraudReview`(`decision`, `createdAt`);
CREATE UNIQUE INDEX `FraudDeviceLog_userId_ipAddress_key` ON `FraudDeviceLog`(`userId`, `ipAddress`);
CREATE INDEX `FraudDeviceLog_userId_idx` ON `FraudDeviceLog`(`userId`);
CREATE INDEX `FraudDeviceLog_ipAddress_idx` ON `FraudDeviceLog`(`ipAddress`);
CREATE INDEX `FraudDeviceLog_lastRiskLevel_idx` ON `FraudDeviceLog`(`lastRiskLevel`);

-- Foreign keys
ALTER TABLE `FraudAlert` ADD CONSTRAINT `FraudAlert_targetUserId_fkey` FOREIGN KEY (`targetUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `FraudAlert` ADD CONSTRAINT `FraudAlert_reviewedBy_fkey` FOREIGN KEY (`reviewedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `FraudRiskHistory` ADD CONSTRAINT `FraudRiskHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `FraudRiskHistory` ADD CONSTRAINT `FraudRiskHistory_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `FraudRiskHistory` ADD CONSTRAINT `FraudRiskHistory_actorUserId_fkey` FOREIGN KEY (`actorUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `FraudReview` ADD CONSTRAINT `FraudReview_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `FraudReview` ADD CONSTRAINT `FraudReview_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `FraudReview` ADD CONSTRAINT `FraudReview_alertId_fkey` FOREIGN KEY (`alertId`) REFERENCES `FraudAlert`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `FraudReview` ADD CONSTRAINT `FraudReview_historyId_fkey` FOREIGN KEY (`historyId`) REFERENCES `FraudRiskHistory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `FraudReview` ADD CONSTRAINT `FraudReview_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `FraudDeviceLog` ADD CONSTRAINT `FraudDeviceLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
