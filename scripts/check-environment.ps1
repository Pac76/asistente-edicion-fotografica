$ErrorActionPreference = "Stop"

$workspace = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $workspace

$nodeVersion = (& node --version)
$npmVersion = (& npm --version)
$gitVersion = (& git --version)

$uvCommand = Get-Command uv -ErrorAction SilentlyContinue
if (-not $uvCommand) {
    $uvCommand = Get-ChildItem `
        -LiteralPath "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" `
        -Recurse `
        -Filter "uv.exe" `
        -ErrorAction SilentlyContinue |
        Select-Object -First 1
}

if (-not $uvCommand) {
    throw "No se encontró uv. Instalalo con: winget install --id astral-sh.uv --exact"
}

$uvPath = if ($uvCommand.Source) { $uvCommand.Source } else { $uvCommand.FullName }
$uvVersion = (& $uvPath --version)

[pscustomobject]@{
    Node = $nodeVersion
    Npm = $npmVersion
    Git = $gitVersion
    Uv = $uvVersion
    UvPath = $uvPath
} | Format-List

& $uvPath run --directory engine python -m foto_engine.environment
if ($LASTEXITCODE -ne 0) {
    throw "Falló el diagnóstico del entorno Python."
}

npm test
if ($LASTEXITCODE -ne 0) {
    throw "Fallaron las pruebas de la aplicación."
}

& $uvPath run pytest
if ($LASTEXITCODE -ne 0) {
    throw "Fallaron las pruebas del motor."
}

& $uvPath run ruff check engine engine-tests
if ($LASTEXITCODE -ne 0) {
    throw "Fallaron los controles estáticos del motor."
}
