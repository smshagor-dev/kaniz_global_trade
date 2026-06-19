import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { ApiError } from '@/lib/permissions'

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
  }
  errors?: Record<string, string>
}

export function successResponse<T>(
  data: T,
  message = 'Success',
  meta?: ApiResponse['meta'],
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, message, data, meta }, { status })
}

export function createdResponse<T>(
  data: T,
  message = 'Created successfully'
): NextResponse<ApiResponse<T>> {
  return successResponse(data, message, undefined, 201)
}

export function errorResponse(
  message: string,
  status = 400,
  errors?: Record<string, string>
): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, message, errors }, { status })
}

export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  console.error('API Error:', error)

  if (error instanceof ApiError) {
    return errorResponse(error.message, error.statusCode, error.errors)
  }

  if (error instanceof ZodError) {
    const errors: Record<string, string> = {}
    error.errors.forEach((e) => {
      const path = e.path.join('.')
      errors[path] = e.message
    })
    return errorResponse('Validation failed', 422, errors)
  }

  if (error instanceof Error) {
    return errorResponse(error.message, 500)
  }

  return errorResponse('Internal server error', 500)
}

export function paginationMeta(
  total: number,
  page: number,
  limit: number
): ApiResponse['meta'] {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}

export function getPaginationParams(searchParams: URLSearchParams): {
  page: number
  limit: number
  skip: number
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}
