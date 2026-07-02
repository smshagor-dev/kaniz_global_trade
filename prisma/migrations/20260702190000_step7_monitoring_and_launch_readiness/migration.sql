CREATE TABLE `SystemEvent` (
  `id` varchar(191) NOT NULL,
  `severity` enum('INFO','WARN','ERROR','CRITICAL') NOT NULL,
  `category` enum('AUTH','ADMIN','PAYMENT','WEBHOOK','UPLOAD','QUEUE','SEARCH','SHIPMENT','SECURITY','HEALTH','BACKUP') NOT NULL,
  `service` varchar(191) NOT NULL,
  `eventType` varchar(191) NOT NULL,
  `message` text NOT NULL,
  `source` varchar(191) NULL,
  `status` varchar(191) NULL,
  `actorUserId` varchar(191) NULL,
  `companyId` varchar(191) NULL,
  `details` longtext NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `SystemEvent_category_createdAt_idx`(`category`, `createdAt`),
  INDEX `SystemEvent_service_createdAt_idx`(`service`, `createdAt`),
  INDEX `SystemEvent_severity_createdAt_idx`(`severity`, `createdAt`),
  INDEX `SystemEvent_eventType_createdAt_idx`(`eventType`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
