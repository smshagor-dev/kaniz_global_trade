export type LogisticsMetadata = {
  hasTrackingCredentials?: boolean
  sourceType?: 'PRODUCT' | 'TRADE_ORDER' | 'SAMPLE_ORDER' | 'MANUAL'
  product?: {
    id: string
    name: string
    sku?: string | null
    barcode?: string | null
    quantity?: number | null
    unit?: string | null
  }
  orderSnapshot?: {
    id: string
    label: string
    quantity?: number | null
    unit?: string | null
    shippingAddress?: string | null
  }
  cargoReadyAt?: string | null
  createdByRole?: 'SUPPLIER' | 'ADMIN' | 'BUYER'
  isSelfManagedCargo?: boolean
  verificationToken?: string
  verificationUrl?: string
  qrCodeDataUrl?: string
  barcodeValue?: string | null
  barcodeSource?: string | null
}

export function parseLogisticsMetadata(raw: string | null): LogisticsMetadata {
  if (!raw) return {}
  try {
    return JSON.parse(raw) as LogisticsMetadata
  } catch {
    return {}
  }
}

export function humanizeLogisticsStatus(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

export function buildLogisticsVerificationUrl(token: string) {
  return `${getAppUrl()}/logistics/verify/${token}`
}

export function formatLogisticsBooking<
  T extends {
    metadata: string | null
    quotedCost: unknown
    finalCost: unknown
    company?: { id: string; name: string; slug: string } | null
    buyer?: { id: string; firstName: string; lastName: string } | null
    tradeOrder?: { id: string; productName: string } | null
    sampleOrder?: { id: string; title: string } | null
  } & Record<string, unknown>,
>(booking: T) {
  const metadata = parseLogisticsMetadata(booking.metadata)
  const sourceType =
    metadata.sourceType ||
    (booking.tradeOrder ? 'TRADE_ORDER' : booking.sampleOrder ? 'SAMPLE_ORDER' : metadata.product ? 'PRODUCT' : 'MANUAL')

  const sourceLabel =
    sourceType === 'TRADE_ORDER'
      ? booking.tradeOrder?.productName || metadata.orderSnapshot?.label || 'Trade order'
      : sourceType === 'SAMPLE_ORDER'
        ? booking.sampleOrder?.title || metadata.orderSnapshot?.label || 'Sample order'
        : sourceType === 'PRODUCT'
          ? metadata.product?.name || 'Supplier catalog product'
          : 'Manual logistics request'

  const sourceDescription =
    sourceType === 'TRADE_ORDER'
      ? `Trade order ${metadata.orderSnapshot?.quantity || ''}${metadata.orderSnapshot?.unit ? ` ${metadata.orderSnapshot.unit}` : ''}`.trim()
      : sourceType === 'SAMPLE_ORDER'
        ? `Sample order ${metadata.orderSnapshot?.quantity || ''}${metadata.orderSnapshot?.unit ? ` ${metadata.orderSnapshot.unit}` : ''}`.trim()
        : sourceType === 'PRODUCT'
          ? `${metadata.product?.quantity || ''}${metadata.product?.unit ? ` ${metadata.product.unit}` : ''}`.trim() || 'Supplier-owned cargo'
          : 'Manual booking'

  return {
    ...booking,
    quotedCost: Number(booking.quotedCost || 0),
    finalCost: booking.finalCost == null ? null : Number(booking.finalCost),
    metadata,
    sourceType,
    sourceLabel,
    sourceDescription,
    statusLabel: humanizeLogisticsStatus(String(booking.status || '')),
    companyName: booking.company?.name || null,
    buyerName: booking.buyer ? `${booking.buyer.firstName} ${booking.buyer.lastName}`.trim() : null,
    verificationUrl: metadata.verificationUrl || null,
    verificationToken: metadata.verificationToken || null,
    qrCodeDataUrl: metadata.qrCodeDataUrl || null,
    barcodeValue: metadata.barcodeValue || metadata.product?.barcode || null,
    barcodeSource: metadata.barcodeSource || null,
    cargoReadyAt: metadata.cargoReadyAt || null,
  }
}
