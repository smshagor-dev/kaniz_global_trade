import { NotificationsInbox } from '@/components/notifications/notifications-inbox'

export default function SupplierNotificationsPage() {
  return <NotificationsInbox audience="supplier" backHref="/dashboard" backLabel="Back to supplier portal" />
}
