export const DEMO_ACCOUNTS = [
  {
    role: 'Kaniz Global Trade',
    email: 'admin@kanizglobaltrade.com',
    password: 'Admin@123456',
    firstName: 'System',
    lastName: 'Admin',
    roleName: 'SUPER_ADMIN',
  },
  {
    role: 'Supplier',
    email: 'supplier@kanizglobaltrade.com',
    password: 'Supplier@123456',
    firstName: 'Kaniz',
    lastName: 'Fashion',
    roleName: 'SUPPLIER_OWNER',
  },
  {
    role: 'Buyer',
    email: 'buyer@kanizglobaltrade.com',
    password: 'Buyer@123456',
    firstName: 'Test',
    lastName: 'Buyer',
    roleName: 'BUYER',
  },
] as const

export const DEMO_ACCOUNT_BY_ROLE = Object.fromEntries(
  DEMO_ACCOUNTS.map((account) => [account.roleName, account])
) as Record<(typeof DEMO_ACCOUNTS)[number]['roleName'], (typeof DEMO_ACCOUNTS)[number]>
