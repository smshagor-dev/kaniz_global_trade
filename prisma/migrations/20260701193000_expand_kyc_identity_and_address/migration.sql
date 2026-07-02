ALTER TABLE `KYCProfile`
  ADD COLUMN `identityDocumentType` VARCHAR(191) NULL,
  ADD COLUMN `personalCountry` VARCHAR(191) NULL,
  ADD COLUMN `personalCity` VARCHAR(191) NULL,
  ADD COLUMN `personalPostalCode` VARCHAR(191) NULL,
  ADD COLUMN `personalAddress` TEXT NULL;
