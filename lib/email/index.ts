import nodemailer from 'nodemailer'
import { getSettingsMap } from '@/lib/settings/system'

async function getTransporter() {
  const settings = await getSettingsMap([
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
  ])

  return {
    transporter: nodemailer.createTransport({
      host: settings.SMTP_HOST,
      port: parseInt(settings.SMTP_PORT || '587'),
      secure: settings.SMTP_SECURE === 'true',
      auth: {
        user: settings.SMTP_USER,
        pass: settings.SMTP_PASS,
      },
    }),
    from: settings.SMTP_FROM || 'Kaniz Global Trade <noreply@kanizglobaltrade.com>',
  }
}

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const { transporter, from } = await getTransporter()
  await transporter.sendMail({
    from,
    to: Array.isArray(options.to) ? options.to.join(',') : options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  })
}

function emailLayout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Kaniz Global Trade</title>
  <style>
    body { font-family: Arial, sans-serif; background: #f4f7fa; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: #1d4ed8; color: white; padding: 30px 40px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 5px 0 0; opacity: 0.85; font-size: 13px; }
    .body { padding: 40px; }
    .footer { background: #f8fafc; padding: 20px 40px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .btn { display: inline-block; padding: 12px 28px; background: #1d4ed8; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; }
    .alert { background: #eff6ff; border-left: 4px solid #1d4ed8; padding: 12px 16px; border-radius: 4px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌐 Kaniz Global Trade</h1>
      <p>Global B2B Export Import Marketplace</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Kaniz Global Trade. All rights reserved.</p>
      <p>If you did not request this email, please ignore it.</p>
    </div>
  </div>
</body>
</html>`
}

export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${token}`
  await sendEmail({
    to: email,
    subject: 'Verify your email - Kaniz Global Trade',
    html: emailLayout(`
      <h2>Hello, ${name}!</h2>
      <p>Welcome to Kaniz Global Trade. Please verify your email address to get started.</p>
      <div class="alert">This link expires in 24 hours.</div>
      <a href="${url}" class="btn">Verify Email Address</a>
      <p style="color:#64748b;font-size:13px;">Or copy this link: <br>${url}</p>
    `),
  })
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password?token=${token}`
  await sendEmail({
    to: email,
    subject: 'Reset your password - Kaniz Global Trade',
    html: emailLayout(`
      <h2>Password Reset Request</h2>
      <p>Hi ${name}, we received a request to reset your password.</p>
      <div class="alert">This link expires in 1 hour.</div>
      <a href="${url}" class="btn">Reset Password</a>
      <p style="color:#64748b;font-size:13px;">If you didn't request this, please ignore this email.</p>
    `),
  })
}

export async function sendNewInquiryEmail(
  supplierEmail: string,
  supplierName: string,
  buyerName: string,
  inquirySubject: string,
  inquiryId: string
): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/inquiries/${inquiryId}`
  await sendEmail({
    to: supplierEmail,
    subject: `New Inquiry: ${inquirySubject}`,
    html: emailLayout(`
      <h2>New Inquiry Received</h2>
      <p>Hi ${supplierName},</p>
      <p><strong>${buyerName}</strong> has sent you an inquiry about: <strong>${inquirySubject}</strong></p>
      <a href="${url}" class="btn">View Inquiry</a>
    `),
  })
}

export async function sendNewRFQEmail(
  supplierEmail: string,
  supplierName: string,
  rfqTitle: string,
  rfqId: string
): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/rfqs/${rfqId}`
  await sendEmail({
    to: supplierEmail,
    subject: `New RFQ Match: ${rfqTitle}`,
    html: emailLayout(`
      <h2>New RFQ Matched</h2>
      <p>Hi ${supplierName},</p>
      <p>A new Request for Quotation matching your products has been posted: <strong>${rfqTitle}</strong></p>
      <a href="${url}" class="btn">View RFQ & Submit Quotation</a>
    `),
  })
}

export async function sendQuotationEmail(
  buyerEmail: string,
  buyerName: string,
  supplierName: string,
  quotationId: string
): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/buyer/quotations/${quotationId}`
  await sendEmail({
    to: buyerEmail,
    subject: `Quotation received from ${supplierName}`,
    html: emailLayout(`
      <h2>You received a new quotation</h2>
      <p>Hi ${buyerName},</p>
      <p><strong>${supplierName}</strong> has submitted a quotation for your request.</p>
      <a href="${url}" class="btn">View Quotation</a>
    `),
  })
}

export async function sendProductApprovalEmail(
  email: string,
  name: string,
  productName: string,
  approved: boolean,
  reason?: string
): Promise<void> {
  await sendEmail({
    to: email,
    subject: `Product ${approved ? 'Approved' : 'Rejected'}: ${productName}`,
    html: emailLayout(`
      <h2>Product ${approved ? '✅ Approved' : '❌ Rejected'}</h2>
      <p>Hi ${name},</p>
      <p>Your product <strong>${productName}</strong> has been ${approved ? 'approved and is now live on the marketplace' : 'rejected'}.</p>
      ${reason ? `<div class="alert"><strong>Reason:</strong> ${reason}</div>` : ''}
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/products" class="btn">View Products</a>
    `),
  })
}

export async function sendSubscriptionExpiryEmail(
  email: string,
  name: string,
  planName: string,
  expiresAt: Date
): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription`
  const days = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  await sendEmail({
    to: email,
    subject: `Your ${planName} subscription expires in ${days} days`,
    html: emailLayout(`
      <h2>Subscription Expiring Soon</h2>
      <p>Hi ${name},</p>
      <p>Your <strong>${planName}</strong> subscription expires on ${expiresAt.toLocaleDateString()}.</p>
      <div class="alert">Renew now to keep your products visible and maintain your verification badge.</div>
      <a href="${url}" class="btn">Renew Subscription</a>
    `),
  })
}

interface InvoicePaidEmailOptions {
  to: string
  customerName: string
  companyName: string
  invoiceNumber: string
  amount: number
  currency: string
  planName: string
  paymentMethod: string
  paidAt: Date
  dashboardUrl?: string
}

export async function sendInvoicePaidEmail(options: InvoicePaidEmailOptions): Promise<void> {
  const dashboardUrl = options.dashboardUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/subscription`

  await sendEmail({
    to: options.to,
    subject: `Invoice Paid: ${options.invoiceNumber}`,
    html: emailLayout(`
      <h2>Invoice Payment Confirmed</h2>
      <p>Hi ${options.customerName},</p>
      <p>We received your payment for <strong>${options.companyName}</strong>.</p>
      <div class="alert">
        <p style="margin:0 0 8px;"><strong>Invoice:</strong> ${options.invoiceNumber}</p>
        <p style="margin:0 0 8px;"><strong>Plan:</strong> ${options.planName}</p>
        <p style="margin:0 0 8px;"><strong>Amount:</strong> ${options.currency} ${options.amount.toLocaleString()}</p>
        <p style="margin:0;"><strong>Method:</strong> ${options.paymentMethod} on ${options.paidAt.toLocaleDateString()}</p>
      </div>
      <a href="${dashboardUrl}" class="btn">View Billing Dashboard</a>
    `),
  })
}
