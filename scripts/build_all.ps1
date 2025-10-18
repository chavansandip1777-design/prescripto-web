# Build script for Windows PowerShell
# Usage: run from repository root
# .\scripts\build_all.ps1

Write-Host "Building frontend..."
Push-Location frontend
npm ci
npm run build
Pop-Location

Write-Host "Building admin..."
Push-Location admin
npm ci
npm run build
Pop-Location

Write-Host "Installing backend dependencies (optional)"
Push-Location backend
npm ci
Pop-Location

Write-Host "Build complete. You can now run the backend with: node backend/server.js"