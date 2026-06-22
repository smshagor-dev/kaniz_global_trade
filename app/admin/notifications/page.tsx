import { NotificationsInbox } from '@/components/notifications/notifications-inbox'

export default function AdminNotificationsPage() {
  return <NotificationsInbox audience="admin" backHref="/admin/dashboard" backLabel="Back to Kaniz Global Trade dashboard" />
}
