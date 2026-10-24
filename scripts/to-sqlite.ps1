# One-off: convert prisma/schema.prisma from PostgreSQL to SQLite.
# Run from repo root:  powershell -File scripts\to-sqlite.ps1
# Revert with:         Copy-Item $env:TEMP\schema.prisma.bak prisma\schema.prisma

$f = 'prisma\schema.prisma'
Copy-Item $f "$env:TEMP\schema.prisma.bak" -Force
Write-Host "Backed up -> $env:TEMP\schema.prisma.bak"

$c = Get-Content $f -Raw

# 1. Provider swap
$c = $c -replace 'provider\s*=\s*"postgresql"', 'provider      = "sqlite"'

# 2. SQLite has no shadow/direct URL concept
$c = $c -replace '[ \t]*directUrl\s*=\s*env\("DIRECT_URL"\)\r?\n', ''

# 3. Postgres-only native type attributes
$c = $c -replace '@db\.Decimal\(\d+,\s*\d+\)', ''

# 4. Prisma emits `DEFAULT {}` / `DEFAULT []` for these, which SQLite rejects.
#    The app already supplies state/priceBreakdown/designJson on every insert,
#    and the seed script supplies the catalog fields.
$c = $c -replace '@default\("\{\}"\)', ''
$c = $c -replace '@default\("\[\]"\)', ''

Set-Content $f $c -NoNewline

Write-Host ""
Write-Host "=== result ==="
Write-Host ("  provider lines : " + ((Select-String -Path $f -Pattern 'provider\s*=').Count))
(Select-String -Path $f -Pattern 'provider\s*=') | ForEach-Object { Write-Host ("    " + $_.Line.Trim()) }
Write-Host ("  directUrl left : " + (Select-String -Path $f -Pattern 'directUrl').Count)
Write-Host ("  @db.* left     : " + (Select-String -Path $f -Pattern '@db\.').Count)
Write-Host ("  models         : " + (Select-String -Path $f -Pattern '^model ').Count)
Write-Host ("  enums          : " + (Select-String -Path $f -Pattern '^enum ').Count)
