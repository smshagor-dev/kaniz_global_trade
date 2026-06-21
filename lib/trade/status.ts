export function getRFQStatusMeta(status: string) {
  switch (status) {
    case 'OPEN':
      return {
        label: 'Open for suppliers',
        shortLabel: 'Open',
        className: 'bg-emerald-50 text-emerald-700',
        description: 'This RFQ is live and available for supplier responses.',
      }
    case 'RECEIVING_QUOTATIONS':
      return {
        label: 'Receiving quotations',
        shortLabel: 'Receiving quotations',
        className: 'bg-violet-50 text-violet-700',
        description: 'Suppliers have started responding and new offers may still arrive.',
      }
    case 'AWARDED':
      return {
        label: 'Awarded',
        shortLabel: 'Awarded',
        className: 'bg-blue-50 text-blue-700',
        description: 'A supplier quotation has been selected for this RFQ.',
      }
    case 'CLOSED':
      return {
        label: 'Closed',
        shortLabel: 'Closed',
        className: 'bg-slate-100 text-slate-700',
        description: 'This RFQ is no longer accepting new supplier responses.',
      }
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        shortLabel: 'Cancelled',
        className: 'bg-rose-50 text-rose-700',
        description: 'The buyer cancelled this sourcing request.',
      }
    case 'EXPIRED':
      return {
        label: 'Expired',
        shortLabel: 'Expired',
        className: 'bg-amber-50 text-amber-700',
        description: 'The response window has ended for this RFQ.',
      }
    default:
      return {
        label: humanizeStatus(status),
        shortLabel: humanizeStatus(status),
        className: 'bg-slate-100 text-slate-700',
        description: 'Current RFQ status.',
      }
  }
}

export function getQuotationStatusMeta(status: string) {
  switch (status) {
    case 'SENT':
      return {
        label: 'Awaiting buyer review',
        shortLabel: 'Sent',
        className: 'bg-blue-50 text-blue-700',
        description: 'The quotation has been sent and is waiting for the buyer to review it.',
      }
    case 'VIEWED':
      return {
        label: 'Viewed by buyer',
        shortLabel: 'Viewed',
        className: 'bg-amber-50 text-amber-700',
        description: 'The buyer has opened this quotation and is evaluating it.',
      }
    case 'REVISED':
      return {
        label: 'Revised offer',
        shortLabel: 'Revised',
        className: 'bg-violet-50 text-violet-700',
        description: 'A revised quotation was issued and is pending buyer action.',
      }
    case 'ACCEPTED':
      return {
        label: 'Accepted',
        shortLabel: 'Accepted',
        className: 'bg-emerald-50 text-emerald-700',
        description: 'The buyer accepted this quotation and a trade order can proceed.',
      }
    case 'REJECTED':
      return {
        label: 'Declined',
        shortLabel: 'Declined',
        className: 'bg-rose-50 text-rose-700',
        description: 'The buyer rejected this quotation.',
      }
    case 'EXPIRED':
      return {
        label: 'Expired',
        shortLabel: 'Expired',
        className: 'bg-slate-100 text-slate-700',
        description: 'The quotation is no longer valid.',
      }
    default:
      return {
        label: humanizeStatus(status),
        shortLabel: humanizeStatus(status),
        className: 'bg-slate-100 text-slate-700',
        description: 'Current quotation status.',
      }
  }
}

function humanizeStatus(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
