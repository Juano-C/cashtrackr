param(
    [string]$HostName = "localhost",
    [int]$Port = 5432,
    [string]$AdminUser = "postgres",
    [string]$AppUser = "cashtrackr",
    [string]$AppPassword = "cashtrackr",
    [string]$Database = "cashtrackr"
)

$ErrorActionPreference = "Stop"
$backendRoot = Split-Path -Parent $PSScriptRoot
$envLocal = Join-Path $backendRoot ".env.local"

function Find-Psql {
    $command = Get-Command psql.exe -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }

    $installed = Get-ChildItem "C:\Program Files\PostgreSQL" -Recurse -Filter psql.exe -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending |
        Select-Object -First 1

    if ($installed) { return $installed.FullName }

    throw "No se encontro psql.exe. Agrega C:\Program Files\PostgreSQL\<version>\bin al PATH o instala PostgreSQL."
}

$psql = Find-Psql
Write-Host ""
Write-Host "Configuracion de PostgreSQL local para CashTrackr" -ForegroundColor Cyan
Write-Host "  psql:   $psql"
Write-Host "  host:   ${HostName}:${Port}"
Write-Host "  admin:  $AdminUser"
Write-Host "  app:    $AppUser / base $Database"
Write-Host ""

$securePassword = Read-Host "Contrasena del usuario '$AdminUser' (no se muestra)" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
$plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)

$env:PGPASSWORD = $plainPassword
$env:PGSSLMODE = "disable"

try {
    & $psql -w -h $HostName -p $Port -U $AdminUser -d postgres -v ON_ERROR_STOP=1 -c "select 1" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo conectar como '$AdminUser'. Verifica que el servicio de PostgreSQL este iniciado y la contrasena sea correcta."
    }

    Write-Host "Conexion de administrador OK. Creando rol y base..." -ForegroundColor Green

    $roleSql = "DO `$`$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$AppUser') THEN CREATE ROLE $AppUser LOGIN PASSWORD '$AppPassword'; ELSE ALTER ROLE $AppUser WITH LOGIN PASSWORD '$AppPassword'; END IF; END `$`$;"
    & $psql -w -h $HostName -p $Port -U $AdminUser -d postgres -v ON_ERROR_STOP=1 -c $roleSql | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "No se pudo crear o actualizar el rol '$AppUser'." }

    $databaseResult = & $psql -w -h $HostName -p $Port -U $AdminUser -d postgres -tAc "select 1 from pg_database where datname = '$Database'"
    if ($LASTEXITCODE -ne 0) { throw "No se pudo verificar si existe la base '$Database'." }
    $databaseExists = ("$databaseResult").Trim()

    if ($databaseExists -ne "1") {
        & $psql -w -h $HostName -p $Port -U $AdminUser -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $Database OWNER $AppUser" | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "No se pudo crear la base '$Database'." }
        Write-Host "Base '$Database' creada." -ForegroundColor Green
    } else {
        Write-Host "La base '$Database' ya existe; se reutiliza." -ForegroundColor Yellow
    }
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:PGSSLMODE -ErrorAction SilentlyContinue
}

$connectionUrl = "postgresql://${AppUser}:${AppPassword}@${HostName}:${Port}/${Database}"
$block = "# PostgreSQL local (generado por scripts/setup-local-db.ps1)`nDATABASE_URL=$connectionUrl`nDB_SSL=false`n"

if (Test-Path $envLocal) {
    $current = [System.IO.File]::ReadAllText($envLocal)
    if ($current -match "(?m)^DATABASE_URL=") {
        Write-Host ""
        Write-Host "Ya existe $envLocal con DATABASE_URL; no se modifico." -ForegroundColor Yellow
        Write-Host "Si queres usar esta base, reemplaza esa linea por:" -ForegroundColor Yellow
        Write-Host "DATABASE_URL=$connectionUrl"
    }
    else {
        [System.IO.File]::WriteAllText($envLocal, $current.TrimEnd() + "`n`n" + $block)
        Write-Host ""
        Write-Host "Se agrego la conexion local a $envLocal" -ForegroundColor Green
    }
}
else {
    [System.IO.File]::WriteAllText($envLocal, $block)
    Write-Host ""
    Write-Host "Se creo $envLocal con la conexion local." -ForegroundColor Green
}

Write-Host ""
Write-Host "Verificando la conexion con la app..." -ForegroundColor Cyan
Push-Location $backendRoot
try {
    & npm.cmd run db:check
    $checkExitCode = $LASTEXITCODE
}
finally {
    Pop-Location
}

if ($checkExitCode -ne 0) {
    Write-Host ""
    Write-Host "La base se creo, pero la verificacion fallo. Revisa el error de arriba." -ForegroundColor Red
    exit $checkExitCode
}

Write-Host ""
Write-Host "Listo. Ahora podes ejecutar: npm run dev" -ForegroundColor Green
