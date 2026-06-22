'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { get, patch } from '@/lib/utils/api-client'
import { resolveNotificationHref, type NotificationAudience } from './notification-links'

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  data?: string | null
  isRead: boolean
  createdAt: string
}

interface NotificationsResponse {
  notifications: NotificationItem[]
  unreadCount: number
}

interface NotificationDropdownProps {
  audience: NotificationAudience
  inboxHref: string
  tone?: 'light' | 'dark'
}

export function NotificationDropdown({ audience, inboxHref, tone = 'light' }: NotificationDropdownProps) {
  const router = useRouter()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)

  const query = useQuery({
    queryKey: ['notifications-dropdown', audience],
    queryFn: () => get<NotificationsResponse>('/notifications', { limit: 8 }),
    staleTime: 30 * 1000,
  })

  const notifications = query.data?.data?.notifications || []
  const unreadCount = query.data?.data?.unreadCount || 0

  async function refreshNotifications() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['notifications-dropdown'] }),
      qc.invalidateQueries({ queryKey: ['notifications-page'] }),
    ])
  }

  async function handleMarkAllRead() {
    try {
      await patch('/notifications')
      await refreshNotifications()
      toast.success('Notifications marked as read')
    } catch {
      toast.error('Failed to update notifications')
    }
  }

  async function openNotification(item: NotificationItem) {
    const href = resolveNotificationHref(item, audience)
    setOpen(false)

    try {
      if (!item.isRead) {
        await patch('/notifications', { id: item.id })
        await refreshNotifications()
      }
    } catch {
      toast.error('Failed to mark notification as read')
    } finally {
      router.push(href)
    }
  }

  const buttonClass =
    tone === 'dark'
      ? 'relative rounded-lg p-2 text-gray-300 transition hover:bg-gray-800 hover:text-white focus:bg-gray-800 focus:text-white focus:outline-none'
      : 'relative rounded-lg p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-700 focus:bg-blue-50 focus:text-blue-700 focus:outline-none'

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={buttonClass}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-200 bg-white p-2 text-gray-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-gray-950">Notifications</p>
              <p className="text-xs text-gray-500">{unreadCount} unread</p>
            </div>
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-gray-300"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto py-1">
            {query.isLoading ? (
              <div className="flex items-center gap-2 px-3 py-6 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading notifications...
              </div>
            ) : notifications.length ? (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openNotification(item)}
                  className={`block w-full rounded-xl px-3 py-3 text-left transition hover:bg-blue-50 ${
                    item.isRead ? 'text-gray-600' : 'bg-blue-50/70 text-gray-950'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">{item.message}</p>
                    </div>
                    {!item.isRead ? <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" /> : null}
                  </div>
                  <p className="mt-2 text-[11px] text-gray-400">{new Date(item.createdAt).toLocaleString()}</p>
                </button>
              ))
            ) : (
              <div className="px-3 py-6 text-sm text-gray-500">No notifications yet.</div>
            )}
          </div>

          <div className="border-t border-gray-100 px-3 py-2">
            <Link
              href={inboxHref}
              onClick={() => setOpen(false)}
              className="text-sm font-semibold text-blue-700 hover:text-blue-800"
            >
              View all notifications
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
