ALTER TABLE `ProductPriceTier`
  CHANGE COLUMN `price` `priceMin` DECIMAL(15, 2) NOT NULL,
  ADD COLUMN `priceMax` DECIMAL(15, 2) NULL AFTER `priceMin`;
