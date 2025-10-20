# MySpaceER Real Phone Notification Test
Write-Host "Testing Real Phone Notifications" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# IMPORTANT: Update this with YOUR real contact information
$yourEmail = "your.email@gmail.com"        # <- CHANGE THIS TO YOUR EMAIL
$yourPhone = "+18764740111"

Write-Host "BEFORE RUNNING: Update the contact info above!" -ForegroundColor Red
Write-Host "Email: $yourEmail" -ForegroundColor Yellow
Write-Host "Phone: $yourPhone" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Enter to continue or Ctrl+C to cancel..."
Read-Host

# Test patient data with YOUR contact info
$patientData = @{
    name = "Rhanaldi Test Patient"
    gender = "male"
    age_range = "26-35"
    trn = "999888777666"
    incident_type = "chest_pain"
    incident_description = "Testing real phone notifications for Rhanaldi"
    patient_status = "conscious"
    transportation_mode = "ambulance"
    contact_email = $yourEmail
    contact_phone = $yourPhone
    latitude = 18.0179
    longitude = -76.8099
    location_address = "Kingston, Jamaica"
} | ConvertTo-Json

Write-Host "Creating patient with YOUR contact info..." -ForegroundColor Green
Write-Host "Email: $yourEmail" -ForegroundColor Cyan
Write-Host "Phone: $yourPhone" -ForegroundColor Cyan
Write-Host ""

# Check server health
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method GET
    Write-Host "Server is running" -ForegroundColor Green
} catch {
    Write-Host "Server is not responding!" -ForegroundColor Red
    Write-Host "Please start the server: cd server && node server-enhanced.js" -ForegroundColor Yellow
    exit 1
}

# Submit patient report
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/reports" -Method POST -Body $patientData -ContentType "application/json"
    $reportId = $response.report_id
    Write-Host "SUCCESS: Patient created with Report ID: $reportId" -ForegroundColor Green
    Write-Host ""
    Write-Host "NOTIFICATIONS SHOULD BE SENT TO:" -ForegroundColor Yellow
    Write-Host "  SMS: $yourPhone" -ForegroundColor Cyan
    Write-Host "  Email: $yourEmail" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to create patient: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Waiting for processing and initial notifications (15 seconds)..." -ForegroundColor Yellow
Write-Host "Check your phone for SMS!" -ForegroundColor Magenta
Start-Sleep -Seconds 15

# Check what happened
Write-Host "Checking patient status..." -ForegroundColor Green
try {
    $report = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$reportId" -Method GET
    $patient = $report.data
    
    Write-Host "PATIENT STATUS UPDATE:" -ForegroundColor Cyan
    Write-Host "  Status: $($patient.status)" -ForegroundColor White
    Write-Host "  Hospital: $($patient.hospital_name)" -ForegroundColor White
    Write-Host "  Queue Position: $($patient.queue_position)" -ForegroundColor White
    Write-Host "  Doctor: $($patient.assigned_doctor_name)" -ForegroundColor White
} catch {
    Write-Host "Could not retrieve patient status" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Now testing status update notifications..." -ForegroundColor Green
Write-Host "This will trigger additional SMS to your phone!" -ForegroundColor Magenta

# Update status to "Arrived" (will trigger notification)
Write-Host ""
Write-Host "Updating status to 'Arrived'..." -ForegroundColor Cyan
$arrivedData = @{
    status = "Arrived"
    user_id = "Dr.Smith"
    user_role = "doctor"
} | ConvertTo-Json

try {
    $arrivedResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$reportId/status" -Method PATCH -Body $arrivedData -ContentType "application/json"
    Write-Host "Status updated to 'Arrived'" -ForegroundColor Green
    Write-Host "SMS notification sent to: $yourPhone" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to update to Arrived status" -ForegroundColor Red
}

Start-Sleep -Seconds 5

# Update status to "InTreatment" (will trigger another notification)
Write-Host ""
Write-Host "Updating status to 'InTreatment'..." -ForegroundColor Cyan
$treatmentData = @{
    status = "InTreatment"
    user_id = "Dr.Smith"
    user_role = "doctor"
} | ConvertTo-Json

try {
    $treatmentResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$reportId/status" -Method PATCH -Body $treatmentData -ContentType "application/json"
    Write-Host "Status updated to 'InTreatment'" -ForegroundColor Green
    Write-Host "SMS notification sent to: $yourPhone" -ForegroundColor Cyan
} catch {
    Write-Host "Failed to update to InTreatment status" -ForegroundColor Red
}

Write-Host ""
Write-Host "TEST COMPLETED!" -ForegroundColor Green
Write-Host "===============" -ForegroundColor Green
Write-Host ""
Write-Host "EXPECTED NOTIFICATIONS TO YOUR PHONE:" -ForegroundColor Yellow
Write-Host "1. Initial queue position notification" -ForegroundColor White
Write-Host "2. Patient arrived at hospital notification" -ForegroundColor White
Write-Host "3. Treatment started notification" -ForegroundColor White
Write-Host ""
Write-Host "CHECK YOUR PHONE FOR SMS MESSAGES!" -ForegroundColor Magenta
Write-Host ""
Write-Host "Note: Currently in console mode - check server console for actual messages" -ForegroundColor Gray
Write-Host "To get real SMS: Configure Twilio in server/.env file" -ForegroundColor Gray
Write-Host ""

# Keep the patient in system so you can see in dashboard
Write-Host "Patient kept in system for dashboard viewing" -ForegroundColor Yellow
Write-Host "Report ID: $reportId" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now:" -ForegroundColor White
Write-Host "1. Open the web dashboard to see this patient" -ForegroundColor Gray
Write-Host "2. View the patient details and status updates" -ForegroundColor Gray
Write-Host "3. Check server console for notification messages" -ForegroundColor Gray
