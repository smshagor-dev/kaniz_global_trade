import { B2BVerificationList } from '@/components/admin/b2b-verification-list'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Buyer Company Verification | Admin',
}

export default function AdminB2BBuyerVerificationsPage() {
  return <B2BVerificationList audience="buyer" />
}
