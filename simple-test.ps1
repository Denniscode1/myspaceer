# MySpaceER Notification Test Script
Write-Host "MySpaceER Notification System Test" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Test patient data
$patientData = @{
    name = "Test Patient for Notifications"
    gender = "male"
    age_range = "26-35"
    incident_type = "chest_pain"
    incident_description = "Testing notification system"
    patient_status = "conscious"
    transportation_mode = "ambulance"
    contact_email = "test@example.com"
    contact_phone = "+1-876-555-1234"
    latitude = 18.0179
    longitude = -76.8099
} | ConvertTo-Json

Write-Host "Checking server health..." -ForegroundColor Green
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method GET
    Write-Host "Server is running" -ForegroundColor Green
} catch {
    Write-Host "Server is not responding" -ForegroundColor Red
    exit 1
}

Write-Host "Submitting patient report..." -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/reports" -Method POST -Body $patientData -ContentType "application/json"
    $reportId = $response.report_id
    Write-Host "Patient report created: $reportId" -ForegroundColor Green
} catch {
    Write-Host "Failed to create patient report" -ForegroundColor Red
    exit 1
}

Write-Host "Waiting for processing (15 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host "Checking report status..." -ForegroundColor Green
try {
    $report = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$reportId" -Method GET
    Write-Host "Status: $($report.data.status)" -ForegroundColor Green
    Write-Host "Hospital: $($report.data.hospital_name)" -ForegroundColor Green
} catch {
    Write-Host "Could not retrieve report status" -ForegroundColor Yellow
}

Write-Host "Testing status updates..." -ForegroundColor Green
$statusData = @{
    status = "Arrived"
    user_id = "test_doctor"
    user_role = "doctor"
} | ConvertTo-Json

try {
    $statusResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$reportId/status" -Method PATCH -Body $statusData -ContentType "application/json"
    Write-Host "Status updated to Arrived" -ForegroundColor Green
} catch {
    Write-Host "Failed to update status" -ForegroundColor Red
}

Start-Sleep -Seconds 3

# Update to InTreatment
$statusData2 = @{
    status = "InTreatment"
    user_id = "test_doctor"
    user_role = "doctor"
} | ConvertTo-Json

try {
    $statusResponse2 = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$reportId/status" -Method PATCH -Body $statusData2 -ContentType "application/json"
    Write-Host "Status updated to InTreatment" -ForegroundColor Green
} catch {
    Write-Host "Failed to update status" -ForegroundColor Red
}

Write-Host "Cleaning up..." -ForegroundColor Yellow
$deleteData = @{
    user_id = "test_doctor"
    user_role = "doctor"
} | ConvertTo-Json

try {
    $deleteResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$reportId" -Method DELETE -Body $deleteData -ContentType "application/json"
    Write-Host "Test patient removed" -ForegroundColor Green
} catch {
    Write-Host "Could not remove test patient" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Notification Test Completed!" -ForegroundColor Cyan
Write-Host ""
Write-Host "CHECK THE SERVER CONSOLE FOR NOTIFICATION MESSAGES!" -ForegroundColor Yellow
Write-Host "Look for messages like:" -ForegroundColor Gray
Write-Host "  SMS to +1-876-555-1234: [message]" -ForegroundColor Gray
Write-Host "  Email to test@example.com: [message]" -ForegroundColor Gray