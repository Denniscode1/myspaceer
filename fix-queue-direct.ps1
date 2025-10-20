# Direct Queue Management Fix
Write-Host "Direct Queue Management Test" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

# Create a complete patient that will work properly
$patientData = @{
    name = "Direct Queue Patient"
    gender = "female"
    age_range = "36-45"
    trn = "876543210999" 
    incident_type = "broken_bone"
    incident_description = "Testing direct queue addition - broken arm"
    patient_status = "conscious"
    transportation_mode = "private_car"
    contact_email = "queue@example.com"
    contact_phone = "+18764740111"
    latitude = 18.0179
    longitude = -76.8099
    location_address = "Kingston, Jamaica"
} | ConvertTo-Json

Write-Host "Step 1: Creating patient..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/reports" -Method POST -Body $patientData -ContentType "application/json"
    $reportId = $response.report_id
    Write-Host "✅ Patient created: $reportId" -ForegroundColor Green
    
    # Step 2: Get hospitals
    Write-Host "Step 2: Getting hospital information..." -ForegroundColor Yellow
    $hospitals = Invoke-RestMethod -Uri "http://localhost:3001/api/hospitals" -Method GET
    $hospital = $hospitals.data[0]  # Use first hospital
    
    Write-Host "✅ Using hospital: $($hospital.name) ($($hospital.hospital_id))" -ForegroundColor Green
    
    # Step 3: Try to manually trigger queue processing
    Write-Host "Step 3: Processing status updates..." -ForegroundColor Yellow
    
    # Update to Processing first
    $processingUpdate = @{
        status = "Processing"
        user_id = "system"
        user_role = "system"
    } | ConvertTo-Json
    
    $processingResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$reportId/status" -Method PATCH -Body $processingUpdate -ContentType "application/json"
    Write-Host "✅ Status: Processing" -ForegroundColor Green
    Start-Sleep -Seconds 1
    
    # Update to TriageComplete
    $triageUpdate = @{
        status = "TriageComplete"
        user_id = "system" 
        user_role = "system"
    } | ConvertTo-Json
    
    $triageResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$reportId/status" -Method PATCH -Body $triageUpdate -ContentType "application/json"
    Write-Host "✅ Status: TriageComplete" -ForegroundColor Green
    Start-Sleep -Seconds 1
    
    # Update to Assigned
    $assignedUpdate = @{
        status = "Assigned"
        user_id = "system"
        user_role = "system"
    } | ConvertTo-Json
    
    $assignedResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$reportId/status" -Method PATCH -Body $assignedUpdate -ContentType "application/json"
    Write-Host "✅ Status: Assigned" -ForegroundColor Green
    Start-Sleep -Seconds 1
    
    # Update to Arrived (should trigger queue addition)
    $arrivedUpdate = @{
        status = "Arrived"
        user_id = "Dr.Johnson"
        user_role = "doctor"
    } | ConvertTo-Json
    
    $arrivedResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$reportId/status" -Method PATCH -Body $arrivedUpdate -ContentType "application/json"
    Write-Host "✅ Status: Arrived - Should trigger queue addition!" -ForegroundColor Green
    
    # Step 4: Check if patient is in queue now
    Write-Host ""
    Write-Host "Step 4: Checking queues after status updates..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    
    foreach ($hosp in $hospitals.data) {
        try {
            $queueResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/queue/$($hosp.hospital_id)" -Method GET
            $queueCount = if ($queueResponse.data.queue_items) { $queueResponse.data.queue_items.Count } else { 0 }
            
            Write-Host "  $($hosp.name): $queueCount patients" -ForegroundColor Cyan
            
            if ($queueCount -gt 0) {
                foreach ($patient in $queueResponse.data.queue_items) {
                    $status = if ($patient.queue_status) { $patient.queue_status } else { "unknown" }
                    Write-Host "    - $($patient.name) (Position: $($patient.queue_position), Status: $status)" -ForegroundColor White
                }
            }
        } catch {
            Write-Host "  $($hosp.name): Error checking queue - $_" -ForegroundColor Red
        }
    }
    
    # Step 5: Check final patient status
    Write-Host ""
    Write-Host "Step 5: Final patient status check..." -ForegroundColor Yellow
    $finalReport = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$reportId" -Method GET
    
    Write-Host "PATIENT STATUS:" -ForegroundColor Green
    Write-Host "  Name: $($finalReport.data.name)" -ForegroundColor White
    Write-Host "  Status: $($finalReport.data.status)" -ForegroundColor White
    Write-Host "  Hospital: $($finalReport.data.hospital_name)" -ForegroundColor White
    Write-Host "  Queue Position: $($finalReport.data.queue_position)" -ForegroundColor White
    Write-Host "  Report ID: $($finalReport.data.report_id)" -ForegroundColor Gray
    
    # Step 6: Test notification (should work now)
    Write-Host ""
    Write-Host "Step 6: Testing SMS notification..." -ForegroundColor Yellow
    
    $treatmentUpdate = @{
        status = "InTreatment"
        user_id = "Dr.Johnson"
        user_role = "doctor"
    } | ConvertTo-Json
    
    try {
        $treatmentResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$reportId/status" -Method PATCH -Body $treatmentUpdate -ContentType "application/json"
        Write-Host "✅ Status updated to InTreatment - SMS should be sent!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to update to InTreatment: $_" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 SUMMARY:" -ForegroundColor Cyan
Write-Host "- If you see patients listed above, the queue is working!" -ForegroundColor Green
Write-Host "- Check your phone (+18764740111) for SMS notifications!" -ForegroundColor Magenta
Write-Host "- Open http://localhost:3000 to view the dashboard" -ForegroundColor Yellow