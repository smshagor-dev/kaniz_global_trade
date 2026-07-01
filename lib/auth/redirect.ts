export function getDefaultRouteForRoles(roles: string[]) {
  if (roles.includes('SUPER_ADMIN') || roles.includes('ADMIN') || roles.includes('MODERATOR')) {
    return '/admin'
  }

  if (roles.includes('SUPPLIER_OWNER') || roles.includes('SUPPLIER_STAFF')) {
    return '/dashboard'
  }

  return '/buyer'
}
