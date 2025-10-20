# Add Patients to Hospital Queue
Write-Host "Adding Patients to Hospital Queue" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Create a new patient specifically for the queue demonstration
$queuePatient = @{
    name = "Hospital Queue Patient"
    gender = "male"
    age_range = "26-35"
    trn = "111222333444"
    incident_type = "chest_pain"
    incident_description = "Emergency chest pain - needs immediate attention"
    patient_status = "conscious"
    transportation_mode = "ambulance" 
    contact_email = "queue.patient@example.com"
    contact_phone = "+18764740111"
    latitude = 18.0179
    longitude = -76.8099
    location_address = "Kingston, Jamaica"
} | ConvertTo-Json

Write-Host "Creating patient for queue..." -ForegroundColor Yellow

try {
    # Create patient
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/reports" -Method POST -Body $queuePatient -ContentType "application/json"
    $reportId = $response.report_id
    Write-Host "Patient created: $reportId" -ForegroundColor Green
    
    # Wait for initial processing
    Start-Sleep -Seconds 3
    
    # Update status to Assigned
    Write-Host "Setting status to Assigned..." -ForegroundColor Yellow
    $assignedData = @{
        status = "Assigned"
        user_id = "Dr.Queue"
        user_role = "doctor"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$reportId/status" -Method PATCH -Body $assignedData -ContentType "application/json"
    Write-Host "Status: Assigned" -ForegroundColor Green
    Start-Sleep -Seconds 2
    
    # Update status to Arrived (this should add to queue)
    Write-Host "Setting status to Arrived (adding to queue)..." -ForegroundColor Yellow
    $arrivedData = @{
        status = "Arrived"
        user_id = "Dr.Queue"
        user_role = "doctor"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$reportId/status" -Method PATCH -Body $arrivedData -ContentType "application/json"
    Write-Host "Status: Arrived - Should be in queue!" -ForegroundColor Green
    
    # Check queue
    Write-Host ""
    Write-Host "Checking Kingston Public Hospital queue..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    
    $queueCheck = Invoke-RestMethod -Uri "http://localhost:3001/api/queue/HOSP001" -Method GET
    
    if ($queueCheck.data.queue_items -and $queueCheck.data.queue_items.Count -gt 0) {
        Write-Host "SUCCESS! Queue now has patients:" -ForegroundColor Green
        foreach ($item in $queueCheck.data.queue_items) {
            Write-Host "  - $($item.name) (Position: $($item.queue_position))" -ForegroundColor White
        }
    } else {
        Write-Host "Queue still empty - checking patient status..." -ForegroundColor Yellow
        $patientCheck = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$reportId" -Method GET
        Write-Host "Patient Status: $($patientCheck.data.status)" -ForegroundColor Cyan
        Write-Host "Hospital: $($patientCheck.data.hospital_name)" -ForegroundColor Cyan
    }
    
    # Create one more patient with different approach
    Write-Host ""
    Write-Host "Creating second patient..." -ForegroundColor Yellow
    
    $patient2 = @{
        name = "Emergency Queue Patient"
        gender = "female"
        age_range = "18-25"
        incident_type = "broken_bone"
        incident_description = "Broken arm from fall"
        patient_status = "conscious"
        transportation_mode = "private_car"
        contact_phone = "+18764740111"
        latitude = 18.0179
        longitude = -76.8099
    } | ConvertTo-Json
    
    $response2 = Invoke-RestMethod -Uri "http://localhost:3001/api/reports" -Method POST -Body $patient2 -ContentType "application/json"
    Write-Host "Second patient created: $($response2.report_id)" -ForegroundColor Green
    
    # Immediately set to Arrived
    Start-Sleep -Seconds 2
    $arrived2Data = @{
        status = "Arrived"
        user_id = "Dr.Emergency"
        user_role = "doctor"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$($response2.report_id)/status" -Method PATCH -Body $arrived2Data -ContentType "application/json"
    Write-Host "Second patient status: Arrived" -ForegroundColor Green
    
    # Final queue check
    Write-Host ""
    Write-Host "Final queue check..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    
    $finalCheck = Invoke-RestMethod -Uri "http://localhost:3001/api/queue/HOSP001" -Method GET
    
    if ($finalCheck.data.queue_items -and $finalCheck.data.queue_items.Count -gt 0) {
        Write-Host "FINAL RESULT - Queue has $($finalCheck.data.queue_items.Count) patients:" -ForegroundColor Green
        foreach ($item in $finalCheck.data.queue_items) {
            Write-Host "  $($item.queue_position). $($item.name) - $($item.incident_type)" -ForegroundColor White
        }
    } else {
        Write-Host "Queue is still empty" -ForegroundColor Red
        Write-Host "This indicates the queue system needs debugging" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Now check the dashboard:" -ForegroundColor Cyan
Write-Host "1. Open http://localhost:3000" -ForegroundColor Yellow
Write-Host "2. Go to Queue Management" -ForegroundColor Yellow
Write-Host "3. Select Kingston Public Hospital" -ForegroundColor Yellow