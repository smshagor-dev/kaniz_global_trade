param(
  [string]$BackupRoot = ".\\backups\\mysql",
  [int]$RetentionDays = 14,
  [switch]$VerifyOnly
)

$ErrorActionPreference = "Stop"

function Require-Env([string]$Name) {
  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Environment variable '$Name' is required."
  }
  return $value
}

$mysqlHost = Require-Env "MYSQL_HOST"
$mysqlPort = [Environment]::GetEnvironmentVariable("MYSQL_PORT")
if ([string]::IsNullOrWhiteSpace($mysqlPort)) { $mysqlPort = "3306" }
$mysqlUser = Require-Env "MYSQL_USER"
$mysqlPassword = Require-Env "MYSQL_PASSWORD"
$mysqlDatabase = Require-Env "MYSQL_DATABASE"

$resolvedRoot = Resolve-Path -LiteralPath "." | Select-Object -ExpandProperty Path
$targetRoot = Join-Path $resolvedRoot $BackupRoot
New-Item -ItemType Directory -Force -Path $targetRoot | Out-Null

if ($VerifyOnly) {
  $latest = Get-ChildItem -LiteralPath $targetRoot -Filter "*.sql" | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
  if (-not $latest) {
    throw "No backup files found in $targetRoot"
  }
  if ($latest.Length -le 0) {
    throw "Latest backup file is empty: $($latest.FullName)"
  }
  Write-Output "Latest backup verified: $($latest.FullName)"
  exit 0
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $targetRoot "$($mysqlDatabase)-$timestamp.sql"

$env:MYSQL_PWD = $mysqlPassword
try {
  & mysqldump "--host=$mysqlHost" "--port=$mysqlPort" "--user=$mysqlUser" "--single-transaction" "--routines" "--events" "--triggers" $mysqlDatabase | Out-File -LiteralPath $backupFile -Encoding utf8
} finally {
  Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}

if (-not (Test-Path -LiteralPath $backupFile)) {
  throw "Backup file was not created."
}

$cutoff = (Get-Date).AddDays(-1 * $RetentionDays)
Get-ChildItem -LiteralPath $targetRoot -Filter "*.sql" |
  Where-Object { $_.LastWriteTime -lt $cutoff } |
  Remove-Item -Force

Write-Output "Backup completed: $backupFile"
