import { redirect } from 'next/navigation'

export default function DashboardSubscriptionRedirectPage() {
  redirect('/dashboard/packages')
}
