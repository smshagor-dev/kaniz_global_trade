# Production Launch Checklist

## Infrastructure
- Confirm `npm run lint`, `npm run type-check`, and `npm test` pass on the release commit.
- Apply pending Prisma migrations and verify `prisma migrate status` is clean.
- Verify MySQL, Redis, Meilisearch, Socket.IO, queue workers, and object storage are reachable from production.
- Confirm `GET /api/health` returns `healthy` before go-live.

## Security
- Set real JWT, payment, OAuth, SMTP, Redis, Meilisearch, and storage secrets.
- Verify webhook secrets for Stripe and NOWPayments.
- Review the admin system dashboard for recent auth failures, upload rejects, queue failures, and webhook failures.
- Confirm rate limiting and KYC/compliance gates are enabled.

## Data Safety
- Run `npm run backup:mysql` and confirm the dump exists.
- Run `npm run backup:verify` and confirm the latest dump is non-empty.
- Store backup artifacts outside the app host on a scheduled basis.

## Operations
- Start the Next.js app, Socket.IO server, and queue worker process set.
- Confirm the admin system dashboard shows healthy services and no dead-letter queue buildup.
- Smoke-test login, product/company/RFQ mutations, payment callbacks, uploads, chat, and search sync.

## Go/No-Go
- No critical health dependencies are `down`.
- No unresolved payment webhook failures are newer than the release window.
- No unresolved security incidents are blocking launch.
