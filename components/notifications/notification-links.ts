'use client'

export type NotificationAudience = 'admin' | 'buyer' | 'supplier' | 'public'

export interface NotificationData {
  [key: string]: unknown
}

export interface NotificationLinkInput {
  type?: string
  data?: string | NotificationData | null
}

export function parseNotificationData(data: NotificationLinkInput['data']): NotificationData {
  if (!data) return {}
  if (typeof data === 'object') return data

  try {
    const parsed = JSON.parse(data)
    return parsed && typeof parsed === 'object' ? parsed as NotificationData : {}
  } catch {
    return {}
  }
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

export function resolveNotificationHref(notification: NotificationLinkInput, audience: NotificationAudience): string {
  const data = parseNotificationData(notification.data)
  const rfqId = asString(data.rfqId)
  const quotationId = asString(data.quotationId)
  const inquiryId = asString(data.inquiryId)
  const roomId = asString(data.roomId)
  const productId = asString(data.productId)
  const tradeOrderId = asString(data.tradeOrderId)
  const sampleOrderId = asString(data.sampleOrderId)
  const logisticsBookingId = asString(data.logisticsBookingId)
  const insurancePolicyId = asString(data.insurancePolicyId)
  const insuranceClaimId = asString(data.insuranceClaimId)
  const financingRequestId = asString(data.financingRequestId)
  const companyId = asString(data.companyId)
  const inspectionReportId = asString(data.inspectionReportId)
  const verificationId = asString(data.verificationId)
  const disputeId = asString(data.disputeId)
  const adCampaignId = asString(data.adCampaignId)
  const invoiceId = asString(data.invoiceId)
  const subscriptionId = asString(data.subscriptionId)
  const manualPaymentRequestId = asString(data.manualPaymentRequestId)

  if (audience === 'admin') {
    if (companyId) return '/admin/companies'
    if (inspectionReportId) return '/admin/inspections'
    if (productId) return `/admin/products/${productId}/edit`
    if (tradeOrderId) return '/admin/trade-orders'
    if (sampleOrderId) return '/admin/sample-orders'
    if (logisticsBookingId) return '/admin/logistics-bookings'
    if (insurancePolicyId) return '/admin/insurance-policies'
    if (insuranceClaimId) return '/admin/insurance-claims'
    if (financingRequestId) return '/admin/financing-requests'
    if (disputeId) return '/admin/trade-disputes'
    if (adCampaignId) return '/admin/ad-campaigns'
    if (invoiceId || subscriptionId || manualPaymentRequestId) return '/admin/payments'
    return '/admin/notifications'
  }

  if (audience === 'buyer') {
    if (quotationId) return `/buyer/quotations/${quotationId}`
    if (rfqId) return `/buyer/rfqs/${rfqId}`
    if (roomId) return `/buyer/chat?roomId=${encodeURIComponent(roomId)}`
    if (tradeOrderId) return '/buyer/trade-orders'
    if (sampleOrderId) return '/buyer/sample-orders'
    if (logisticsBookingId) return '/buyer/logistics'
    if (insurancePolicyId) return '/buyer/insurance'
    if (insuranceClaimId) return '/buyer/claims'
    if (inspectionReportId || companyId) return '/buyer/inspections'
    return '/buyer/notifications'
  }

  if (audience === 'supplier') {
    if (inquiryId) return `/dashboard/inquiries/${inquiryId}`
    if (quotationId) return `/dashboard/quotations/${quotationId}`
    if (rfqId) return `/dashboard/rfqs/${rfqId}`
    if (roomId) return `/dashboard/chat?roomId=${encodeURIComponent(roomId)}`
    if (productId) return `/dashboard/products/${productId}/edit`
    if (tradeOrderId) return '/dashboard/trade-orders'
    if (sampleOrderId) return '/dashboard/sample-orders'
    if (logisticsBookingId) return '/dashboard/logistics'
    if (insurancePolicyId) return '/dashboard/insurance'
    if (inspectionReportId || companyId) return '/dashboard/inspections'
    if (adCampaignId) return '/dashboard/ads'
    if (invoiceId || subscriptionId || manualPaymentRequestId) return '/dashboard/payments'
    return '/dashboard/notifications'
  }

  if (quotationId) return `/buyer/quotations/${quotationId}`
  if (rfqId) return `/rfqs/${rfqId}`
  if (productId) return `/products/${productId}`
  return '/notifications'
}

export function getPreferredNotificationAudience(roles?: string[] | null): NotificationAudience {
  if (roles?.some((role) => ['ADMIN', 'SUPER_ADMIN'].includes(role))) return 'admin'
  if (roles?.some((role) => ['SUPPLIER_OWNER', 'SUPPLIER_STAFF'].includes(role))) return 'supplier'
  if (roles?.includes('BUYER')) return 'buyer'
  return 'public'
}
