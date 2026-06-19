import { PrismaClient } from '@prisma/client'
import { hashPassword } from '@/lib/auth/password'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Kaniz Global Trade database...')

  // ── Roles ─────────────────────────────────────────────────
  const roles = [
    { name: 'SUPER_ADMIN',    description: 'Full system access' },
    { name: 'ADMIN',          description: 'Platform management' },
    { name: 'MODERATOR',      description: 'Content moderation' },
    { name: 'SUPPLIER_OWNER', description: 'Company owner' },
    { name: 'SUPPLIER_STAFF', description: 'Company staff member' },
    { name: 'BUYER',          description: 'Buyer / importer' },
    { name: 'GUEST',          description: 'Guest user' },
  ]
  for (const r of roles) {
    await prisma.role.upsert({ where: { name: r.name }, create: r, update: {} })
  }
  console.log('✅ Roles created')

  // ── Permissions ───────────────────────────────────────────
  const permissions = [
    { name: 'admin:access',          module: 'admin',        action: 'access',  description: 'Access admin panel' },
    { name: 'admin:settings',        module: 'admin',        action: 'settings', description: 'Manage system settings' },
    { name: 'admin:reports',         module: 'admin',        action: 'reports',  description: 'View reports' },
    { name: 'admin:logs',            module: 'admin',        action: 'logs',     description: 'View audit logs' },
    { name: 'user:view',             module: 'users',        action: 'view',     description: 'View users' },
    { name: 'user:create',           module: 'users',        action: 'create',   description: 'Create users' },
    { name: 'user:update',           module: 'users',        action: 'update',   description: 'Update users' },
    { name: 'user:delete',           module: 'users',        action: 'delete',   description: 'Delete users' },
    { name: 'user:suspend',          module: 'users',        action: 'suspend',  description: 'Suspend users' },
    { name: 'company:view',          module: 'companies',    action: 'view',     description: 'View companies' },
    { name: 'company:create',        module: 'companies',    action: 'create',   description: 'Create companies' },
    { name: 'company:update',        module: 'companies',    action: 'update',   description: 'Update companies' },
    { name: 'company:delete',        module: 'companies',    action: 'delete',   description: 'Delete companies' },
    { name: 'company:verify',        module: 'companies',    action: 'verify',   description: 'Verify companies' },
    { name: 'company:feature',       module: 'companies',    action: 'feature',  description: 'Feature companies' },
    { name: 'product:view',          module: 'products',     action: 'view',     description: 'View products' },
    { name: 'product:create',        module: 'products',     action: 'create',   description: 'Create products' },
    { name: 'product:update',        module: 'products',     action: 'update',   description: 'Update products' },
    { name: 'product:delete',        module: 'products',     action: 'delete',   description: 'Delete products' },
    { name: 'product:approve',       module: 'products',     action: 'approve',  description: 'Approve products' },
    { name: 'inquiry:view',          module: 'inquiries',    action: 'view',     description: 'View inquiries' },
    { name: 'inquiry:reply',         module: 'inquiries',    action: 'reply',    description: 'Reply to inquiries' },
    { name: 'inquiry:manage',        module: 'inquiries',    action: 'manage',   description: 'Manage all inquiries' },
    { name: 'rfq:create',            module: 'rfqs',         action: 'create',   description: 'Create RFQs' },
    { name: 'rfq:view',              module: 'rfqs',         action: 'view',     description: 'View RFQs' },
    { name: 'quotation:create',      module: 'quotations',   action: 'create',   description: 'Create quotations' },
    { name: 'quotation:view',        module: 'quotations',   action: 'view',     description: 'View quotations' },
    { name: 'chat:access',           module: 'chat',         action: 'access',   description: 'Access chat' },
    { name: 'chat:moderate',         module: 'chat',         action: 'moderate', description: 'Moderate chat' },
    { name: 'subscription:manage',   module: 'subscription', action: 'manage',   description: 'Manage subscriptions' },
    { name: 'analytics:view',        module: 'analytics',    action: 'view',     description: 'View analytics' },
    { name: 'analytics:admin',       module: 'analytics',    action: 'admin',    description: 'View admin analytics' },
  ]

  for (const p of permissions) {
    await prisma.permission.upsert({ where: { name: p.name }, create: p, update: {} })
  }
  console.log('✅ Permissions created')

  // Assign all permissions to SUPER_ADMIN
  const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } })
  const allPerms       = await prisma.permission.findMany()
  for (const perm of allPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole!.id, permissionId: perm.id } },
      create: { roleId: superAdminRole!.id, permissionId: perm.id },
      update: {},
    })
  }

  // Assign relevant permissions to ADMIN
  const adminRole   = await prisma.role.findUnique({ where: { name: 'ADMIN' } })
  const adminPerms  = allPerms.filter((p) => !['admin:logs'].includes(p.name) ? true : true)
  for (const perm of adminPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole!.id, permissionId: perm.id } },
      create: { roleId: adminRole!.id, permissionId: perm.id },
      update: {},
    })
  }

  // ── Countries ──────────────────────────────────────────────
  const countries = [
    { name: 'United States',   code: 'US', dialCode: '+1',   flag: '🇺🇸', continent: 'North America' },
    { name: 'China',           code: 'CN', dialCode: '+86',  flag: '🇨🇳', continent: 'Asia' },
    { name: 'India',           code: 'IN', dialCode: '+91',  flag: '🇮🇳', continent: 'Asia' },
    { name: 'Germany',         code: 'DE', dialCode: '+49',  flag: '🇩🇪', continent: 'Europe' },
    { name: 'United Kingdom',  code: 'GB', dialCode: '+44',  flag: '🇬🇧', continent: 'Europe' },
    { name: 'Bangladesh',      code: 'BD', dialCode: '+880', flag: '🇧🇩', continent: 'Asia' },
    { name: 'Turkey',          code: 'TR', dialCode: '+90',  flag: '🇹🇷', continent: 'Asia' },
    { name: 'Italy',           code: 'IT', dialCode: '+39',  flag: '🇮🇹', continent: 'Europe' },
    { name: 'Japan',           code: 'JP', dialCode: '+81',  flag: '🇯🇵', continent: 'Asia' },
    { name: 'Brazil',          code: 'BR', dialCode: '+55',  flag: '🇧🇷', continent: 'South America' },
    { name: 'South Korea',     code: 'KR', dialCode: '+82',  flag: '🇰🇷', continent: 'Asia' },
    { name: 'Vietnam',         code: 'VN', dialCode: '+84',  flag: '🇻🇳', continent: 'Asia' },
    { name: 'Pakistan',        code: 'PK', dialCode: '+92',  flag: '🇵🇰', continent: 'Asia' },
    { name: 'Indonesia',       code: 'ID', dialCode: '+62',  flag: '🇮🇩', continent: 'Asia' },
    { name: 'UAE',             code: 'AE', dialCode: '+971', flag: '🇦🇪', continent: 'Asia' },
    { name: 'Australia',       code: 'AU', dialCode: '+61',  flag: '🇦🇺', continent: 'Oceania' },
    { name: 'Canada',          code: 'CA', dialCode: '+1',   flag: '🇨🇦', continent: 'North America' },
    { name: 'France',          code: 'FR', dialCode: '+33',  flag: '🇫🇷', continent: 'Europe' },
    { name: 'Mexico',          code: 'MX', dialCode: '+52',  flag: '🇲🇽', continent: 'North America' },
    { name: 'Egypt',           code: 'EG', dialCode: '+20',  flag: '🇪🇬', continent: 'Africa' },
  ]
  for (const c of countries) {
    await prisma.country.upsert({ where: { code: c.code }, create: c, update: {} })
  }
  console.log('✅ Countries created')

  // ── Currencies ─────────────────────────────────────────────
  const currencies = [
    { name: 'US Dollar',    code: 'USD', symbol: '$',  rate: 1,       isDefault: true  },
    { name: 'Euro',         code: 'EUR', symbol: '€',  rate: 0.92,    isDefault: false },
    { name: 'British Pound',code: 'GBP', symbol: '£',  rate: 0.79,    isDefault: false },
    { name: 'Japanese Yen', code: 'JPY', symbol: '¥',  rate: 149.5,   isDefault: false },
    { name: 'Chinese Yuan', code: 'CNY', symbol: '¥',  rate: 7.24,    isDefault: false },
    { name: 'Indian Rupee', code: 'INR', symbol: '₹',  rate: 83.2,    isDefault: false },
    { name: 'UAE Dirham',   code: 'AED', symbol: 'د.إ', rate: 3.67,  isDefault: false },
    { name: 'BD Taka',      code: 'BDT', symbol: '৳',  rate: 110.0,   isDefault: false },
  ]
  for (const c of currencies) {
    await prisma.currency.upsert({ where: { code: c.code }, create: c, update: {} })
  }

  // ── Unit types ─────────────────────────────────────────────
  const units = [
    { name: 'Pieces',     code: 'PCS' }, { name: 'Kilograms',  code: 'KG'  },
    { name: 'Metric Tons',code: 'MT'  }, { name: 'Liters',     code: 'L'   },
    { name: 'Meters',     code: 'M'   }, { name: 'Sets',        code: 'SET' },
    { name: 'Pairs',      code: 'PR'  }, { name: 'Boxes',       code: 'BOX' },
    { name: 'Cartons',    code: 'CTN' }, { name: 'Square Meters', code: 'SQM' },
  ]
  for (const u of units) {
    await prisma.unitType.upsert({ where: { code: u.code }, create: u, update: {} })
  }

  // ── Trade terms ────────────────────────────────────────────
  const tradeTerms = [
    { name: 'Ex Works',              code: 'EXW', description: 'Seller makes goods available at their premises' },
    { name: 'Free on Board',         code: 'FOB', description: 'Seller delivers goods on board vessel at origin port' },
    { name: 'Cost & Freight',        code: 'CFR', description: 'Seller pays cost and freight to destination port' },
    { name: 'Cost Insurance Freight',code: 'CIF', description: 'Seller pays cost, insurance and freight to destination' },
    { name: 'Delivered Duty Paid',   code: 'DDP', description: 'Seller delivers goods to buyer premises, cleared for import' },
    { name: 'Free Alongside Ship',   code: 'FAS', description: 'Seller delivers goods alongside vessel at origin port' },
    { name: 'Carriage Paid To',      code: 'CPT', description: 'Seller pays freight to named destination' },
  ]
  for (const t of tradeTerms) {
    await prisma.tradeTerm.upsert({ where: { code: t.code }, create: t, update: {} })
  }

  // ── Payment terms ──────────────────────────────────────────
  const paymentTerms = [
    { name: 'Telegraphic Transfer',   code: 'TT',  description: 'Bank wire transfer' },
    { name: 'Letter of Credit',       code: 'LC',  description: 'Bank-backed payment guarantee' },
    { name: 'Documents Against Payment', code: 'DP', description: 'Payment on document presentation' },
    { name: 'Western Union',          code: 'WU',  description: 'Western Union money transfer' },
    { name: 'PayPal',                 code: 'PP',  description: 'PayPal payment' },
    { name: 'Cash in Advance',        code: 'CIA', description: 'Full payment before shipment' },
    { name: 'Net 30',                 code: 'N30', description: '30 days from invoice date' },
    { name: 'Net 60',                 code: 'N60', description: '60 days from invoice date' },
  ]
  for (const p of paymentTerms) {
    await prisma.paymentTerm.upsert({ where: { code: p.code }, create: p, update: {} })
  }

  // ── Shipping methods ───────────────────────────────────────
  const shippingMethods = [
    { name: 'Sea Freight',  code: 'SEA'   },
    { name: 'Air Freight',  code: 'AIR'   },
    { name: 'Land Transport', code: 'LAND' },
    { name: 'Express',      code: 'EXP'   },
    { name: 'Rail',         code: 'RAIL'  },
  ]
  for (const s of shippingMethods) {
    await prisma.shippingMethod.upsert({ where: { code: s.code }, create: s, update: {} })
  }

  // ── Categories ─────────────────────────────────────────────
  const categories = [
    { name: 'Apparel & Textiles',         slug: 'apparel-textiles',     icon: '👕', sortOrder: 1 },
    { name: 'Electronics',                slug: 'electronics',          icon: '💻', sortOrder: 2 },
    { name: 'Machinery & Equipment',      slug: 'machinery-equipment',  icon: '⚙️', sortOrder: 3 },
    { name: 'Food & Beverage',            slug: 'food-beverage',        icon: '🍎', sortOrder: 4 },
    { name: 'Chemicals & Plastics',       slug: 'chemicals-plastics',   icon: '🧪', sortOrder: 5 },
    { name: 'Agriculture & Farming',      slug: 'agriculture-farming',  icon: '🌾', sortOrder: 6 },
    { name: 'Construction Materials',     slug: 'construction-materials', icon: '🏗️', sortOrder: 7 },
    { name: 'Automotive & Transport',     slug: 'automotive-transport', icon: '🚗', sortOrder: 8 },
    { name: 'Health & Medical',           slug: 'health-medical',       icon: '💊', sortOrder: 9 },
    { name: 'Home & Garden',              slug: 'home-garden',          icon: '🏡', sortOrder: 10 },
    { name: 'Sports & Leisure',           slug: 'sports-leisure',       icon: '⚽', sortOrder: 11 },
    { name: 'Packaging & Paper',          slug: 'packaging-paper',      icon: '📦', sortOrder: 12 },
  ]
  for (const c of categories) {
    await prisma.category.upsert({ where: { slug: c.slug }, create: c, update: {} })
  }
  console.log('✅ Categories created')

  // ── Subscription plans ─────────────────────────────────────
  const plans = [
    {
      name: 'Free', slug: 'free',
      description: 'Get started with basic features',
      monthlyPrice: 0, yearlyPrice: 0, trialDays: 0,
      maxProducts: 10, maxStaff: 1, maxImages: 5,
      featuredProducts: false, featuredCompany: false, verificationBadge: false,
      analytics: false, priorityRanking: false, apiAccess: false, sortOrder: 1,
    },
    {
      name: 'Standard', slug: 'standard',
      description: 'For growing businesses',
      monthlyPrice: 49.99, yearlyPrice: 499.99, trialDays: 7,
      maxProducts: 100, maxStaff: 3, maxImages: 15,
      featuredProducts: false, featuredCompany: false, verificationBadge: true,
      analytics: true, priorityRanking: false, apiAccess: false, sortOrder: 2,
    },
    {
      name: 'Premium', slug: 'premium',
      description: 'For established exporters',
      monthlyPrice: 149.99, yearlyPrice: 1499.99, trialDays: 14,
      maxProducts: 1000, maxStaff: 10, maxImages: 30,
      featuredProducts: true, featuredCompany: true, verificationBadge: true,
      analytics: true, priorityRanking: true, apiAccess: false, sortOrder: 3,
    },
    {
      name: 'Enterprise', slug: 'enterprise',
      description: 'Custom solutions for large operations',
      monthlyPrice: 499.99, yearlyPrice: 4999.99, trialDays: 30,
      maxProducts: 999999, maxStaff: 100, maxImages: 100,
      featuredProducts: true, featuredCompany: true, verificationBadge: true,
      analytics: true, priorityRanking: true, apiAccess: true, sortOrder: 4,
    },
  ]
  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({ where: { slug: p.slug }, create: p, update: {} })
  }
  console.log('✅ Subscription plans created')

  // ── Admin user ─────────────────────────────────────────────
  const adminPwd = await hashPassword('Admin@123456')
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@kanizglobaltrade.com' },
    create: {
      email: 'admin@kanizglobaltrade.com',
      password: adminPwd,
      firstName: 'System',
      lastName: 'Admin',
      status: 'ACTIVE',
      emailVerified: new Date(),
    },
    update: {},
  })
  const saRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } })
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: saRole!.id } },
    create: { userId: adminUser.id, roleId: saRole!.id },
    update: {},
  })
  await prisma.notificationPreference.upsert({
    where: { userId: adminUser.id }, create: { userId: adminUser.id }, update: {},
  })

  // ── Buyer user ─────────────────────────────────────────────
  const buyerPwd = await hashPassword('Buyer@123456')
  const buyerUser = await prisma.user.upsert({
    where: { email: 'buyer@kanizglobaltrade.com' },
    create: {
      email: 'buyer@kanizglobaltrade.com',
      password: buyerPwd,
      firstName: 'Test',
      lastName: 'Buyer',
      status: 'ACTIVE',
      emailVerified: new Date(),
    },
    update: {},
  })
  const buyerRole = await prisma.role.findUnique({ where: { name: 'BUYER' } })
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: buyerUser.id, roleId: buyerRole!.id } },
    create: { userId: buyerUser.id, roleId: buyerRole!.id },
    update: {},
  })
  await prisma.notificationPreference.upsert({
    where: { userId: buyerUser.id }, create: { userId: buyerUser.id }, update: {},
  })

  // ── Supplier + Kaniz Fashion company ──────────────────────
  const supplierPwd = await hashPassword('Supplier@123456')
  const supplierUser = await prisma.user.upsert({
    where: { email: 'supplier@kanizglobaltrade.com' },
    create: {
      email: 'supplier@kanizglobaltrade.com',
      password: supplierPwd,
      firstName: 'Kaniz',
      lastName: 'Fashion',
      status: 'ACTIVE',
      emailVerified: new Date(),
    },
    update: {},
  })
  const supplierRole = await prisma.role.findUnique({ where: { name: 'SUPPLIER_OWNER' } })
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: supplierUser.id, roleId: supplierRole!.id } },
    create: { userId: supplierUser.id, roleId: supplierRole!.id },
    update: {},
  })
  await prisma.notificationPreference.upsert({
    where: { userId: supplierUser.id }, create: { userId: supplierUser.id }, update: {},
  })

  const bdCountry = await prisma.country.findUnique({ where: { code: 'BD' } })
  const kfCompany = await prisma.company.upsert({
    where: { slug: 'kaniz-fashion' },
    create: {
      name: 'Kaniz Fashion',
      legalName: 'Kaniz Fashion Ltd.',
      slug: 'kaniz-fashion',
      businessType: 'MANUFACTURER',
      countryId: bdCountry?.id,
      email: 'info@kanizfashion.com',
      phone: '+880-1700-000000',
      description: 'Kaniz Fashion is a leading garment manufacturer and exporter from Bangladesh, specializing in premium quality ready-made garments for international brands.',
      mainProducts: 'T-Shirts, Polo Shirts, Hoodies, Jackets, Denim',
      yearEstablished: 2010,
      employees: '500-1000',
      annualRevenue: '$5M-$10M',
      exportPercentage: 90,
      status: 'ACTIVE',
      verificationStatus: 'ADMIN_VERIFIED',
      isVerified: true,
      isFeatured: true,
    },
    update: {},
  })

  // Link supplier to company
  await prisma.companyUser.upsert({
    where: { companyId_userId: { companyId: kfCompany.id, userId: supplierUser.id } },
    create: { companyId: kfCompany.id, userId: supplierUser.id, isPrimary: true },
    update: {},
  })

  // Company verification record
  await prisma.companyVerification.upsert({
    where: { companyId: kfCompany.id },
    create: {
      companyId: kfCompany.id,
      status: 'ADMIN_VERIFIED',
      submittedAt: new Date(),
      reviewedAt: new Date(),
      reviewedBy: adminUser.id,
    },
    update: {},
  })

  // Free subscription for Kaniz Fashion
  const freePlan = await prisma.subscriptionPlan.findUnique({ where: { slug: 'free' } })
  const now = new Date()
  const periodEnd = new Date(now.getFullYear() + 10, 11, 31) // far future
  await prisma.subscription.upsert({
    where: { companyId: kfCompany.id },
    create: {
      companyId: kfCompany.id,
      planId: freePlan!.id,
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
    update: {},
  })

  // Sample product for Kaniz Fashion
  const apparelCat = await prisma.category.findUnique({ where: { slug: 'apparel-textiles' } })
  const usdCurrency = await prisma.currency.findUnique({ where: { code: 'USD' } })
  const pcsUnit = await prisma.unitType.findUnique({ where: { code: 'PCS' } })

  await prisma.product.upsert({
    where: { slug: 'premium-100-cotton-polo-shirt' },
    create: {
      companyId: kfCompany.id,
      categoryId: apparelCat!.id,
      name: 'Premium 100% Cotton Polo Shirt',
      slug: 'premium-100-cotton-polo-shirt',
      shortDescription: 'High-quality 100% cotton polo shirts suitable for corporate and casual wear. Available in all sizes and custom colors.',
      description: 'Our Premium Cotton Polo Shirts are manufactured using the finest quality 100% combed cotton fabric. Perfect for corporate uniforms, promotional merchandise, and retail brands. We offer full customization including embroidery, screen printing, and heat transfer printing. All our products comply with international quality standards including OEKO-TEX® certified materials.',
      sku: 'KF-POLO-001',
      moq: 500,
      moqUnit: 'Pieces',
      unitTypeId: pcsUnit?.id,
      priceMin: 4.50,
      priceMax: 8.00,
      currencyId: usdCurrency?.id,
      priceNegotiable: true,
      productionCapacity: '50,000 pcs/month',
      leadTime: '30-45 days',
      packagingDetails: 'Individual poly bags, 12 pcs per carton, carton size: 60x40x40cm',
      status: 'APPROVED',
      isFeatured: true,
      isVerified: true,
      approvedAt: new Date(),
      approvedBy: adminUser.id,
      totalViews: 1250,
      totalInquiries: 38,
    },
    update: {},
  })

  console.log('✅ Kaniz Fashion company and product created')

  // ── System Settings ────────────────────────────────────────
  const settings = [
    { key: 'site_name',        value: 'Kaniz Global Trade',                  group: 'GENERAL', label: 'Site Name' },
    { key: 'site_description', value: 'Global B2B Export Import Marketplace', group: 'GENERAL', label: 'Site Description' },
    { key: 'contact_email',    value: 'support@kanizglobaltrade.com',         group: 'GENERAL', label: 'Contact Email' },
    { key: 'max_free_products',value: '10',                                   group: 'LIMITS',  label: 'Free Plan Product Limit' },
    { key: 'require_approval', value: 'true',                                 group: 'PRODUCTS',label: 'Require Product Approval' },
    { key: 'STRIPE_SECRET_KEY', value: process.env.STRIPE_SECRET_KEY || '', group: 'PAYMENT', label: 'Stripe Secret Key', type: 'PASSWORD', isSecret: true, description: 'Used for trade assurance funding, sample order payments, and Stripe checkout sessions.' },
    { key: 'STRIPE_PUBLISHABLE_KEY', value: process.env.STRIPE_PUBLISHABLE_KEY || '', group: 'PAYMENT', label: 'Stripe Publishable Key', type: 'STRING', description: 'Frontend Stripe key for hosted checkout and embedded payment flows.' },
    { key: 'STRIPE_WEBHOOK_SECRET', value: process.env.STRIPE_WEBHOOK_SECRET || '', group: 'PAYMENT', label: 'Stripe Webhook Secret', type: 'PASSWORD', isSecret: true, description: 'Verifies incoming webhook events from Stripe before payment state changes are applied.' },
    { key: 'PAYPAL_CLIENT_ID', value: process.env.PAYPAL_CLIENT_ID || '', group: 'PAYMENT', label: 'PayPal Client ID', type: 'STRING', description: 'PayPal application client identifier for subscription and wallet integrations.' },
    { key: 'PAYPAL_CLIENT_SECRET', value: process.env.PAYPAL_CLIENT_SECRET || '', group: 'PAYMENT', label: 'PayPal Client Secret', type: 'PASSWORD', isSecret: true, description: 'Secret credential paired with the PayPal client ID.' },
    { key: 'PAYPAL_MODE', value: process.env.PAYPAL_MODE || 'sandbox', group: 'PAYMENT', label: 'PayPal Mode', type: 'STRING', description: 'Environment mode for PayPal requests. Typical values are sandbox or live.' },
    { key: 'DHL_TRACKING_API_KEY', value: process.env.DHL_TRACKING_API_KEY || '', group: 'SHIPPING', label: 'DHL Tracking API Key', type: 'PASSWORD', isSecret: true, description: 'Credential for DHL shipment lookup and tracking sync.' },
    { key: 'FEDEX_API_KEY', value: process.env.FEDEX_API_KEY || '', group: 'SHIPPING', label: 'FedEx API Key', type: 'PASSWORD', isSecret: true, description: 'FedEx API key used for rate, tracking, and shipment service integrations.' },
    { key: 'FEDEX_API_SECRET', value: process.env.FEDEX_API_SECRET || '', group: 'SHIPPING', label: 'FedEx API Secret', type: 'PASSWORD', isSecret: true, description: 'FedEx API secret paired with the configured API key.' },
    { key: 'UPS_CLIENT_ID', value: process.env.UPS_CLIENT_ID || '', group: 'SHIPPING', label: 'UPS Client ID', type: 'STRING', description: 'UPS OAuth client ID for shipment and tracking requests.' },
    { key: 'UPS_CLIENT_SECRET', value: process.env.UPS_CLIENT_SECRET || '', group: 'SHIPPING', label: 'UPS Client Secret', type: 'PASSWORD', isSecret: true, description: 'UPS OAuth client secret used to fetch access tokens.' },
    { key: 'MAERSK_API_KEY', value: process.env.MAERSK_API_KEY || '', group: 'SHIPPING', label: 'Maersk API Key', type: 'PASSWORD', isSecret: true, description: 'Used for ocean freight booking and container milestone integrations.' },
    { key: 'DEFAULT_FINANCING_PARTNER', value: process.env.DEFAULT_FINANCING_PARTNER || 'Global Trade Capital', group: 'PARTNERS', label: 'Default Financing Partner', type: 'STRING', description: 'Primary lender or fintech partner surfaced in supplier financing workflows.' },
    { key: 'DEFAULT_INSURANCE_PROVIDER', value: process.env.DEFAULT_INSURANCE_PROVIDER || 'Allianz Trade', group: 'PARTNERS', label: 'Default Insurance Provider', type: 'STRING', description: 'Default insurance carrier displayed for cargo and trade insurance offers.' },
    { key: 'SMTP_HOST', value: process.env.SMTP_HOST || '', group: 'EMAIL', label: 'SMTP Host', type: 'STRING', description: 'Mail server hostname used for transactional emails.' },
    { key: 'SMTP_PORT', value: process.env.SMTP_PORT || '587', group: 'EMAIL', label: 'SMTP Port', type: 'NUMBER', description: 'SMTP server port. Common values are 587 for TLS or 465 for SSL.' },
    { key: 'SMTP_SECURE', value: process.env.SMTP_SECURE || 'false', group: 'EMAIL', label: 'SMTP Secure', type: 'BOOLEAN', description: 'Enable secure SMTP transport when the provider requires SSL/TLS from connection start.' },
    { key: 'SMTP_USER', value: process.env.SMTP_USER || '', group: 'EMAIL', label: 'SMTP User', type: 'STRING', description: 'SMTP username used by the platform mailer.' },
    { key: 'SMTP_PASS', value: process.env.SMTP_PASS || '', group: 'EMAIL', label: 'SMTP Password', type: 'PASSWORD', isSecret: true, description: 'Password or app token used for SMTP authentication.' },
    { key: 'SMTP_FROM', value: process.env.SMTP_FROM || 'Kaniz Global Trade <noreply@kanizglobaltrade.com>', group: 'EMAIL', label: 'SMTP From', type: 'STRING', description: 'Default sender identity for outgoing emails.' },
    { key: 'S3_ACCESS_KEY', value: process.env.S3_ACCESS_KEY || '', group: 'STORAGE', label: 'S3 Access Key', type: 'STRING', description: 'Access key for Cloudflare R2 or S3-compatible object storage.' },
    { key: 'S3_SECRET_KEY', value: process.env.S3_SECRET_KEY || '', group: 'STORAGE', label: 'S3 Secret Key', type: 'PASSWORD', isSecret: true, description: 'Secret key paired with the configured object storage access key.' },
    { key: 'S3_BUCKET', value: process.env.S3_BUCKET || '', group: 'STORAGE', label: 'S3 Bucket', type: 'STRING', description: 'Target bucket used for product media, documents, and uploads.' },
    { key: 'S3_ENDPOINT', value: process.env.S3_ENDPOINT || '', group: 'STORAGE', label: 'S3 Endpoint', type: 'STRING', description: 'Custom endpoint URL for R2 or any S3-compatible provider.' },
    { key: 'S3_REGION', value: process.env.S3_REGION || 'auto', group: 'STORAGE', label: 'S3 Region', type: 'STRING', description: 'Storage region. For Cloudflare R2 this commonly stays as auto.' },
    { key: 'NEXT_PUBLIC_CDN_URL', value: process.env.NEXT_PUBLIC_CDN_URL || '', group: 'STORAGE', label: 'CDN URL', type: 'STRING', description: 'Optional public CDN base URL for serving uploaded assets.' },
  ]
  for (const s of settings) {
    await prisma.systemSetting.upsert({ where: { key: s.key }, create: s, update: {} })
  }

  console.log('\n🎉 Database seeded successfully!')
  console.log('────────────────────────────────')
  console.log('Admin:    admin@kanizglobaltrade.com  / Admin@123456')
  console.log('Supplier: supplier@kanizglobaltrade.com / Supplier@123456')
  console.log('Buyer:    buyer@kanizglobaltrade.com  / Buyer@123456')
  console.log('────────────────────────────────')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
