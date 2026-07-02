# Backup Restore

## Backup
- Command: `npm run backup:mysql`
- Verification: `npm run backup:verify`
- Default location: `backups/mysql`
- Retention: 14 days by default

Required environment variables:
- `MYSQL_HOST`
- `MYSQL_PORT` optional, defaults to `3306`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`

## Restore
1. Choose the target dump from `backups/mysql`.
2. Create an empty target database or confirm the restore target.
3. Run:

```powershell
$env:MYSQL_PWD='your-password'
mysql --host=your-host --port=3306 --user=your-user your-database < .\backups\mysql\your-dump.sql
Remove-Item Env:MYSQL_PWD
```

## Verification
- Run `npm run backup:verify`
- Optionally inspect the newest dump:

```powershell
Get-ChildItem .\backups\mysql\*.sql | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
```
