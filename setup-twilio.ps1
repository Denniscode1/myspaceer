# Twilio Configuration Script for MySpaceER
Write-Host "🚨 MySpaceER Twilio Configuration" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This script will help you configure Twilio for real SMS notifications" -ForegroundColor Yellow
Write-Host ""

# Check if .env file exists
$envFile = "server\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "Expected location: $envFile" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found .env file: $envFile" -ForegroundColor Green
Write-Host ""

# Get Twilio credentials from user
Write-Host "Please enter your Twilio credentials:" -ForegroundColor Yellow
Write-Host "(Get these from your Twilio Console Dashboard)" -ForegroundColor Gray
Write-Host ""

# Account SID
Write-Host "1. Account SID (starts with AC...):" -ForegroundColor Cyan
$accountSid = Read-Host "   Enter Account SID"
if ($accountSid -eq "" -or -not $accountSid.StartsWith("AC")) {
    Write-Host "ERROR: Account SID should start with 'AC'" -ForegroundColor Red
    exit 1
}

# Auth Token
Write-Host ""
Write-Host "2. Auth Token (32-character string):" -ForegroundColor Cyan
$authToken = Read-Host "   Enter Auth Token" -MaskInput
if ($authToken -eq "" -or $authToken.Length -ne 32) {
    Write-Host "WARNING: Auth Token should be 32 characters" -ForegroundColor Yellow
}

# Phone Number
Write-Host ""
Write-Host "3. Twilio Phone Number (format: +1234567890):" -ForegroundColor Cyan
$phoneNumber = Read-Host "   Enter Twilio Phone Number"
if ($phoneNumber -eq "" -or -not $phoneNumber.StartsWith("+")) {
    Write-Host "ERROR: Phone number should start with + and country code" -ForegroundColor Red
    exit 1
}

# Your verified phone number
Write-Host ""
Write-Host "4. Your Phone Number (must be verified in Twilio):" -ForegroundColor Cyan
$yourPhone = Read-Host "   Enter YOUR phone number (format: +1876xxxxxxx)"
if ($yourPhone -eq "" -or -not $yourPhone.StartsWith("+")) {
    Write-Host "ERROR: Your phone number should start with + and country code" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Configuration Summary:" -ForegroundColor Green
Write-Host "  Account SID: $accountSid" -ForegroundColor White
Write-Host "  Auth Token: $('*' * $authToken.Length)" -ForegroundColor White
Write-Host "  Twilio Phone: $phoneNumber" -ForegroundColor White
Write-Host "  Your Phone: $yourPhone" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Is this correct? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Configuration cancelled" -ForegroundColor Yellow
    exit 0
}

# Read current .env file
Write-Host ""
Write-Host "Updating .env file..." -ForegroundColor Yellow
$envContent = Get-Content $envFile

# Update the configuration
$updatedContent = @()
foreach ($line in $envContent) {
    if ($line -match "^SMS_PROVIDER=") {
        $updatedContent += "SMS_PROVIDER=twilio"
    }
    elseif ($line -match "^TWILIO_ACCOUNT_SID=") {
        $updatedContent += "TWILIO_ACCOUNT_SID=$accountSid"
    }
    elseif ($line -match "^TWILIO_AUTH_TOKEN=") {
        $updatedContent += "TWILIO_AUTH_TOKEN=$authToken"
    }
    elseif ($line -match "^TWILIO_PHONE_NUMBER=") {
        $updatedContent += "TWILIO_PHONE_NUMBER=$phoneNumber"
    }
    else {
        $updatedContent += $line
    }
}

# Write updated content back to file
$updatedContent | Set-Content $envFile

Write-Host "✅ .env file updated successfully!" -ForegroundColor Green
Write-Host ""

# Update the test script with user's phone number
Write-Host "Updating test script with your phone number..." -ForegroundColor Yellow
$testFile = "test-your-phone.ps1"
if (Test-Path $testFile) {
    $testContent = Get-Content $testFile
    $updatedTestContent = @()
    
    foreach ($line in $testContent) {
        if ($line -match '^\$yourPhone = ') {
            $updatedTestContent += "`$yourPhone = `"$yourPhone`""
        }
        else {
            $updatedTestContent += $line
        }
    }
    
    $updatedTestContent | Set-Content $testFile
    Write-Host "✅ Test script updated with your phone number!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Test script not found - you'll need to update it manually" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 TWILIO CONFIGURATION COMPLETE!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart the server to load new Twilio configuration" -ForegroundColor White
Write-Host "2. Run the test script to send real SMS to your phone" -ForegroundColor White
Write-Host "3. Check your phone for actual SMS messages!" -ForegroundColor White
Write-Host ""
Write-Host "Commands to run next:" -ForegroundColor Cyan
Write-Host "  # Stop current server (find process and kill)" -ForegroundColor Gray
Write-Host "  Get-Process node | Stop-Process -Force" -ForegroundColor White
Write-Host "  # Start server with Twilio config" -ForegroundColor Gray
Write-Host "  Start-Process -FilePath 'node' -ArgumentList 'server\server-enhanced.js' -WorkingDirectory '.' -WindowStyle Hidden" -ForegroundColor White
Write-Host "  # Run SMS test" -ForegroundColor Gray
Write-Host "  PowerShell -ExecutionPolicy Bypass -File .\test-your-phone.ps1" -ForegroundColor White
Write-Host ""
Write-Host "🚨 IMPORTANT: Make sure your phone number is verified in your Twilio trial account!" -ForegroundColor Red