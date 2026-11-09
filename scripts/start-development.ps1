$ErrorActionPreference = "Stop"

$workspace = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $workspace

Write-Host "Iniciando el asistente local..."
Write-Host "Abrí http://127.0.0.1:4173 en el navegador."
npm run ui
