#!/usr/bin/env node

import { addToQueue } from './server/services/queueManager.js';
import { assignDoctorToPatient } from './server/services/doctorAssignmentService.js';
import { updateReportStatus } from './server/database-enhanced.js';
import { notifyPatientQueueUpdate } from './server/services/patientNotificationService.js';

function calculatePriorityScore({ criticality, travelTimeSeconds, report }) {
  const criticalityScores = {
    severe: 10,
    high: 7,
    moderate: 4,
    low: 2
  };

  return criticalityScores[criticality] ?? 4;
}

async function testAsyncProcessing() {
  console.log('🧪 Testing Async Processing Pipeline...\n');
  
  const testData = {
    reportId: 'TEST_DEBUG_REPORT',
    hospitalId: 'HOSP001',
    triageResult: { criticality: 'severe' },
    patientReport: {
      incident_type: 'shooting',
      age_range: '31-50'
    },
    selectedHospital: {
      hospital_id: 'HOSP001',
      name: 'Kingston Public Hospital'
    }
  };
  
  try {
    // Step 1: Calculate priority score
    console.log('1️⃣ Calculating priority score...');
    const priorityScore = calculatePriorityScore({
      criticality: testData.triageResult.criticality,
      travelTimeSeconds: 900,
      report: testData.patientReport
    });
    console.log(`   ✅ Priority score: ${priorityScore}\n`);
    
    // Step 2: Add to queue
    console.log('2️⃣ Adding to queue...');
    const queueResult = await addToQueue(
      testData.reportId,
      testData.hospitalId,
      priorityScore
    );
    console.log(`   ✅ Queue result:`, queueResult);
    console.log('');
    
    // Step 3: Assign doctor
    console.log('3️⃣ Assigning doctor...');
    const doctorAssignment = await assignDoctorToPatient(
      testData.reportId,
      testData.hospitalId,
      testData.patientReport.incident_type,
      testData.triageResult.criticality,
      testData.patientReport.age_range
    );
    console.log(`   📋 Doctor assignment result:`, doctorAssignment);
    console.log('');
    
    // Step 4: Update status
    console.log('4️⃣ Updating status to Assigned...');
    try {
      await updateReportStatus(testData.reportId, 'Assigned');
      console.log(`   ✅ Status updated successfully\n`);
    } catch (statusError) {
      console.error(`   ❌ Status update failed:`, statusError);
    }
    
    // Step 5: Send notifications
    console.log('5️⃣ Sending patient notifications...');
    try {
      const queuePosition = queueResult?.queue_position ?? queueResult?.position ?? 1;
      const estimatedWaitTime = queuePosition * 30 * 60;
      
      await notifyPatientQueueUpdate(testData.reportId, {
        hospital_name: testData.selectedHospital.name,
        queue_position: queuePosition,
        estimated_wait_time: estimatedWaitTime
      });
      console.log(`   ✅ Patient notifications sent successfully\n`);
    } catch (notificationError) {
      console.error(`   ❌ Patient notification failed:`, notificationError);
    }
    
    console.log('🎉 Async processing pipeline test completed successfully!');
    
  } catch (error) {
    console.error('❌ Pipeline test failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

testAsyncProcessing();