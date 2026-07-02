# Incident Response

## Immediate Steps
1. Check `GET /api/health` and the admin system dashboard.
2. Identify whether the incident is app, database, Redis, search, socket, queue, storage, payment, or security related.
3. Freeze risky admin actions if payment, auth, or data integrity is affected.

## Triage
- Review recent `SystemEvent` records for `CRITICAL` and `ERROR` severity.
- Review queue dead-letter counts and recent failed jobs.
- Review recent payment webhook failures and upload rejects.
- Confirm whether customer-facing mutations should be temporarily disabled.

## Containment
- Payment issue: pause payment-dependent launch steps and verify webhook signatures/secrets.
- Search sync issue: disable stale search exposure by checking search queue and dead-letter failures.
- Storage issue: stop uploads and preserve local evidence of failed requests.
- Security issue: review recent auth failures and suspicious activity events, then rotate secrets if needed.

## Recovery
- Restore the failing dependency.
- Re-run health checks.
- Reprocess dead-letter or failed queue jobs only after root cause is fixed.
- Verify backup freshness before any risky data repair.

## Post-Incident
- Record timeline, root cause, impact, and remediation.
- Update launch checklist or runbook gaps exposed by the incident.
