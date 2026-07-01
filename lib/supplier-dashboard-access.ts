export type SupplierDashboardSection = {
  key: string
  label: string
  href: string
}

export type SupplierStaffRoleDefinition = {
  id: string
  name: string
  dashboardAccess: string[]
}

type CompanyStaffPermissionsPayload = {
  dashboardSections?: string[]
  staffRoleId?: string | null
  companyRoles?: SupplierStaffRoleDefinition[]
}

export const supplierDashboardSections: SupplierDashboardSection[] = [
  { key: 'overview', label: 'Overview', href: '/dashboard/overview' },
  { key: 'company', label: 'Company Profile', href: '/dashboard/company' },
  { key: 'company-verification', label: 'Company Verification', href: '/dashboard/company-verification' },
  { key: 'categories', label: 'Categories', href: '/dashboard/categories' },
  { key: 'products', label: 'Products', href: '/dashboard/products' },
  { key: 'inquiries', label: 'Inquiries', href: '/dashboard/inquiries' },
  { key: 'rfq-requests', label: 'RFQ Requests', href: '/dashboard/rfq-requests' },
  { key: 'rfqs', label: 'RFQs', href: '/dashboard/rfqs' },
  { key: 'quotations', label: 'Quotations', href: '/dashboard/quotations' },
  { key: 'trade-orders', label: 'Trade Assurance', href: '/dashboard/trade-orders' },
  { key: 'revenue', label: 'Commission', href: '/dashboard/revenue' },
  { key: 'sample-orders', label: 'Sample Orders', href: '/dashboard/sample-orders' },
  { key: 'shipments', label: 'Shipments', href: '/dashboard/shipments' },
  { key: 'logistics', label: 'Logistics', href: '/dashboard/logistics' },
  { key: 'insurance', label: 'Insurance', href: '/dashboard/insurance' },
  { key: 'ads', label: 'Advertising', href: '/dashboard/ads' },
  { key: 'financing', label: 'Financing', href: '/dashboard/financing' },
  { key: 'virtual-tours', label: 'Virtual Tours', href: '/dashboard/virtual-tours' },
  { key: 'inspections', label: 'Inspections', href: '/dashboard/inspections' },
  { key: 'chat', label: 'Live Chat', href: '/dashboard/chat' },
  { key: 'staff', label: 'Staff', href: '/dashboard/staff' },
  { key: 'subscription', label: 'Packages', href: '/dashboard/packages' },
  { key: 'payments', label: 'Payments', href: '/dashboard/payments' },
  { key: 'analytics', label: 'Analytics', href: '/dashboard/analytics' },
  { key: 'notifications', label: 'Notifications', href: '/dashboard/notifications' },
  { key: 'settings', label: 'Settings', href: '/dashboard/settings' },
]

const allSectionKeys = supplierDashboardSections.map((section) => section.key)

export function getAllSupplierDashboardSectionKeys() {
  return [...allSectionKeys]
}

function normalizeDashboardAccess(sectionKeys: unknown): string[] {
  if (!Array.isArray(sectionKeys)) return []
  return [...new Set(sectionKeys)].filter(
    (value): value is string => typeof value === 'string' && allSectionKeys.includes(value)
  )
}

function normalizeRoleDefinitions(input: unknown): SupplierStaffRoleDefinition[] {
  if (!Array.isArray(input)) return []

  return input
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const candidate = item as { id?: unknown; name?: unknown; dashboardAccess?: unknown }
      if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') return null

      return {
        id: candidate.id,
        name: candidate.name,
        dashboardAccess: normalizeDashboardAccess(candidate.dashboardAccess),
      }
    })
    .filter((item): item is SupplierStaffRoleDefinition => !!item && !!item.dashboardAccess.length)
}

export function parseSupplierStaffPermissions(raw: string | null | undefined): CompanyStaffPermissionsPayload {
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw) as CompanyStaffPermissionsPayload | string[] | unknown

    if (Array.isArray(parsed)) {
      return {
        dashboardSections: normalizeDashboardAccess(parsed),
      }
    }

    if (!parsed || typeof parsed !== 'object') return {}

    const payload = parsed as CompanyStaffPermissionsPayload
    return {
      dashboardSections: normalizeDashboardAccess(payload.dashboardSections),
      staffRoleId: typeof payload.staffRoleId === 'string' ? payload.staffRoleId : null,
      companyRoles: normalizeRoleDefinitions(payload.companyRoles),
    }
  } catch {
    return {}
  }
}

export function serializeSupplierStaffPermissions(payload: CompanyStaffPermissionsPayload) {
  return JSON.stringify({
    dashboardSections: normalizeDashboardAccess(payload.dashboardSections),
    staffRoleId: typeof payload.staffRoleId === 'string' ? payload.staffRoleId : null,
    companyRoles: normalizeRoleDefinitions(payload.companyRoles),
  })
}

export function getSupplierStaffRoleDefinitions(raw: string | null | undefined) {
  return parseSupplierStaffPermissions(raw).companyRoles || []
}

export function getAssignedSupplierStaffRoleId(raw: string | null | undefined) {
  return parseSupplierStaffPermissions(raw).staffRoleId || null
}

export function resolveSupplierDashboardAccess(raw: string | null | undefined, fallbackRoleDefinitions?: SupplierStaffRoleDefinition[]) {
  const parsed = parseSupplierStaffPermissions(raw)
  const roleDefinitions = fallbackRoleDefinitions || parsed.companyRoles || []

  if (parsed.staffRoleId) {
    const assignedRole = roleDefinitions.find((role) => role.id === parsed.staffRoleId)
    if (assignedRole?.dashboardAccess.length) {
      return assignedRole.dashboardAccess
    }
  }

  if (parsed.dashboardSections?.length) {
    return parsed.dashboardSections
  }

  return getAllSupplierDashboardSectionKeys()
}

export function getSupplierDashboardSectionForPath(pathname: string) {
  if (pathname === '/dashboard') {
    return supplierDashboardSections.find((section) => section.key === 'overview') || null
  }

  return supplierDashboardSections.find(
    (section) => pathname === section.href || pathname.startsWith(`${section.href}/`)
  ) || null
}

export function getSupplierDashboardDefaultHref(sectionKeys: string[]) {
  const allowed = supplierDashboardSections.find((section) => sectionKeys.includes(section.key))
  return allowed?.href || '/dashboard/overview'
}
