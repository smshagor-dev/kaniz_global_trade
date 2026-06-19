'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { post } from '@/lib/utils/api-client'
import { useIsAuthenticated } from '@/store/auth'
import { MessageSquare, Loader2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

const schema = z.object({
  subject:  z.string().min(5, 'Subject must be at least 5 characters'),
  quantity: z.string().optional(),
  message:  z.string().min(20, 'Message must be at least 20 characters'),
})

type FormData = z.infer<typeof schema>

interface Props {
  companyId:   string
  productId?:  string
  productName: string
}

export function InquiryForm({ companyId, productId, productName }: Props) {
  const isAuth = useIsAuthenticated()
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { subject: `Inquiry about ${productName}` },
  })

  async function onSubmit(data: FormData) {
    try {
      await post('/inquiries', {
        companyId,
        productId,
        subject:  data.subject,
        quantity: data.quantity,
        message:  data.message,
      })
      setSent(true)
      toast.success('Inquiry sent successfully!')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to send inquiry'
      toast.error(msg)
    }
  }

  if (!isAuth) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-5 text-center">
        <MessageSquare className="w-8 h-8 text-blue-200 mx-auto mb-3" />
        <h3 className="font-bold text-gray-900 mb-2">Send an Inquiry</h3>
        <p className="text-sm text-gray-500 mb-4">Sign in to contact this supplier directly.</p>
        <Link href="/auth/login" className="block w-full bg-blue-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-800 transition-colors">
          Sign In to Inquire
        </Link>
        <p className="text-xs text-gray-400 mt-2">
          New here? <Link href="/auth/register" className="text-blue-600 hover:underline">Register free</Link>
        </p>
      </div>
    )
  }

  if (sent) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
        <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
        <h3 className="font-bold text-gray-900 mb-1">Inquiry Sent!</h3>
        <p className="text-sm text-gray-600">The supplier will respond shortly. Check your dashboard for updates.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5">
      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-blue-600" /> Send Inquiry
      </h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <input
            {...register('subject')}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            placeholder="Subject"
          />
          {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject.message}</p>}
        </div>
        <div>
          <input
            {...register('quantity')}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            placeholder="Required quantity (optional)"
          />
        </div>
        <div>
          <textarea
            {...register('message')}
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
            placeholder="Describe your requirements, target price, delivery timeline..."
          />
          {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>}
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : 'Send Inquiry'}
        </button>
      </form>
    </div>
  )
}
