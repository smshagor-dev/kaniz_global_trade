import { TradeDocumentType } from '@prisma/client'

type Party = {
  name: string
  address?: string | null
  country?: string | null
  email?: string | null
  phone?: string | null
}

type LineItem = {
  name: string
  quantity: number
  unit?: string | null
  unitPrice?: number | null
  amount: number
}

export type TradeDocumentPayload = {
  documentNo: string
  type: TradeDocumentType
  issueDate: string
  currencyCode: string
  buyer: Party
  supplier: Party
  shipment?: {
    carrier?: string | null
    trackingNumber?: string | null
    awbNumber?: string | null
    serviceLevel?: string | null
  }
  lineItems: LineItem[]
  subtotal: number
  shippingCost: number
  escrowFee?: number
  totalAmount: number
  notes?: string | null
}

export function buildDocumentNumber(prefix: string, entityId: string) {
  return `${prefix}-${entityId.slice(0, 8).toUpperCase()}-${Date.now().toString().slice(-6)}`
}

export function renderTradeDocumentHtml(payload: TradeDocumentPayload) {
  const title = payload.type.replace(/_/g, ' ')
  const rows = payload.lineItems
    .map(
      (item) => `
      <tr>
        <td>${item.name}</td>
        <td>${item.quantity} ${item.unit || ''}</td>
        <td>${item.unitPrice != null ? `${payload.currencyCode} ${item.unitPrice.toFixed(2)}` : '-'}</td>
        <td>${payload.currencyCode} ${item.amount.toFixed(2)}</td>
      </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #111827; padding: 32px; }
      .header { display: flex; justify-content: space-between; margin-bottom: 24px; }
      .badge { background: #dbeafe; color: #1d4ed8; padding: 6px 10px; border-radius: 999px; font-size: 12px; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; font-size: 14px; }
      th { background: #f9fafb; }
      .totals { margin-top: 20px; width: 360px; margin-left: auto; }
      .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
      .strong { font-weight: 700; }
      .muted { color: #6b7280; font-size: 13px; }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <div class="badge">${title}</div>
        <h1>${title}</h1>
        <div class="muted">Document No: ${payload.documentNo}</div>
        <div class="muted">Issue Date: ${payload.issueDate}</div>
      </div>
    </div>

    <div class="grid">
      <div>
        <h3>Supplier</h3>
        <div>${payload.supplier.name}</div>
        <div class="muted">${payload.supplier.address || ''}</div>
        <div class="muted">${payload.supplier.country || ''}</div>
        <div class="muted">${payload.supplier.email || ''}</div>
      </div>
      <div>
        <h3>Buyer</h3>
        <div>${payload.buyer.name}</div>
        <div class="muted">${payload.buyer.address || ''}</div>
        <div class="muted">${payload.buyer.country || ''}</div>
        <div class="muted">${payload.buyer.email || ''}</div>
      </div>
    </div>

    ${
      payload.shipment
        ? `<div class="grid">
      <div><strong>Carrier:</strong> ${payload.shipment.carrier || '-'}</div>
      <div><strong>Tracking / AWB:</strong> ${payload.shipment.trackingNumber || payload.shipment.awbNumber || '-'}</div>
    </div>`
        : ''
    }

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Quantity</th>
          <th>Unit Price</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div><span>Subtotal</span><span>${payload.currencyCode} ${payload.subtotal.toFixed(2)}</span></div>
      <div><span>Shipping</span><span>${payload.currencyCode} ${payload.shippingCost.toFixed(2)}</span></div>
      <div><span>Escrow Fee</span><span>${payload.currencyCode} ${(payload.escrowFee || 0).toFixed(2)}</span></div>
      <div class="strong"><span>Total</span><span>${payload.currencyCode} ${payload.totalAmount.toFixed(2)}</span></div>
    </div>

    ${payload.notes ? `<p class="muted">Notes: ${payload.notes}</p>` : ''}
  </body>
</html>`
}
