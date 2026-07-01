import prisma from '@/lib/db/prisma'

export interface SettingDefinition {
  key: string
  group: string
  label: string
  type: 'STRING' | 'BOOLEAN' | 'NUMBER' | 'PASSWORD'
  isSecret?: boolean
  description?: string
  fallback?: string
}

export const SYSTEM_SETTING_DEFINITIONS: SettingDefinition[] = [
  { key: 'GOOGLE_AI_SEARCH_ENABLED', group: 'AI', label: 'Google AI Search Enabled', type: 'BOOLEAN', description: 'Enable Google Gemini powered query expansion and image analysis for marketplace search.', fallback: 'false' },
  { key: 'GOOGLE_GEMINI_API_KEY', group: 'AI', label: 'Google Gemini API Key', type: 'PASSWORD', isSecret: true, description: 'API key used for Google Gemini text search enhancement and AI image search analysis.', fallback: process.env.GOOGLE_GEMINI_API_KEY || '' },
  { key: 'GOOGLE_AI_TEXT_MODEL', group: 'AI', label: 'Google AI Text Model', type: 'STRING', description: 'Gemini model used for text query understanding and marketplace search expansion.', fallback: process.env.GOOGLE_AI_TEXT_MODEL || 'gemini-2.0-flash' },
  { key: 'GOOGLE_AI_IMAGE_MODEL', group: 'AI', label: 'Google AI Image Model', type: 'STRING', description: 'Gemini multimodal model used for AI image search and tag extraction.', fallback: process.env.GOOGLE_AI_IMAGE_MODEL || 'gemini-2.0-flash' },
  { key: 'GOOGLE_AI_SEARCH_MAX_TERMS', group: 'AI', label: 'AI Search Max Terms', type: 'NUMBER', description: 'Maximum number of normalized search terms returned from Google AI for marketplace matching.', fallback: process.env.GOOGLE_AI_SEARCH_MAX_TERMS || '8' },
  { key: 'HOME_DISCOVERY_ENABLED', group: 'HOME', label: 'Discovery Hero Enabled', type: 'BOOLEAN', description: 'Show the top marketplace discovery/search hero on the home page.', fallback: 'true' },
  { key: 'HOME_STATS_BAR_ENABLED', group: 'HOME', label: 'Stats Bar Enabled', type: 'BOOLEAN', description: 'Show the marketplace stats strip below the hero area.', fallback: 'true' },
  { key: 'HOME_FREQUENT_SEARCHES_ENABLED', group: 'HOME', label: 'Frequently Searched Section Enabled', type: 'BOOLEAN', description: 'Show the frequently searched shortcut section on the home page.', fallback: 'true' },
  { key: 'HOME_RECOMMENDED_PRODUCTS_ENABLED', group: 'HOME', label: 'Recommended Products Enabled', type: 'BOOLEAN', description: 'Show the recommended featured products section.', fallback: 'true' },
  { key: 'HOME_RECENT_PRODUCTS_ENABLED', group: 'HOME', label: 'Recently Added Section Enabled', type: 'BOOLEAN', description: 'Show the recently added products section.', fallback: 'true' },
  { key: 'HOME_HOT_CAMPAIGNS_ENABLED', group: 'HOME', label: 'Hot Campaigns Enabled', type: 'BOOLEAN', description: 'Show active sponsored campaigns on the home page.', fallback: 'true' },
  { key: 'HOME_VERIFIED_SUPPLIERS_ENABLED', group: 'HOME', label: 'Verified Suppliers Enabled', type: 'BOOLEAN', description: 'Show the verified suppliers section on the home page.', fallback: 'true' },
  { key: 'HOME_TOP_SUPPLIERS_ENABLED', group: 'HOME', label: 'Top Suppliers Enabled', type: 'BOOLEAN', description: 'Show the top ranking suppliers section.', fallback: 'true' },
  { key: 'HOME_NEW_ARRIVALS_ENABLED', group: 'HOME', label: 'New Arrivals Enabled', type: 'BOOLEAN', description: 'Show the new arrival products section.', fallback: 'true' },
  { key: 'HOME_MARKETPLACE_FEED_ENABLED', group: 'HOME', label: 'Marketplace Feed Enabled', type: 'BOOLEAN', description: 'Show the marketplace feed block at the bottom of the home page.', fallback: 'true' },
  { key: 'HOME_CATEGORY_LIMIT', group: 'HOME', label: 'Homepage Category Limit', type: 'NUMBER', description: 'How many top-level categories to load into the home page category rail.', fallback: '8' },
  { key: 'HOME_FEATURED_PRODUCT_LIMIT', group: 'HOME', label: 'Featured Product Limit', type: 'NUMBER', description: 'How many featured products to show on the home page sections.', fallback: '8' },
  { key: 'HOME_COMPANY_LIMIT', group: 'HOME', label: 'Supplier Limit', type: 'NUMBER', description: 'How many verified suppliers to show on home page supplier sections.', fallback: '8' },
  { key: 'HOME_CAMPAIGN_LIMIT', group: 'HOME', label: 'Campaign Limit', type: 'NUMBER', description: 'How many active sponsored campaigns to show on the home page.', fallback: '4' },
  { key: 'HOME_RECENT_PRODUCT_LIMIT', group: 'HOME', label: 'Recent Product Limit', type: 'NUMBER', description: 'How many recent products to show in the recently added and new arrivals sections.', fallback: '8' },
  { key: 'HOME_FINAL_CTA_TITLE', group: 'HOME', label: 'Final CTA Title', type: 'STRING', description: 'Main title shown in the bottom CTA section of the home page.', fallback: 'Can\'t Find What You Need?' },
  { key: 'HOME_FINAL_CTA_TEXT', group: 'HOME', label: 'Final CTA Text', type: 'STRING', description: 'Supporting text shown in the bottom CTA section of the home page.', fallback: 'Post a free RFQ and let verified suppliers come to you with their best offers.' },
  { key: 'HOME_FINAL_CTA_BUTTON_LABEL', group: 'HOME', label: 'Final CTA Button Label', type: 'STRING', description: 'Button text used in the bottom CTA section of the home page.', fallback: 'Post a Free RFQ' },
  { key: 'HOME_FINAL_CTA_BUTTON_LINK', group: 'HOME', label: 'Final CTA Button Link', type: 'STRING', description: 'Button link used in the bottom CTA section of the home page.', fallback: '/rfqs/create' },
  { key: 'HOME_DISCOVERY_TITLE', group: 'HOME', label: 'Discovery Title', type: 'STRING', description: 'Main label shown above the discovery tabs.', fallback: 'AI Mode' },
  { key: 'HOME_DISCOVERY_HELP_TEXT', group: 'HOME', label: 'Discovery Help Text', type: 'STRING', description: 'Short helper text shown beside the AI image search button.', fallback: 'Find products, suppliers, and RFQs using smart search or image search.' },
  { key: 'HOME_DISCOVERY_TRENDING_KEYWORDS', group: 'HOME', label: 'Trending Keywords', type: 'STRING', description: 'Comma-separated trending keywords for the homepage discovery block.', fallback: 'solar street light,cotton t-shirt,smart watch,industrial machinery,home textiles,packaging box' },
  { key: 'HOME_DISCOVERY_SUGGESTION_POOL', group: 'HOME', label: 'Suggestion Pool', type: 'STRING', description: 'Comma-separated search suggestions used in the homepage discovery dropdown.', fallback: 'Smart watch suppliers,Cotton t-shirt wholesale,Solar light manufacturer,Packaging box export,Leather shoes supplier,Agricultural machinery,Construction materials,Mobile accessories' },
  { key: 'HOME_DISCOVERY_RECENT_FALLBACK', group: 'HOME', label: 'Recent Search Fallback', type: 'STRING', description: 'Comma-separated fallback recent searches shown when the browser has no local history.', fallback: 'wireless earbuds,industrial pumps,cotton socks' },
  { key: 'HOME_DISCOVERY_POPULAR_TAGS', group: 'HOME', label: 'Popular Tags', type: 'STRING', description: 'Comma-separated popular tags shown under the discovery block. Leave blank to reuse trending keywords.', fallback: 'solar street light,cotton t-shirt,smart watch,industrial machinery,home textiles' },
  { key: 'HOME_FREQUENT_SEARCH_ITEMS', group: 'HOME', label: 'Frequent Search Items', type: 'STRING', description: 'Comma-separated items for the frequently searched section on the home page.', fallback: 'Cotton T-shirts,Industrial Machinery,Leather Shoes,Solar Lights,Packaging Boxes,Smart Watches,Mobile Accessories,Home Textiles' },
  { key: 'HOME_FREQUENT_SEARCH_TITLE', group: 'HOME', label: 'Frequent Search Title', type: 'STRING', description: 'Section title for the frequently searched block.', fallback: 'Frequently Searched' },
  { key: 'HOME_FREQUENT_SEARCH_SUBTITLE', group: 'HOME', label: 'Frequent Search Subtitle', type: 'STRING', description: 'Section subtitle for the frequently searched block.', fallback: 'Popular sourcing shortcuts buyers use to jump directly into high-demand categories.' },
  { key: 'HOME_RECOMMENDED_TITLE', group: 'HOME', label: 'Recommended Products Title', type: 'STRING', description: 'Section title for recommended products.', fallback: 'Recommended Products' },
  { key: 'HOME_RECOMMENDED_SUBTITLE', group: 'HOME', label: 'Recommended Products Subtitle', type: 'STRING', description: 'Section subtitle for recommended products.', fallback: 'Top-performing listings from verified marketplace suppliers.' },
  { key: 'HOME_RECENT_TITLE', group: 'HOME', label: 'Recently Added Title', type: 'STRING', description: 'Section title for recently added products.', fallback: 'Recently Added' },
  { key: 'HOME_RECENT_SUBTITLE', group: 'HOME', label: 'Recently Added Subtitle', type: 'STRING', description: 'Section subtitle for recently added products.', fallback: 'Freshly approved products added by active marketplace suppliers.' },
  { key: 'HOME_CAMPAIGN_TITLE', group: 'HOME', label: 'Hot Campaigns Title', type: 'STRING', description: 'Section title for sponsored campaigns.', fallback: 'Hot Campaigns' },
  { key: 'HOME_CAMPAIGN_SUBTITLE', group: 'HOME', label: 'Hot Campaigns Subtitle', type: 'STRING', description: 'Section subtitle for sponsored campaigns.', fallback: 'Sponsored placements and high-visibility product promotions.' },
  { key: 'HOME_VERIFIED_SUPPLIERS_TITLE', group: 'HOME', label: 'Verified Suppliers Title', type: 'STRING', description: 'Section title for verified suppliers.', fallback: 'Verified Suppliers' },
  { key: 'HOME_VERIFIED_SUPPLIERS_SUBTITLE', group: 'HOME', label: 'Verified Suppliers Subtitle', type: 'STRING', description: 'Section subtitle for verified suppliers.', fallback: 'Trade with confidence through verified companies and active catalogs.' },
  { key: 'HOME_TOP_SUPPLIERS_TITLE', group: 'HOME', label: 'Top Suppliers Title', type: 'STRING', description: 'Section title for top suppliers.', fallback: 'Top Ranking Suppliers' },
  { key: 'HOME_TOP_SUPPLIERS_SUBTITLE', group: 'HOME', label: 'Top Suppliers Subtitle', type: 'STRING', description: 'Section subtitle for top suppliers.', fallback: 'High-visibility verified suppliers with strong catalog depth and buyer activity.' },
  { key: 'HOME_NEW_ARRIVALS_TITLE', group: 'HOME', label: 'New Arrivals Title', type: 'STRING', description: 'Section title for new arrival products.', fallback: 'New Arrival Products' },
  { key: 'HOME_NEW_ARRIVALS_SUBTITLE', group: 'HOME', label: 'New Arrivals Subtitle', type: 'STRING', description: 'Section subtitle for new arrival products.', fallback: 'Fresh marketplace listings recently approved and ready for sourcing.' },
  { key: 'STRIPE_ENABLED', group: 'PAYMENT', label: 'Stripe Enabled', type: 'BOOLEAN', description: 'Enable or disable Stripe checkout across supported payment flows.', fallback: process.env.STRIPE_ENABLED || 'true' },
  { key: 'STRIPE_MODE', group: 'PAYMENT', label: 'Stripe Mode', type: 'STRING', description: 'Environment mode for Stripe checkout. Typical values are sandbox or live.', fallback: process.env.STRIPE_MODE || (process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'sandbox' : 'live') },
  { key: 'STRIPE_SECRET_KEY', group: 'PAYMENT', label: 'Stripe Secret Key', type: 'PASSWORD', isSecret: true, description: 'Used for trade assurance funding, sample order payments, and Stripe checkout sessions.', fallback: process.env.STRIPE_SECRET_KEY || '' },
  { key: 'STRIPE_PUBLISHABLE_KEY', group: 'PAYMENT', label: 'Stripe Publishable Key', type: 'STRING', description: 'Frontend Stripe key for hosted checkout and embedded payment flows.', fallback: process.env.STRIPE_PUBLISHABLE_KEY || '' },
  { key: 'STRIPE_WEBHOOK_SECRET', group: 'PAYMENT', label: 'Stripe Webhook Secret', type: 'PASSWORD', isSecret: true, description: 'Verifies incoming webhook events from Stripe before payment state changes are applied.', fallback: process.env.STRIPE_WEBHOOK_SECRET || '' },
  { key: 'SSLCOMMERZ_ENABLED', group: 'PAYMENT', label: 'SSLCommerz Enabled', type: 'BOOLEAN', description: 'Enable or disable SSLCommerz checkout across supported payment flows.', fallback: process.env.SSLCOMMERZ_ENABLED || 'true' },
  { key: 'SSLCOMMERZ_STORE_ID', group: 'PAYMENT', label: 'SSLCommerz Store ID', type: 'STRING', description: 'Merchant store identifier used for SSLCommerz hosted checkout in Bangladesh.', fallback: process.env.SSLCOMMERZ_STORE_ID || '' },
  { key: 'SSLCOMMERZ_STORE_PASSWORD', group: 'PAYMENT', label: 'SSLCommerz Store Password', type: 'PASSWORD', isSecret: true, description: 'Store password paired with the SSLCommerz merchant account.', fallback: process.env.SSLCOMMERZ_STORE_PASSWORD || '' },
  { key: 'SSLCOMMERZ_SANDBOX_MODE', group: 'PAYMENT', label: 'SSLCommerz Sandbox Mode', type: 'BOOLEAN', description: 'Use SSLCommerz sandbox endpoints when true, or production endpoints when false.', fallback: process.env.SSLCOMMERZ_SANDBOX_MODE || 'true' },
  { key: 'AAMARPAY_ENABLED', group: 'PAYMENT', label: 'aamarPay Enabled', type: 'BOOLEAN', description: 'Enable or disable aamarPay checkout across supported payment flows.', fallback: process.env.AAMARPAY_ENABLED || 'true' },
  { key: 'AAMARPAY_STORE_ID', group: 'PAYMENT', label: 'aamarPay Store ID', type: 'STRING', description: 'Merchant store identifier used for aamarPay hosted checkout in Bangladesh.', fallback: process.env.AAMARPAY_STORE_ID || '' },
  { key: 'AAMARPAY_SIGNATURE_KEY', group: 'PAYMENT', label: 'aamarPay Signature Key', type: 'PASSWORD', isSecret: true, description: 'Signature key paired with the aamarPay merchant account.', fallback: process.env.AAMARPAY_SIGNATURE_KEY || '' },
  { key: 'AAMARPAY_SANDBOX_MODE', group: 'PAYMENT', label: 'aamarPay Sandbox Mode', type: 'BOOLEAN', description: 'Use aamarPay sandbox endpoints when true, or production endpoints when false.', fallback: process.env.AAMARPAY_SANDBOX_MODE || 'true' },
  { key: 'NOWPAYMENTS_ENABLED', group: 'PAYMENT', label: 'NOWPayments Enabled', type: 'BOOLEAN', description: 'Enable or disable NOWPayments crypto invoice checkout across supported payment flows.', fallback: process.env.NOWPAYMENTS_ENABLED || 'true' },
  { key: 'NOWPAYMENTS_API_KEY', group: 'PAYMENT', label: 'NOWPayments API Key', type: 'PASSWORD', isSecret: true, description: 'API key used to create crypto payment invoices with NOWPayments.', fallback: process.env.NOWPAYMENTS_API_KEY || '' },
  { key: 'NOWPAYMENTS_IPN_SECRET', group: 'PAYMENT', label: 'NOWPayments IPN Secret', type: 'PASSWORD', isSecret: true, description: 'Secret used to verify NOWPayments callback signatures.', fallback: process.env.NOWPAYMENTS_IPN_SECRET || '' },
  { key: 'NOWPAYMENTS_SANDBOX_MODE', group: 'PAYMENT', label: 'NOWPayments Sandbox Mode', type: 'BOOLEAN', description: 'Use NOWPayments sandbox endpoints when true, or production endpoints when false.', fallback: process.env.NOWPAYMENTS_SANDBOX_MODE || 'true' },
  { key: 'PAYPAL_ENABLED', group: 'PAYMENT', label: 'PayPal Enabled', type: 'BOOLEAN', description: 'Enable or disable PayPal wherever PayPal payment flows are supported.', fallback: process.env.PAYPAL_ENABLED || 'false' },
  { key: 'PAYPAL_CLIENT_ID', group: 'PAYMENT', label: 'PayPal Client ID', type: 'STRING', description: 'PayPal application client identifier for subscription and wallet integrations.', fallback: process.env.PAYPAL_CLIENT_ID || '' },
  { key: 'PAYPAL_CLIENT_SECRET', group: 'PAYMENT', label: 'PayPal Client Secret', type: 'PASSWORD', isSecret: true, description: 'Secret credential paired with the PayPal client ID.', fallback: process.env.PAYPAL_CLIENT_SECRET || '' },
  { key: 'PAYPAL_MODE', group: 'PAYMENT', label: 'PayPal Mode', type: 'STRING', description: 'Environment mode for PayPal requests. Typical values are sandbox or live.', fallback: process.env.PAYPAL_MODE || 'sandbox' },
  { key: 'DHL_TRACKING_API_KEY', group: 'SHIPPING', label: 'DHL Tracking API Key', type: 'PASSWORD', isSecret: true, description: 'Credential for DHL shipment lookup and tracking sync.', fallback: process.env.DHL_TRACKING_API_KEY || '' },
  { key: 'FEDEX_API_KEY', group: 'SHIPPING', label: 'FedEx API Key', type: 'PASSWORD', isSecret: true, description: 'FedEx API key used for rate, tracking, and shipment service integrations.', fallback: process.env.FEDEX_API_KEY || '' },
  { key: 'FEDEX_API_SECRET', group: 'SHIPPING', label: 'FedEx API Secret', type: 'PASSWORD', isSecret: true, description: 'FedEx API secret paired with the configured API key.', fallback: process.env.FEDEX_API_SECRET || '' },
  { key: 'UPS_CLIENT_ID', group: 'SHIPPING', label: 'UPS Client ID', type: 'STRING', description: 'UPS OAuth client ID for shipment and tracking requests.', fallback: process.env.UPS_CLIENT_ID || '' },
  { key: 'UPS_CLIENT_SECRET', group: 'SHIPPING', label: 'UPS Client Secret', type: 'PASSWORD', isSecret: true, description: 'UPS OAuth client secret used to fetch access tokens.', fallback: process.env.UPS_CLIENT_SECRET || '' },
  { key: 'MAERSK_API_KEY', group: 'SHIPPING', label: 'Maersk API Key', type: 'PASSWORD', isSecret: true, description: 'Used for ocean freight booking and container milestone integrations.', fallback: process.env.MAERSK_API_KEY || '' },
  { key: 'ACTIVE_SHIPPING_CARRIERS', group: 'SHIPPING', label: 'Active Shipping Carriers', type: 'STRING', description: 'Comma-separated carrier codes allowed in supplier shipment dropdowns. Example: DHL,FEDEX,UPS,MAERSK', fallback: 'DHL,FEDEX,UPS,MAERSK' },
  { key: 'DEFAULT_FINANCING_PARTNER', group: 'PARTNERS', label: 'Default Financing Partner', type: 'STRING', description: 'Primary lender or fintech partner surfaced in supplier financing workflows.', fallback: process.env.DEFAULT_FINANCING_PARTNER || 'Global Trade Capital' },
  { key: 'DEFAULT_INSURANCE_PROVIDER', group: 'PARTNERS', label: 'Default Insurance Provider', type: 'STRING', description: 'Default insurance carrier displayed for cargo and trade insurance offers.', fallback: process.env.DEFAULT_INSURANCE_PROVIDER || 'Allianz Trade' },
  { key: 'GOOGLE_LOGIN_ENABLED', group: 'SOCIAL', label: 'Google Login Enabled', type: 'BOOLEAN', description: 'Enable Google OAuth login on the authentication screens.', fallback: 'false' },
  { key: 'GOOGLE_CLIENT_ID', group: 'SOCIAL', label: 'Google Client ID', type: 'STRING', description: 'OAuth client ID for Google sign-in.', fallback: process.env.GOOGLE_CLIENT_ID || '' },
  { key: 'GOOGLE_CLIENT_SECRET', group: 'SOCIAL', label: 'Google Client Secret', type: 'PASSWORD', isSecret: true, description: 'OAuth client secret for Google sign-in.', fallback: process.env.GOOGLE_CLIENT_SECRET || '' },
  { key: 'FACEBOOK_LOGIN_ENABLED', group: 'SOCIAL', label: 'Facebook Login Enabled', type: 'BOOLEAN', description: 'Enable Facebook OAuth login on the authentication screens.', fallback: 'false' },
  { key: 'FACEBOOK_CLIENT_ID', group: 'SOCIAL', label: 'Facebook App ID', type: 'STRING', description: 'OAuth app identifier for Facebook login.', fallback: process.env.FACEBOOK_CLIENT_ID || '' },
  { key: 'FACEBOOK_CLIENT_SECRET', group: 'SOCIAL', label: 'Facebook App Secret', type: 'PASSWORD', isSecret: true, description: 'OAuth app secret for Facebook login.', fallback: process.env.FACEBOOK_CLIENT_SECRET || '' },
  { key: 'MULTI_CURRENCY_ENABLED', group: 'CURRENCY', label: 'Multi Currency Enabled', type: 'BOOLEAN', description: 'Enable live multi-currency conversion across non-admin user-facing experiences.', fallback: 'true' },
  { key: 'EXCHANGE_RATE_API_KEY', group: 'CURRENCY', label: 'ExchangeRate API Key', type: 'PASSWORD', isSecret: true, description: 'API key from ExchangeRate-API used to sync live currency conversion rates.', fallback: '' },
  { key: 'EXCHANGE_RATE_API_BASE_URL', group: 'CURRENCY', label: 'ExchangeRate API Base URL', type: 'STRING', description: 'Base API URL for ExchangeRate-API standard requests.', fallback: 'https://v6.exchangerate-api.com/v6' },
  { key: 'MULTI_CURRENCY_BASE_CODE', group: 'CURRENCY', label: 'Base Currency Code', type: 'STRING', description: 'Base currency code used when syncing conversion rates into the database.', fallback: 'USD' },
  { key: 'MULTI_CURRENCY_DEFAULT_DISPLAY', group: 'CURRENCY', label: 'Default Display Currency', type: 'STRING', description: 'Default currency shown to users before they choose another display currency.', fallback: 'USD' },
  { key: 'MULTI_CURRENCY_SYNC_HOURS', group: 'CURRENCY', label: 'Rate Sync Interval (Hours)', type: 'NUMBER', description: 'How many hours currency rates can stay cached in the database before refreshing.', fallback: '6' },
  { key: 'SMTP_HOST', group: 'EMAIL', label: 'SMTP Host', type: 'STRING', description: 'Mail server hostname used for transactional emails.', fallback: process.env.SMTP_HOST || '' },
  { key: 'SMTP_PORT', group: 'EMAIL', label: 'SMTP Port', type: 'NUMBER', description: 'SMTP server port. Common values are 587 for TLS or 465 for SSL.', fallback: process.env.SMTP_PORT || '587' },
  { key: 'SMTP_SECURE', group: 'EMAIL', label: 'SMTP Secure', type: 'BOOLEAN', description: 'Enable secure SMTP transport when the provider requires SSL/TLS from connection start.', fallback: process.env.SMTP_SECURE || 'false' },
  { key: 'SMTP_USER', group: 'EMAIL', label: 'SMTP User', type: 'STRING', description: 'SMTP username used by the platform mailer.', fallback: process.env.SMTP_USER || '' },
  { key: 'SMTP_PASS', group: 'EMAIL', label: 'SMTP Password', type: 'PASSWORD', isSecret: true, description: 'Password or app token used for SMTP authentication.', fallback: process.env.SMTP_PASS || '' },
  { key: 'SMTP_FROM', group: 'EMAIL', label: 'SMTP From', type: 'STRING', description: 'Default sender identity for outgoing emails.', fallback: process.env.SMTP_FROM || 'Kaniz Global Trade <noreply@kanizglobaltrade.com>' },
  { key: 'ADS_ENABLED', group: 'ADVERTISING', label: 'Advertising Enabled', type: 'BOOLEAN', description: 'Master switch for supplier advertising campaign creation.', fallback: 'true' },
  { key: 'ADS_AUTO_APPROVE', group: 'ADVERTISING', label: 'Auto Approve Campaigns', type: 'BOOLEAN', description: 'When enabled, new ad campaigns become active immediately instead of waiting for Kaniz Global Trade review.', fallback: 'false' },
  { key: 'ADS_REQUIRE_PRODUCT_LINK', group: 'ADVERTISING', label: 'Require Linked Product', type: 'BOOLEAN', description: 'Require every advertising campaign to be connected to a product.', fallback: 'false' },
  { key: 'ADS_DEFAULT_BUDGET', group: 'ADVERTISING', label: 'Default Budget', type: 'NUMBER', description: 'Default budget suggested in the advertising form.', fallback: '500' },
  { key: 'ADS_DEFAULT_BID', group: 'ADVERTISING', label: 'Default Bid', type: 'NUMBER', description: 'Default bid amount suggested in the advertising form.', fallback: '25' },
  { key: 'ADS_MIN_BUDGET', group: 'ADVERTISING', label: 'Minimum Budget', type: 'NUMBER', description: 'Lowest campaign budget allowed during submission.', fallback: '100' },
  { key: 'ADS_MAX_BUDGET', group: 'ADVERTISING', label: 'Maximum Budget', type: 'NUMBER', description: 'Highest campaign budget allowed during submission.', fallback: '50000' },
  { key: 'ADS_MIN_BID', group: 'ADVERTISING', label: 'Minimum Bid', type: 'NUMBER', description: 'Lowest bid amount allowed during submission.', fallback: '5' },
  { key: 'ADS_MAX_BID', group: 'ADVERTISING', label: 'Maximum Bid', type: 'NUMBER', description: 'Highest bid amount allowed during submission.', fallback: '5000' },
  { key: 'ADS_DEFAULT_DURATION_DAYS', group: 'ADVERTISING', label: 'Default Campaign Duration (Days)', type: 'NUMBER', description: 'How many days a new campaign should run by default in the supplier form.', fallback: '7' },
  { key: 'ADS_ALLOWED_PLACEMENTS', group: 'ADVERTISING', label: 'Allowed Placements', type: 'STRING', description: 'Comma-separated placements allowed in supplier advertising. Example: SEARCH_TOP,HOMEPAGE_FEATURED', fallback: 'SEARCH_TOP,HOMEPAGE_HERO,HOMEPAGE_FEATURED,CATEGORY_SPOTLIGHT' },
  { key: 'ADS_SEARCH_TOP_ENABLED', group: 'ADVERTISING', label: 'Search Top Placement Enabled', type: 'BOOLEAN', description: 'Allow campaigns to target the Search Top placement.', fallback: 'true' },
  { key: 'ADS_HOMEPAGE_HERO_ENABLED', group: 'ADVERTISING', label: 'Homepage Hero Placement Enabled', type: 'BOOLEAN', description: 'Allow campaigns to target the Homepage Hero placement.', fallback: 'true' },
  { key: 'ADS_HOMEPAGE_FEATURED_ENABLED', group: 'ADVERTISING', label: 'Homepage Featured Placement Enabled', type: 'BOOLEAN', description: 'Allow campaigns to target the Homepage Featured placement.', fallback: 'true' },
  { key: 'ADS_CATEGORY_SPOTLIGHT_ENABLED', group: 'ADVERTISING', label: 'Category Spotlight Placement Enabled', type: 'BOOLEAN', description: 'Allow campaigns to target the Category Spotlight placement.', fallback: 'true' },
  { key: 'S3_ACCESS_KEY', group: 'STORAGE', label: 'S3 Access Key', type: 'STRING', description: 'Access key for Cloudflare R2 or S3-compatible object storage.', fallback: process.env.S3_ACCESS_KEY || '' },
  { key: 'S3_SECRET_KEY', group: 'STORAGE', label: 'S3 Secret Key', type: 'PASSWORD', isSecret: true, description: 'Secret key paired with the configured object storage access key.', fallback: process.env.S3_SECRET_KEY || '' },
  { key: 'S3_BUCKET', group: 'STORAGE', label: 'S3 Bucket', type: 'STRING', description: 'Target bucket used for product media, documents, and uploads.', fallback: process.env.S3_BUCKET || '' },
  { key: 'S3_ENDPOINT', group: 'STORAGE', label: 'S3 Endpoint', type: 'STRING', description: 'Custom endpoint URL for R2 or any S3-compatible provider.', fallback: process.env.S3_ENDPOINT || '' },
  { key: 'S3_REGION', group: 'STORAGE', label: 'S3 Region', type: 'STRING', description: 'Storage region. For Cloudflare R2 this commonly stays as auto.', fallback: process.env.S3_REGION || 'auto' },
  { key: 'NEXT_PUBLIC_CDN_URL', group: 'STORAGE', label: 'CDN URL', type: 'STRING', description: 'Optional public CDN base URL for serving uploaded assets.', fallback: process.env.NEXT_PUBLIC_CDN_URL || '' },
  { key: 'VIDEO_THUMBNAILS_ENABLED', group: 'MEDIA', label: 'Video Thumbnails Enabled', type: 'BOOLEAN', description: 'Allow the server to generate thumbnails from uploaded product videos using FFmpeg.', fallback: process.env.VIDEO_THUMBNAILS_ENABLED || 'true' },
  { key: 'FFMPEG_PATH', group: 'MEDIA', label: 'FFmpeg Binary Path', type: 'STRING', description: 'Absolute path to ffmpeg executable used for thumbnail generation and future video processing tasks.', fallback: process.env.FFMPEG_PATH || '' },
]

export const SETTINGS_GROUPS = [
  { key: 'AI', label: 'AI Search & Image Search' },
  { key: 'HOME', label: 'Home Page' },
  { key: 'PAYMENT', label: 'Payment Gateways' },
  { key: 'SHIPPING', label: 'Shipping & Tracking' },
  { key: 'PARTNERS', label: 'Finance & Insurance Partners' },
  { key: 'SOCIAL', label: 'Social Login' },
  { key: 'CURRENCY', label: 'Currency & Exchange Rates' },
  { key: 'LANGUAGE', label: 'Languages & Translations' },
  { key: 'ADVERTISING', label: 'Advertising & Campaigns' },
  { key: 'EMAIL', label: 'SMTP Email' },
  { key: 'STORAGE', label: 'Cloudflare R2 / AWS S3' },
  { key: 'MEDIA', label: 'Media & FFmpeg' },
] as const

const definitionMap = new Map(SYSTEM_SETTING_DEFINITIONS.map((item) => [item.key, item]))

export async function ensureSystemSettingsSeeded() {
  await Promise.all(
    SYSTEM_SETTING_DEFINITIONS.map((definition) =>
      prisma.systemSetting.upsert({
        where: { key: definition.key },
        create: {
          key: definition.key,
          value: definition.fallback || '',
          type: definition.type,
          group: definition.group,
          label: definition.label,
          description: definition.description,
          isSecret: definition.isSecret || false,
        },
        update: {
          group: definition.group,
          label: definition.label,
          type: definition.type,
          description: definition.description,
          isSecret: definition.isSecret || false,
        },
      })
    )
  )
}

export async function getSettingsByGroup(group: string) {
  await ensureSystemSettingsSeeded()
  return prisma.systemSetting.findMany({
    where: { group },
    orderBy: { key: 'asc' },
  })
}

export async function getSettingValue(key: string): Promise<string> {
  const setting = await prisma.systemSetting.findUnique({ where: { key } })
  if (setting?.value != null && setting.value !== '') return setting.value
  return definitionMap.get(key)?.fallback || ''
}

export async function getSettingsMap(keys: string[]) {
  const rows = await prisma.systemSetting.findMany({
    where: { key: { in: keys } },
    select: { key: true, value: true },
  })
  const map = new Map(rows.map((row) => [row.key, row.value || '']))
  return keys.reduce<Record<string, string>>((acc, key) => {
    acc[key] = map.get(key) || definitionMap.get(key)?.fallback || ''
    return acc
  }, {})
}

export async function updateSettings(group: string, values: Array<{ key: string; value: string; updatedBy?: string }>) {
  await ensureSystemSettingsSeeded()
  return prisma.$transaction(
    values.map((item) =>
      prisma.systemSetting.update({
        where: { key: item.key },
        data: {
          value: item.value,
          updatedBy: item.updatedBy,
          group,
        },
      })
    )
  )
}
