# Balanga Kalinga - Create a downloadable ZIP of the project source
# Run this to package the code (without node_modules / build outputs) so you
# can download it and open it in VS Code anywhere.
#
# Usage (PowerShell):
#   .\download-project.ps1
#
# Output: balanga-kalinga-source.zip in the current folder.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$zip  = Join-Path $root 'balanga-kalinga-source.zip'
$stage = Join-Path $env:TEMP 'balanga-kalinga-export'

Write-Host "Packaging project source from: $root" -ForegroundColor Cyan

# Clean previous export
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path $stage | Out-Null

# Use robocopy to copy each subfolder but EXCLUDE heavy/generated dirs (fast)
$excludeDirs = 'node_modules', 'dist', 'data', 'bin', 'obj'

foreach ($folder in @('server', 'client')) {
  $src = Join-Path $root $folder
  if (Test-Path $src) {
    robocopy $src (Join-Path $stage $folder) /E /XD $excludeDirs /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
  }
}

# Copy root-level files (package.json, etc.)
Get-ChildItem -Path $root -File | ForEach-Object {
  Copy-Item $_.FullName (Join-Path $stage $_.Name) -Force
}

if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -CompressionLevel Optimal

# Clean up staging
Remove-Item $stage -Recurse -Force

Write-Host "Done! Downloadable file created:" -ForegroundColor Green
Write-Host "  $zip" -ForegroundColor Yellow
Write-Host ""
Write-Host "To open it in VS Code:" -ForegroundColor Cyan
Write-Host "  1. Extract the ZIP to a folder on your machine."
Write-Host "  2. Open VS Code and run:  File > Open Folder... then select that folder."
Write-Host "  (or in a terminal:  code <folder-path>)"