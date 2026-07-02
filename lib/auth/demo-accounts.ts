type DemoRoleName = 'SUPER_ADMIN' | 'SUPPLIER_OWNER' | 'BUYER'

export interface DemoAccount {
  role: string
  email: string
  password: string
  firstName: string
  lastName: string
  roleName: DemoRoleName
}

function readBoolean(value: string | undefined) {
  return String(value || '').trim().toLowerCase() === 'true'
}

function randomPassword() {
  return `ChangeMe-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

function requireSeedValue(name: string, fallback?: string) {
  const value = String(process.env[name] || fallback || '').trim()
  if (!value) {
    throw new Error(`${name} is required for database seeding in production.`)
  }
  return value
}

function buildSeedAccount(
  role: string,
  roleName: DemoRoleName,
  firstName: string,
  lastName: string,
  emailEnv: string,
  passwordEnv: string,
  fallbackEmail?: string
): DemoAccount {
  const isProduction = process.env.NODE_ENV === 'production'
  const email = isProduction
    ? requireSeedValue(emailEnv)
    : String(process.env[emailEnv] || fallbackEmail || '').trim()

  if (!email) {
    throw new Error(`${emailEnv} is required to seed the ${role} account.`)
  }

  const password = isProduction
    ? requireSeedValue(passwordEnv)
    : String(process.env[passwordEnv] || randomPassword()).trim()

  return { role, roleName, firstName, lastName, email, password }
}

export function resolveSeedAccounts(): DemoAccount[] {
  const accounts: DemoAccount[] = [
    buildSeedAccount(
      'Kaniz Global Trade',
      'SUPER_ADMIN',
      'System',
      'Admin',
      'SEED_SUPER_ADMIN_EMAIL',
      'SEED_SUPER_ADMIN_PASSWORD',
      'admin@local.kaniz.test'
    ),
  ]

  const demoAccountsEnabled =
    process.env.NODE_ENV !== 'production' && readBoolean(process.env.ENABLE_DEMO_ACCOUNTS)

  if (!demoAccountsEnabled) {
    return accounts
  }

  accounts.push(
    buildSeedAccount(
      'Supplier',
      'SUPPLIER_OWNER',
      'Kaniz',
      'Fashion',
      'SEED_SUPPLIER_EMAIL',
      'SEED_SUPPLIER_PASSWORD',
      'supplier@local.kaniz.test'
    ),
    buildSeedAccount(
      'Buyer',
      'BUYER',
      'Test',
      'Buyer',
      'SEED_BUYER_EMAIL',
      'SEED_BUYER_PASSWORD',
      'buyer@local.kaniz.test'
    )
  )

  return accounts
}

function buildPublicDemoAccounts(): DemoAccount[] {
  const enabled =
    process.env.NODE_ENV !== 'production' &&
    readBoolean(process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN)

  if (!enabled) return []

  const definitions = [
    {
      role: 'Kaniz Global Trade',
      roleName: 'SUPER_ADMIN' as const,
      firstName: 'System',
      lastName: 'Admin',
      email: process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL,
      password: process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD,
    },
    {
      role: 'Supplier',
      roleName: 'SUPPLIER_OWNER' as const,
      firstName: 'Kaniz',
      lastName: 'Fashion',
      email: process.env.NEXT_PUBLIC_DEMO_SUPPLIER_EMAIL,
      password: process.env.NEXT_PUBLIC_DEMO_SUPPLIER_PASSWORD,
    },
    {
      role: 'Buyer',
      roleName: 'BUYER' as const,
      firstName: 'Test',
      lastName: 'Buyer',
      email: process.env.NEXT_PUBLIC_DEMO_BUYER_EMAIL,
      password: process.env.NEXT_PUBLIC_DEMO_BUYER_PASSWORD,
    },
  ]

  return definitions
    .filter((account) => account.email && account.password)
    .map((account) => ({
      role: account.role,
      roleName: account.roleName,
      firstName: account.firstName,
      lastName: account.lastName,
      email: String(account.email),
      password: String(account.password),
    }))
}

export const DEMO_ACCOUNTS = buildPublicDemoAccounts()
export const DEMO_ACCOUNT_BY_ROLE = Object.fromEntries(
  resolveSeedAccounts().map((account) => [account.roleName, account])
) as Partial<Record<DemoRoleName, DemoAccount>>
