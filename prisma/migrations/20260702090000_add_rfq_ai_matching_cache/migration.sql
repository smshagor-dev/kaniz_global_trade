CREATE TABLE `RfqMatchSnapshot` (
    `id` VARCHAR(191) NOT NULL,
    `rfqId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'READY',
    `strategy` VARCHAR(191) NOT NULL DEFAULT 'DETERMINISTIC',
    `usedAi` BOOLEAN NOT NULL DEFAULT false,
    `providersUsed` TEXT NULL,
    `summary` TEXT NULL,
    `rfqSignals` TEXT NULL,
    `candidateCount` INTEGER NOT NULL DEFAULT 0,
    `matchCount` INTEGER NOT NULL DEFAULT 0,
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NULL,
    `errorMessage` TEXT NULL,

    INDEX `RfqMatchSnapshot_rfqId_idx`(`rfqId`),
    INDEX `RfqMatchSnapshot_generatedAt_idx`(`generatedAt`),
    INDEX `RfqMatchSnapshot_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RfqMatchResult` (
    `id` VARCHAR(191) NOT NULL,
    `snapshotId` VARCHAR(191) NOT NULL,
    `rfqId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `rank` INTEGER NOT NULL,
    `score` INTEGER NOT NULL,
    `baseScore` INTEGER NOT NULL DEFAULT 0,
    `aiScoreBonus` INTEGER NOT NULL DEFAULT 0,
    `keywordOverlap` INTEGER NOT NULL DEFAULT 0,
    `destinationMatch` BOOLEAN NOT NULL DEFAULT false,
    `verifiedSupplier` BOOLEAN NOT NULL DEFAULT false,
    `premiumSupplier` BOOLEAN NOT NULL DEFAULT false,
    `signalMatches` TEXT NULL,
    `reasons` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RfqMatchResult_snapshotId_companyId_key`(`snapshotId`, `companyId`),
    INDEX `RfqMatchResult_snapshotId_rank_idx`(`snapshotId`, `rank`),
    INDEX `RfqMatchResult_rfqId_idx`(`rfqId`),
    INDEX `RfqMatchResult_companyId_idx`(`companyId`),
    INDEX `RfqMatchResult_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `RfqMatchSnapshot` ADD CONSTRAINT `RfqMatchSnapshot_rfqId_fkey`
    FOREIGN KEY (`rfqId`) REFERENCES `RFQ`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `RfqMatchResult` ADD CONSTRAINT `RfqMatchResult_snapshotId_fkey`
    FOREIGN KEY (`snapshotId`) REFERENCES `RfqMatchSnapshot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `RfqMatchResult` ADD CONSTRAINT `RfqMatchResult_rfqId_fkey`
    FOREIGN KEY (`rfqId`) REFERENCES `RFQ`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `RfqMatchResult` ADD CONSTRAINT `RfqMatchResult_companyId_fkey`
    FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `RfqMatchResult` ADD CONSTRAINT `RfqMatchResult_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
