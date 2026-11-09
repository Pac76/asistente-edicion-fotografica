$ErrorActionPreference = "Stop"

$version = "13.59"
$expectedHash = "44b512b25af500724ba579d0a53c8fc5851628b692dd5e5d94ae4a15c2cba9ec"
$workspace = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $workspace "tools\exiftool"
$existing = Get-ChildItem `
    -LiteralPath $destination `
    -Recurse `
    -Filter "exiftool.exe" `
    -ErrorAction SilentlyContinue |
    Select-Object -First 1

if ($existing) {
    Write-Host "ExifTool ya está disponible en $($existing.FullName)"
    $env:PERL_BADLANG = "0"
    & $existing.FullName -ver
    exit $LASTEXITCODE
}

$temporaryDirectory = New-Item `
    -ItemType Directory `
    -Path (Join-Path $env:TEMP ("foto-exiftool-" + [guid]::NewGuid().ToString("N")))
$archive = Join-Path $temporaryDirectory.FullName "exiftool-$($version)_64.zip"
$url = "https://downloads.sourceforge.net/project/exiftool/exiftool-$($version)_64.zip?download=1"

curl.exe -L --fail --show-error --output $archive $url
if ($LASTEXITCODE -ne 0) {
    throw "Falló la descarga oficial de ExifTool."
}

$actualHash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualHash -ne $expectedHash) {
    throw "El hash descargado no coincide con el publicado: $actualHash"
}

New-Item -ItemType Directory -Path $destination -Force | Out-Null
Expand-Archive -LiteralPath $archive -DestinationPath $destination
$executable = Get-ChildItem `
    -LiteralPath $destination `
    -Recurse `
    -Filter "exiftool(-k).exe" |
    Select-Object -First 1
Rename-Item -LiteralPath $executable.FullName -NewName "exiftool.exe"

$installed = Join-Path $executable.DirectoryName "exiftool.exe"
Write-Host "ExifTool instalado y verificado en $installed"
$env:PERL_BADLANG = "0"
& $installed -ver
