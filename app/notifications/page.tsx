'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { get, patch } from '@/lib/utils/api-client'
import { useIsAuthenticated } from '@/store/auth'

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
}

interface NotificationsResponse {
  notifications: NotificationItem[]
  unreadCount: number
}

export default function NotificationsPage() {
  const router = useRouter()
  const isAuthenticated = useIsAuthenticated()
  const [page, setPage] = useState(1)
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/auth/login')
    }
  }, [isAuthenticated, router])

  const query = useQuery({
    queryKey: ['notifications-page', page, showUnreadOnly],
    queryFn: () =>
      get<NotificationsResponse>('/notifications', {
        page,
        limit: 12,
        unread: showUnreadOnly ? 'true' : undefined,
      }),
    enabled: isAuthenticated,
  })

  const notifications = query.data?.data?.notifications || []
  const unreadCount = query.data?.data?.unreadCount || 0
  const totalPages = query.data?.meta?.totalPages || 1
  const total = query.data?.meta?.total || 0

  const headingCopy = useMemo(() => {
    if (showUnreadOnly) return `${unreadCount} unread notifications`
    return `${total.toLocaleString()} notifications in your inbox`
  }, [showUnreadOnly, unreadCount, total])

  async function handleMarkAllRead() {
    try {
      await patch('/notifications')
      toast.success('All notifications marked as read')
      await query.refetch()
    } catch {
      toast.error('Failed to mark notifications as read')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="rounded-[28px] border border-gray-200 bg-white p-10 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-4 text-sm text-gray-500">Checking your session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
              <Bell className="h-3.5 w-3.5" />
              Notifications
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-[-0.04em] text-gray-950">Your notification inbox</h1>
            <p className="mt-2 text-sm text-gray-500">{headingCopy}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setPage(1)
                setShowUnreadOnly((value) => !value)
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                showUnreadOnly
                  ? 'bg-blue-700 text-white'
                  : 'border border-gray-200 bg-white text-gray-700 hover:border-blue-200 hover:text-blue-700'
              }`}
            >
              {showUnreadOnly ? 'Showing unread only' : 'Unread only'}
            </button>
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-200 hover:text-blue-700"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {query.isLoading ? (
            <div className="rounded-[24px] border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-4 text-sm text-gray-500">Loading notifications...</p>
            </div>
          ) : notifications.length ? (
            notifications.map((item) => (
              <article
                key={item.id}
                className={`rounded-[24px] border p-5 transition ${
                  item.isRead
                    ? 'border-gray-200 bg-white hover:border-blue-200'
                    : 'border-blue-100 bg-blue-50/60 hover:border-blue-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`mt-1 h-3 w-3 rounded-full ${item.isRead ? 'bg-gray-300' : 'bg-blue-600'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h2 className="text-base font-bold text-gray-950">{item.title}</h2>
                        <p className="mt-1 text-sm leading-6 text-gray-600">{item.message}</p>
                      </div>
                      <div className="shrink-0 text-xs font-medium uppercase tracking-[0.14em] text-gray-400">
                        {item.type.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      <span>{new Date(item.createdAt).toLocaleString()}</span>
                      {!item.isRead ? <span className="rounded-full bg-blue-100 px-2 py-1 font-semibold text-blue-700">Unread</span> : null}
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-gray-200 bg-gray-50 p-12 text-center">
              <Bell className="mx-auto h-9 w-9 text-gray-300" />
              <h2 className="mt-4 text-lg font-bold text-gray-900">No notifications found</h2>
              <p className="mt-2 text-sm text-gray-500">
                {showUnreadOnly
                  ? 'You have no unread notifications right now.'
                  : 'New activity alerts, billing updates, and system messages will appear here.'}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-4 border-t border-gray-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="text-sm font-semibold text-blue-700 hover:text-blue-800">
            Back to homepage
          </Link>

          {totalPages > 1 ? (
            <div className="flex items-center gap-2 self-end">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="px-2 text-sm font-medium text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
