# MySpaceER Notification Test Script
# This will test notifications with YOUR contact information

Write-Host "🚨 MySpaceER Notification System Test" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Test patient data - UPDATE THESE WITH YOUR REAL CONTACT INFO
$patientData = @{
    name = "Test Patient for Notifications"
    gender = "male"
    age_range = "26-35"
    trn = "123456789999"
    incident_type = "chest_pain"
    incident_description = "Testing real-time notification system"
    patient_status = "conscious"
    transportation_mode = "ambulance"
    contact_email = "your.email@gmail.com"      # ← CHANGE THIS TO YOUR EMAIL
    contact_phone = "+1-876-555-1234"           # ← CHANGE THIS TO YOUR PHONE
    latitude = 18.0179
    longitude = -76.8099
    location_address = "Test Location, Kingston"
} | ConvertTo-Json

Write-Host "📧 Notifications will be sent to: your.email@gmail.com" -ForegroundColor Yellow
Write-Host "📱 SMS will be sent to: +1-876-555-1234" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  UPDATE THE CONTACT INFO ABOVE WITH YOUR REAL EMAIL AND PHONE!" -ForegroundColor Red
Write-Host ""

# Test 1: Check server health
Write-Host "🏥 Checking server health..." -ForegroundColor Green
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method GET
    Write-Host "✅ Server is running and healthy" -ForegroundColor Green
} catch {
    Write-Host "❌ Server is not responding. Please start the server first." -ForegroundColor Red
    Write-Host "Run: cd server && node server-enhanced.js" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test 2: Submit patient report
Write-Host "📝 Submitting patient report..." -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/reports" -Method POST -Body $patientData -ContentType "application/json"
    $reportId = $response.report_id
    Write-Host "✅ Patient report created: $reportId" -ForegroundColor Green
    Write-Host "📧📱 Initial notifications should be sent within 10-15 seconds" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Failed to create patient report: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Wait for processing
Write-Host "⏱️  Waiting for processing and notifications (15 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Test 3: Check report status
Write-Host "📋 Checking report status..." -ForegroundColor Green
try {
    $report = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$reportId" -Method GET
    Write-Host "✅ Report Status: $($report.data.status)" -ForegroundColor Green
    Write-Host "🏥 Hospital: $($report.data.hospital_name)" -ForegroundColor Green
    Write-Host "👨‍⚕️ Doctor: $($report.data.assigned_doctor_name)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not retrieve report status" -ForegroundColor Yellow
}

Write-Host ""

# Test 4: Test status updates (additional notifications)
Write-Host "📋 Testing status update notifications..." -ForegroundColor Green

$statusUpdates = @(
    @{ status = "Arrived"; description = "Patient arrival at hospital" },
    @{ status = "InTreatment"; description = "Treatment started" }
)

foreach ($update in $statusUpdates) {
    Write-Host ""
    Write-Host "🔄 Updating status to: $($update.status)" -ForegroundColor Cyan
    
    $statusData = @{
        status = $update.status
        user_id = "test_doctor"
        user_role = "doctor"
    } | ConvertTo-Json
    
    try {
        $statusResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$reportId/status" -Method PATCH -Body $statusData -ContentType "application/json"
        Write-Host "✅ Status updated: $($update.description)" -ForegroundColor Green
        Write-Host "📧📱 Additional notification should be sent" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Failed to update status: $_" -ForegroundColor Red
    }
    
    Start-Sleep -Seconds 3
}

Write-Host ""

# Cleanup
Write-Host "🧹 Cleanup: Removing test patient..." -ForegroundColor Yellow
$deleteData = @{
    user_id = "test_doctor"
    user_role = "doctor"
} | ConvertTo-Json

try {
    $deleteResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$reportId" -Method DELETE -Body $deleteData -ContentType "application/json"
    Write-Host "✅ Test patient removed successfully" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not remove test patient (manual cleanup may be needed)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Notification Test Completed!" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Expected Results (Console Mode):" -ForegroundColor White
Write-Host "   • Check the server console for notification messages" -ForegroundColor Gray
Write-Host "   • Look for messages like:" -ForegroundColor Gray
Write-Host "     📱 SMS to your-phone: [message]" -ForegroundColor Gray
Write-Host "     📧 Email to your-email: [message]" -ForegroundColor Gray
Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor White
Write-Host "   1. Update contact info in this script with YOUR real email/phone" -ForegroundColor Gray
Write-Host "   2. Configure real Twilio/SMTP providers in server\.env" -ForegroundColor Gray
Write-Host "   3. Set SMS_PROVIDER=twilio and EMAIL_PROVIDER=smtp" -ForegroundColor Gray
Write-Host "   4. Restart server and run this test again" -ForegroundColor Gray