import { NotificationsInbox } from '@/components/notifications/notifications-inbox'

export default function BuyerNotificationsPage() {
  return <NotificationsInbox audience="buyer" backHref="/buyer" backLabel="Back to buyer portal" />
}
