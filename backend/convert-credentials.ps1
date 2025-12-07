# Convert Google Calendar Credentials to Base64 for Render
# Run this script from the backend directory

Write-Host "=== Google Calendar Credentials Converter ===" -ForegroundColor Cyan
Write-Host ""

$credFile = "google-calendar-credentials.json"

# Check if file exists
if (-not (Test-Path $credFile)) {
    Write-Host "ERROR: File not found: $credFile" -ForegroundColor Red
    Write-Host "Make sure you're in the backend directory and the credentials file exists." -ForegroundColor Yellow
    exit 1
}

Write-Host "Found credentials file: $credFile" -ForegroundColor Green
Write-Host "Converting to base64..." -ForegroundColor Yellow
Write-Host ""

try {
    # Read and encode to base64
    $bytes = [System.IO.File]::ReadAllBytes($credFile)
    $base64 = [Convert]::ToBase64String($bytes)
    
    # Copy to clipboard
    $base64 | Set-Clipboard
    
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "The base64 encoded credentials have been copied to your clipboard!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Go to Render Dashboard: https://dashboard.render.com/" -ForegroundColor White
    Write-Host "2. Select your Backend service" -ForegroundColor White
    Write-Host "3. Go to Environment → Add Environment Variable" -ForegroundColor White
    Write-Host "4. Add this variable:" -ForegroundColor White
    Write-Host "   Key:   GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_BASE64" -ForegroundColor Cyan
    Write-Host "   Value: [Press Ctrl+V to paste from clipboard]" -ForegroundColor Cyan
    Write-Host "5. Add another variable:" -ForegroundColor White
    Write-Host "   Key:   GOOGLE_CALENDAR_ID" -ForegroundColor Cyan
    Write-Host "   Value: [Your calendar ID]" -ForegroundColor Cyan
    Write-Host "6. Click 'Save Changes'" -ForegroundColor White
    Write-Host ""
    Write-Host "Preview (first 100 characters):" -ForegroundColor Yellow
    Write-Host $base64.Substring(0, [Math]::Min(100, $base64.Length)) -ForegroundColor Gray
    Write-Host "... (total length: $($base64.Length) characters)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Press any key to exit..." -ForegroundColor White
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    
}
catch {
    Write-Host "❌ ERROR: Failed to convert file" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
