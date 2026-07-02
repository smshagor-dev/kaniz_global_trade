CREATE INDEX `Company_status_deletedAt_createdAt_idx` ON `Company`(`status`, `deletedAt`, `createdAt`);
CREATE INDEX `Company_status_verificationStatus_createdAt_idx` ON `Company`(`status`, `verificationStatus`, `createdAt`);
CREATE INDEX `Company_countryId_status_createdAt_idx` ON `Company`(`countryId`, `status`, `createdAt`);

CREATE INDEX `Product_companyId_status_createdAt_idx` ON `Product`(`companyId`, `status`, `createdAt`);
CREATE INDEX `Product_categoryId_status_createdAt_idx` ON `Product`(`categoryId`, `status`, `createdAt`);
CREATE INDEX `Product_status_deletedAt_createdAt_idx` ON `Product`(`status`, `deletedAt`, `createdAt`);

CREATE INDEX `RFQ_buyerId_status_createdAt_idx` ON `RFQ`(`buyerId`, `status`, `createdAt`);
CREATE INDEX `RFQ_status_isPublic_expiresAt_idx` ON `RFQ`(`status`, `isPublic`, `expiresAt`);
CREATE INDEX `RFQ_categoryId_status_createdAt_idx` ON `RFQ`(`categoryId`, `status`, `createdAt`);

CREATE INDEX `RFQQuotation_buyerId_idx` ON `RFQQuotation`(`buyerId`);
CREATE INDEX `RFQQuotation_companyId_status_createdAt_idx` ON `RFQQuotation`(`companyId`, `status`, `createdAt`);
CREATE INDEX `RFQQuotation_rfqId_companyId_idx` ON `RFQQuotation`(`rfqId`, `companyId`);

CREATE INDEX `Message_roomId_isDeleted_createdAt_idx` ON `Message`(`roomId`, `isDeleted`, `createdAt`);

CREATE INDEX `Notification_userId_isRead_createdAt_idx` ON `Notification`(`userId`, `isRead`, `createdAt`);

CREATE INDEX `Payment_invoiceId_idx` ON `Payment`(`invoiceId`);
CREATE INDEX `Payment_userId_status_createdAt_idx` ON `Payment`(`userId`, `status`, `createdAt`);
CREATE INDEX `Payment_tradeOrderId_status_createdAt_idx` ON `Payment`(`tradeOrderId`, `status`, `createdAt`);
CREATE INDEX `Payment_sampleOrderId_status_createdAt_idx` ON `Payment`(`sampleOrderId`, `status`, `createdAt`);

CREATE INDEX `TradeOrder_buyerId_status_createdAt_idx` ON `TradeOrder`(`buyerId`, `status`, `createdAt`);
CREATE INDEX `TradeOrder_supplierCompanyId_status_createdAt_idx` ON `TradeOrder`(`supplierCompanyId`, `status`, `createdAt`);

CREATE INDEX `Shipment_buyerId_status_updatedAt_idx` ON `Shipment`(`buyerId`, `status`, `updatedAt`);
CREATE INDEX `Shipment_supplierCompanyId_status_updatedAt_idx` ON `Shipment`(`supplierCompanyId`, `status`, `updatedAt`);
CREATE INDEX `Shipment_tradeOrderId_createdAt_idx` ON `Shipment`(`tradeOrderId`, `createdAt`);
CREATE INDEX `Shipment_sampleOrderId_createdAt_idx` ON `Shipment`(`sampleOrderId`, `createdAt`);
