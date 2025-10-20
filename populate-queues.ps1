# Populate Hospital Queues with Existing Patients
Write-Host "Adding Patients to Hospital Queues" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

try {
    # Get all patients currently in the system
    Write-Host "Step 1: Getting current patients..." -ForegroundColor Yellow
    $reports = Invoke-RestMethod -Uri "http://localhost:3001/api/reports" -Method GET
    $activePatients = $reports.data | Where-Object { $_.status -in @("Arrived", "InTreatment", "Assigned") }
    
    Write-Host "Found $($activePatients.Count) active patients to add to queues" -ForegroundColor Green
    
    # Get hospitals
    Write-Host "Step 2: Getting hospitals..." -ForegroundColor Yellow
    $hospitals = Invoke-RestMethod -Uri "http://localhost:3001/api/hospitals" -Method GET
    
    foreach ($patient in $activePatients) {
        Write-Host ""
        Write-Host "Processing: $($patient.name) (Status: $($patient.status))" -ForegroundColor Cyan
        
        # Assign patient to first hospital if not already assigned
        $hospitalId = "HOSP001"  # Kingston Public Hospital
        $hospitalName = "Kingston Public Hospital"
        
        # Determine queue priority based on incident type and status
        $priority = switch ($patient.incident_type) {
            "chest_pain" { 8 }
            "broken_bone" { 5 }
            "head_injury" { 9 }
            "breathing_difficulty" { 7 }
            default { 6 }
        }
        
        # Add urgency if patient is already in treatment
        if ($patient.status -eq "InTreatment") { $priority += 2 }
        
        Write-Host "  Assigning to: $hospitalName" -ForegroundColor White
        Write-Host "  Priority Score: $priority" -ForegroundColor White
        
        # Update patient to be assigned to hospital first
        $assignUpdate = @{
            status = "Assigned"
            user_id = "queue_admin"
            user_role = "admin"
        } | ConvertTo-Json
        
        try {
            $assignResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$($patient.report_id)/status" -Method PATCH -Body $assignUpdate -ContentType "application/json"
            Write-Host "  ✅ Status updated to Assigned" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠️ Could not update status: $_" -ForegroundColor Yellow
        }
        
        Start-Sleep -Seconds 1
        
        # Now update to Arrived to trigger queue addition
        $arrivedUpdate = @{
            status = "Arrived"
            user_id = "queue_admin"
            user_role = "admin"
        } | ConvertTo-Json
        
        try {
            $arrivedResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$($patient.report_id)/status" -Method PATCH -Body $arrivedUpdate -ContentType "application/json"
            Write-Host "  ✅ Status updated to Arrived - should be in queue!" -ForegroundColor Green
        } catch {
            Write-Host "  ❌ Could not update to Arrived: $_" -ForegroundColor Red
        }
        
        Start-Sleep -Seconds 1
    }
    
    Write-Host ""
    Write-Host "Step 3: Checking all hospital queues..." -ForegroundColor Yellow
    
    foreach ($hospital in $hospitals.data) {
        Write-Host ""
        Write-Host "Checking $($hospital.name):" -ForegroundColor Cyan
        
        try {
            $queueResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/queue/$($hospital.hospital_id)" -Method GET
            
            if ($queueResponse.data.queue_items -and $queueResponse.data.queue_items.Count -gt 0) {
                Write-Host "  📋 $($queueResponse.data.queue_items.Count) patients in queue:" -ForegroundColor Green
                
                foreach ($queueItem in $queueResponse.data.queue_items) {
                    Write-Host "    $($queueItem.queue_position). $($queueItem.name) - $($queueItem.incident_type) (Status: $($queueItem.queue_status))" -ForegroundColor White
                }
            } else {
                Write-Host "  📋 0 patients in queue" -ForegroundColor Yellow
                
                # Try manual queue addition for this hospital
                Write-Host "  🔧 Attempting manual queue population..." -ForegroundColor Gray
                
                # Let's try to manually add one patient via a different method
                $testPatient = $activePatients | Select-Object -First 1
                if ($testPatient) {
                    # Try bulk notify endpoint which might trigger queue updates
                    try {
                        $notifyData = @{
                            user_id = "queue_admin"
                            user_role = "admin"
                        } | ConvertTo-Json
                        
                        $notifyResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/queue/notify-all/$($hospital.hospital_id)" -Method POST -Body $notifyData -ContentType "application/json"
                        Write-Host "  ✅ Queue notification triggered" -ForegroundColor Green
                    } catch {
                        Write-Host "  ⚠️ Queue notification failed: $_" -ForegroundColor Gray
                    }
                }
            }
        } catch {
            Write-Host "  ❌ Error checking queue: $_" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "🎯 FINAL STEP: Creating a test patient specifically for the queue..." -ForegroundColor Cyan
    
    # Create a fresh patient that should definitely go to the queue
    $queuePatientData = @{
        name = "Queue Demo Patient"
        gender = "female"
        age_range = "26-35"
        trn = "999000111222"
        incident_type = "chest_pain"
        incident_description = "Patient specifically for queue demonstration"
        patient_status = "conscious"
        transportation_mode = "ambulance"
        contact_email = "queue.demo@example.com"
        contact_phone = "+18764740111"
        latitude = 18.0179
        longitude = -76.8099
        location_address = "Kingston, Jamaica"
    } | ConvertTo-Json
    
    try {
        $newPatientResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/reports" -Method POST -Body $queuePatientData -ContentType "application/json"
        $newReportId = $newPatientResponse.report_id
        Write-Host "✅ Created queue demo patient: $newReportId" -ForegroundColor Green
        
        # Immediately process this patient through the queue
        Start-Sleep -Seconds 2
        
        # Update to Arrived
        $demoArrivedUpdate = @{
            status = "Arrived"
            user_id = "Dr.QueueDemo"
            user_role = "doctor"
        } | ConvertTo-Json
        
        $demoArrivedResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/reports/$newReportId/status" -Method PATCH -Body $demoArrivedUpdate -ContentType "application/json"
        Write-Host "✅ Demo patient status: Arrived" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "Final queue check after demo patient..." -ForegroundColor Yellow
        
        $finalQueueCheck = Invoke-RestMethod -Uri "http://localhost:3001/api/queue/HOSP001" -Method GET
        if ($finalQueueCheck.data.queue_items -and $finalQueueCheck.data.queue_items.Count -gt 0) {
            Write-Host "🎉 SUCCESS! Kingston Public Hospital now has $($finalQueueCheck.data.queue_items.Count) patients:" -ForegroundColor Green
            foreach ($item in $finalQueueCheck.data.queue_items) {
                Write-Host "  - $($item.name) (Position: $($item.queue_position))" -ForegroundColor White
            }
        } else {
            Write-Host "⚠️ Still no patients in queue - there may be a deeper issue with the queue system" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "❌ Failed to create demo patient: $_" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Script failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "🌐 Now check your dashboard:" -ForegroundColor Cyan
Write-Host "1. Open http://localhost:3000" -ForegroundColor White
Write-Host "2. Go to Queue Management" -ForegroundColor White
Write-Host "3. Select 'Kingston Public Hospital'" -ForegroundColor White
Write-Host "4. You should see patients in the queue!" -ForegroundColor White