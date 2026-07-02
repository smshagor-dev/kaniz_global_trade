# Security Setup

This project must run with environment-managed secrets in every production environment. Do not commit `.env` files, cloud credentials, payment keys, SMTP passwords, JWT secrets, or seeded admin passwords.

## Required Production Variables

Set these before running `prisma db seed`, `npm run build`, or starting the app:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.example
DATABASE_URL=mysql://app_user:strong_password@db-host:3306/kaniz_global_trade
REDIS_URL=redis://redis-host:6379
JWT_ACCESS_SECRET=<64+ random chars>
JWT_REFRESH_SECRET=<64+ different random chars>
SEED_SUPER_ADMIN_EMAIL=admin@your-domain.example
SEED_SUPER_ADMIN_PASSWORD=<strong unique password>
```

Configure these when the related features are enabled:

- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWORD`
- `AAMARPAY_STORE_ID`, `AAMARPAY_SIGNATURE_KEY`
- `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`
- `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_ENDPOINT`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `MEILISEARCH_API_KEY`
- `GOOGLE_CLIENT_SECRET`, `FACEBOOK_CLIENT_SECRET` if social login is enabled

## Seed And Demo Accounts

- Production seeding requires `SEED_SUPER_ADMIN_EMAIL` and `SEED_SUPER_ADMIN_PASSWORD`.
- Production does not create supplier/buyer demo accounts unless you intentionally change the code and deployment policy.
- Local non-production demo accounts are opt-in with `ENABLE_DEMO_ACCOUNTS=true`.
- The login page only shows demo autofill buttons when `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true` and matching public demo credentials are supplied.
- Keep `NEXT_PUBLIC_ENABLE_DEMO_LOGIN=false` in staging and production.

## Secret Rotation

Rotate secrets immediately if they were ever committed, shared in chat, exposed in CI logs, or copied into screenshots.

Recommended process:

1. Rotate the secret at the provider first.
2. Update the deployment environment or secret manager.
3. Restart application processes so the new secret is loaded.
4. Invalidate dependent sessions or tokens when applicable.
5. Verify callbacks, logins, uploads, and background jobs after rotation.

High-priority rotation targets:

- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`
- Payment gateway keys and webhook secrets
- SMTP credentials
- S3/R2 credentials
- Database and Redis passwords
- Social login client secrets

## Production Hygiene Checklist

- Store secrets in your platform secret manager, not in git.
- Keep `.env` only on developer machines or private deployment hosts.
- Use least-privilege database, Redis, object storage, and payment credentials.
- Disable unused gateways by setting their `*_ENABLED` flag to `false`.
- Keep demo login disabled outside local development.
- Review admin settings for accidentally pasted live secrets before exporting database snapshots.
- Avoid logging tokens, webhook payload signatures, auth headers, or secret-bearing config objects.

## Verification Commands

Run these after setup:

```powershell
git ls-files .env
rg -n --hidden --glob '!node_modules/**' --glob '!.next/**' --glob '!.git/**' "(sk_live_|pk_live_|AKIA|AIza|-----BEGIN|JWT_ACCESS_SECRET=|JWT_REFRESH_SECRET=|redis://|postgres(ql)?://|mysql://.*:.*@|SMTP_PASS=|S3_SECRET_KEY=)"
npm run lint
npm run type-check
```

If you seed a fresh database, verify the admin account explicitly:

```powershell
npx prisma db seed
```
