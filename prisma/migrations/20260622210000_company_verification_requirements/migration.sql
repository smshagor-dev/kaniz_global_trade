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

  UNIQUE INDEX `CompanyVerificationSubmission_companyId_requirementId_key`(`companyId`, `requirementId`),
  INDEX `CompanyVerificationSubmission_companyId_idx`(`companyId`),
  INDEX `CompanyVerificationSubmission_requirementId_idx`(`requirementId`),
  INDEX `CompanyVerificationSubmission_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CompanyVerificationSubmission` ADD CONSTRAINT `CompanyVerificationSubmission_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyVerificationSubmission` ADD CONSTRAINT `CompanyVerificationSubmission_requirementId_fkey` FOREIGN KEY (`requirementId`) REFERENCES `CompanyVerificationRequirement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
