# Quick Twilio Setup for MySpaceER
Clear-Host
Write-Host "🚀 MySpaceER Quick SMS Setup" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

Write-Host "I need your Twilio credentials to enable real SMS notifications." -ForegroundColor Yellow
Write-Host ""
Write-Host "Go to https://console.twilio.com/ and find:" -ForegroundColor Green
Write-Host "1. Account SID (starts with 'AC' - in Account Info box)" -ForegroundColor White
Write-Host "2. Auth Token (32 characters - click eye icon to reveal)" -ForegroundColor White  
Write-Host "3. Your Twilio phone number (from Phone Numbers section)" -ForegroundColor White
Write-Host "4. Your personal phone number (the one you verified)" -ForegroundColor White
Write-Host ""

# Get Account SID with validation
do {
    $accountSid = Read-Host "Enter your Account SID (must start with AC)"
    if ($accountSid -and $accountSid.StartsWith("AC") -and $accountSid.Length -eq 34) {
        Write-Host "✅ Valid Account SID" -ForegroundColor Green
        break
    } else {
        Write-Host "❌ Invalid. Account SID must start with 'AC' and be 34 characters total" -ForegroundColor Red
    }
} while ($true)

# Get Auth Token
do {
    $authToken = Read-Host "Enter your Auth Token (32 characters)" -MaskInput
    if ($authToken -and $authToken.Length -eq 32) {
        Write-Host "✅ Valid Auth Token" -ForegroundColor Green
        break
    } else {
        Write-Host "❌ Invalid. Auth Token must be 32 characters" -ForegroundColor Red
    }
} while ($true)

# Get Twilio Phone Number
do {
    $twilioPhone = Read-Host "Enter your Twilio phone number (format: +15551234567)"
    if ($twilioPhone -and $twilioPhone.StartsWith("+") -and $twilioPhone.Length -ge 10) {
        Write-Host "✅ Valid Twilio phone number" -ForegroundColor Green
        break
    } else {
        Write-Host "❌ Invalid. Must start with + and include country code" -ForegroundColor Red
    }
} while ($true)

# Get User Phone Number
do {
    $userPhone = Read-Host "Enter YOUR phone number (where SMS will be sent, format: +1876xxxxxxx)"
    if ($userPhone -and $userPhone.StartsWith("+") -and $userPhone.Length -ge 10) {
        Write-Host "✅ Valid phone number" -ForegroundColor Green
        break
    } else {
        Write-Host "❌ Invalid. Must start with + and include country code" -ForegroundColor Red
    }
} while ($true)

Write-Host ""
Write-Host "Configuration Summary:" -ForegroundColor Cyan
Write-Host "  Account SID: $accountSid" -ForegroundColor White
Write-Host "  Auth Token: $('*' * 32)" -ForegroundColor White
Write-Host "  Twilio Phone: $twilioPhone" -ForegroundColor White
Write-Host "  Your Phone: $userPhone" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Apply this configuration? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Setup cancelled" -ForegroundColor Yellow
    exit 0
}

# Update .env file
Write-Host ""
Write-Host "Updating configuration files..." -ForegroundColor Yellow

$envFile = "server\.env"
$content = Get-Content $envFile

$newContent = $content | ForEach-Object {
    if ($_ -match "^SMS_PROVIDER=") { "SMS_PROVIDER=twilio" }
    elseif ($_ -match "^TWILIO_ACCOUNT_SID=") { "TWILIO_ACCOUNT_SID=$accountSid" }
    elseif ($_ -match "^TWILIO_AUTH_TOKEN=") { "TWILIO_AUTH_TOKEN=$authToken" }
    elseif ($_ -match "^TWILIO_PHONE_NUMBER=") { "TWILIO_PHONE_NUMBER=$twilioPhone" }
    else { $_ }
}

$newContent | Set-Content $envFile
Write-Host "✅ Updated $envFile" -ForegroundColor Green

# Update test script
$testFile = "test-your-phone.ps1"
if (Test-Path $testFile) {
    $testContent = Get-Content $testFile
    $newTestContent = $testContent | ForEach-Object {
        if ($_ -match '^\$yourPhone = ') { "`$yourPhone = `"$userPhone`"" }
        else { $_ }
    }
    $newTestContent | Set-Content $testFile
    Write-Host "✅ Updated $testFile" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 CONFIGURATION COMPLETE!" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart server with Twilio enabled" -ForegroundColor White
Write-Host "2. Run SMS test to your phone" -ForegroundColor White
Write-Host ""

# Stop current server
Write-Host "Stopping current server..." -ForegroundColor Yellow
try {
    Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
    Write-Host "✅ Server stopped" -ForegroundColor Green
} catch {
    Write-Host "⚠️ No server processes found" -ForegroundColor Gray
}

Start-Sleep -Seconds 2

# Start server with Twilio
Write-Host "Starting server with Twilio SMS enabled..." -ForegroundColor Yellow
Start-Process -FilePath "node" -ArgumentList "server\server-enhanced.js" -WorkingDirectory "." -WindowStyle Hidden
Write-Host "✅ Server started with SMS enabled" -ForegroundColor Green

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "🚀 Ready to test SMS notifications!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run this command to send SMS to your phone:" -ForegroundColor Yellow
Write-Host "PowerShell -ExecutionPolicy Bypass -File .\test-your-phone.ps1" -ForegroundColor Green
Write-Host ""
Write-Host "📱 You should receive real SMS messages on: $userPhone" -ForegroundColor Magenta