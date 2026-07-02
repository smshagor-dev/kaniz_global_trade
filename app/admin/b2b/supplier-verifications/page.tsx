import { B2BVerificationList } from '@/components/admin/b2b-verification-list'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Supplier Company Verification | Admin',
}

export default function AdminB2BSupplierVerificationsPage() {
  return <B2BVerificationList audience="supplier" />
}
