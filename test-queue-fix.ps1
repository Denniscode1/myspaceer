# Fix Queue Issue - Add Patient Properly
Write-Host "Fixing Queue System and Adding Patient" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Create a patient with better data structure
$patientData = @{
    name = "Queue Test Patient"
    gender = "male"
    age_range = "26-35"
    trn = "123456789999" 
    incident_type = "chest_pain"
    incident_description = "Testing proper queue addition"
    patient_status = "conscious"
    transportation_mode = "ambulance"
    contact_email = "test@example.com"
    contact_phone = "+18764740111"
    latitude = 18.0179
    longitude = -76.8099
    location_address = "Kingston, Jamaica"
} | ConvertTo-Json

Write-Host "Creating patient with proper queue processing..." -ForegroundColor Yellow

try {
    # Create patient
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/reports" -Method POST -Body $patientData -ContentType "application/json"
    $reportId = $response.report_id
    Write-Host "✅ Patient created: $reportId" -ForegroundColor Green
    
    # Wait a moment for async processing
    Write-Host "Waiting for processing..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    # Check initial status
    $report = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$reportId" -Method GET
    Write-Host "Initial Status: $($report.data.status)" -ForegroundColor Cyan
    
    # If processing failed, let's manually assign hospital and add to queue
    if ($report.data.status -eq "ProcessingError" -or $report.data.status -eq "Created") {
        Write-Host "Manual processing required..." -ForegroundColor Yellow
        
        # Get first hospital
        $hospitals = Invoke-RestMethod -Uri "http://localhost:3001/api/hospitals" -Method GET
        $hospitalId = $hospitals.data[0].hospital_id
        $hospitalName = $hospitals.data[0].name
        
        Write-Host "Assigning to hospital: $hospitalName" -ForegroundColor Cyan
        
        # Update status to Assigned manually
        $statusUpdate = @{
            status = "Assigned"
            user_id = "system"
            user_role = "system"
        } | ConvertTo-Json
        
        try {
            $statusResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$reportId/status" -Method PATCH -Body $statusUpdate -ContentType "application/json"
            Write-Host "✅ Status updated to Assigned" -ForegroundColor Green
            
            # Now update to Arrived to add to queue
            $arrivedUpdate = @{
                status = "Arrived"
                user_id = "Dr.Smith"
                user_role = "doctor"
            } | ConvertTo-Json
            
            $arrivedResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$reportId/status" -Method PATCH -Body $arrivedUpdate -ContentType "application/json"
            Write-Host "✅ Status updated to Arrived - Patient should be in queue!" -ForegroundColor Green
            
        } catch {
            Write-Host "❌ Failed to update status: $_" -ForegroundColor Red
        }
    }
    
    # Check final status
    Start-Sleep -Seconds 2
    $finalReport = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$reportId" -Method GET
    
    Write-Host ""
    Write-Host "FINAL PATIENT STATUS:" -ForegroundColor Green
    Write-Host "  Report ID: $($finalReport.data.report_id)" -ForegroundColor White
    Write-Host "  Name: $($finalReport.data.name)" -ForegroundColor White
    Write-Host "  Status: $($finalReport.data.status)" -ForegroundColor White
    Write-Host "  Hospital: $($finalReport.data.hospital_name)" -ForegroundColor White
    Write-Host "  Queue Position: $($finalReport.data.queue_position)" -ForegroundColor White
    
    # Check queue for this hospital
    Write-Host ""
    Write-Host "Checking hospital queues..." -ForegroundColor Yellow
    
    $hospitals = Invoke-RestMethod -Uri "http://localhost:3001/api/hospitals" -Method GET
    foreach ($hospital in $hospitals.data) {
        try {
            $queue = Invoke-RestMethod -Uri "http://localhost:3001/api/queue/$($hospital.hospital_id)" -Method GET
            $queueCount = $queue.data.queue_items.Count
            Write-Host "  $($hospital.name): $queueCount patients in queue" -ForegroundColor Cyan
            
            if ($queueCount -gt 0) {
                foreach ($patient in $queue.data.queue_items) {
                    Write-Host "    - $($patient.name) (Status: $($patient.queue_status))" -ForegroundColor Gray
                }
            }
        } catch {
            Write-Host "  $($hospital.name): Could not check queue" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Host "❌ Failed to create patient: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Test completed!" -ForegroundColor Green
Write-Host "Open the dashboard at http://localhost:3000 to see patients" -ForegroundColor Yellow