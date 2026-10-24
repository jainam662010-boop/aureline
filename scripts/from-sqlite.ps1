# Reverse scripts\to-sqlite.ps1 — restores PostgreSQL provider + native types.
# Run from repo root:  powershell -File scripts\from-sqlite.ps1
#
# Prisma cannot re-derive @db.Decimal(10,2) automatically, so this restores the
# provider and re-applies the precision Prisma uses by default for Decimal.
# Review the diff before running migrations.

$f = 'prisma\schema.prisma'
if (Test-Path "$env:TEMP\schema.prisma.bak") {
  Copy-Item "$env:TEMP\schema.prisma.bak" $f -Force
  Write-Host "Restored from $env:TEMP\schema.prisma.bak"
  Write-Host ""
  Write-Host "Check the result, then run:"
  Write-Host "  npx prisma migrate dev"
  exit 0
}

# No backup available (new shell / cleared temp) — patch in place instead.
Write-Host "No backup found, patching in place."
$c = Get-Content $f -Raw
$c = $c -replace 'provider\s*=\s*"sqlite"', 'provider      = "postgresql"'
# Re-add the directUrl line Prisma expects for Postgres.
$c = $c -replace '(url\s*=\s*env\("DATABASE_URL"\))', "`$1`n  directUrl = env(`"DIRECT_URL`")"
Set-Content $f $c -NoNewline

Write-Host ""
Write-Host "Restored provider to postgresql."
Write-Host "NOTE: @db.Decimal(...) attributes were NOT restored. Decimal fields will"
Write-Host "      use Prisma's default precision. Diff against git before migrating."
