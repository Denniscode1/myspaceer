import fetch from 'node-fetch';

/**
 * Test script for patient notification system with queue status updates
 * This tests the enhanced notification functionality for queue status changes
 */

const BASE_URL = 'http://localhost:3001';

// Test data
const testPatient = {
  name: 'John Test Patient',
  gender: 'male',
  age_range: '26-35',
  trn: '123456789012',
  incident_type: 'chest_pain',
  incident_description: 'Test chest pain for notification testing',
  patient_status: 'conscious',
  transportation_mode: 'ambulance',
  contact_email: 'test.patient@example.com',
  contact_phone: '+1-876-555-0123',
  latitude: 18.0179,
  longitude: -76.8099,
  location_address: 'Test Location, Kingston'
};

const testDoctor = {
  user_id: 'test_doctor_001',
  user_role: 'doctor',
  username: 'Dr. Test',
  email: 'test.doctor@example.com',
  phone: '+1-876-555-0456'
};

async function makeRequest(url, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    const result = await response.json();
    return { status: response.status, data: result };
  } catch (error) {
    console.error(`Request failed: ${url}`, error);
    return { status: 500, data: { error: error.message } };
  }
}

async function testPatientNotifications() {
  console.log('🧪 Starting Patient Queue Notification Tests\n');
  
  let reportId;
  
  try {
    // Step 1: Submit a test patient report
    console.log('📝 Step 1: Submitting test patient report...');
    const submitResponse = await makeRequest(`${BASE_URL}/api/reports`, 'POST', testPatient);
    
    if (submitResponse.status === 201) {
      reportId = submitResponse.data.report_id;
      console.log(`✅ Patient report created: ${reportId}\n`);
      
      // Wait for initial processing
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else {
      console.error('❌ Failed to create patient report:', submitResponse.data);
      return;
    }
    
    // Step 2: Get hospitals and queue data
    console.log('🏥 Step 2: Getting hospital and queue data...');
    const hospitalsResponse = await makeRequest(`${BASE_URL}/api/hospitals`);
    
    if (hospitalsResponse.status === 200 && hospitalsResponse.data.data.length > 0) {
      const hospitalId = hospitalsResponse.data.data[0].hospital_id;
      console.log(`✅ Using hospital: ${hospitalsResponse.data.data[0].name} (${hospitalId})\n`);
      
      // Step 3: Test "Arrived" status notification
      console.log('🚪 Step 3: Testing patient arrival notification...');
      const arrivedResponse = await makeRequest(
        `${BASE_URL}/api/reports/${reportId}/status`, 
        'PATCH', 
        {
          status: 'Arrived',
          user_id: testDoctor.user_id,
          user_role: testDoctor.user_role
        }
      );
      
      if (arrivedResponse.status === 200) {
        console.log('✅ Patient arrival status updated');
        console.log('📧 Arrival notification should be sent to:', testPatient.contact_email);
        console.log('📱 SMS arrival notification should be sent to:', testPatient.contact_phone);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.error('❌ Failed to update arrival status:', arrivedResponse.data);
      }
      
      // Step 4: Test "InTreatment" status notification
      console.log('\n🏥 Step 4: Testing treatment started notification...');
      const treatmentResponse = await makeRequest(
        `${BASE_URL}/api/reports/${reportId}/status`, 
        'PATCH', 
        {
          status: 'InTreatment',
          user_id: testDoctor.user_id,
          user_role: testDoctor.user_role
        }
      );
      
      if (treatmentResponse.status === 200) {
        console.log('✅ Treatment started status updated');
        console.log('📧 Treatment started notification should be sent to:', testPatient.contact_email);
        console.log('📱 SMS treatment started notification should be sent to:', testPatient.contact_phone);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.error('❌ Failed to update treatment status:', treatmentResponse.data);
      }
      
      // Step 5: Test treatment completion notification
      console.log('\n✅ Step 5: Testing treatment completion notification...');
      const completionData = {
        report_id: reportId,
        hospital_id: hospitalId,
        treating_doctor_id: testDoctor.user_id,
        treating_doctor_name: 'Dr. Test',
        treatment_notes: 'Patient treated successfully for chest pain. Vital signs stable.',
        treatment_outcome: 'Full recovery',
        discharge_status: 'discharged',
        follow_up_required: false,
        patient_satisfaction_rating: 5,
        treatment_started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
      };
      
      const completionResponse = await makeRequest(
        `${BASE_URL}/api/complete-treatment`, 
        'POST', 
        completionData
      );
      
      if (completionResponse.status === 200) {
        console.log('✅ Treatment completion processed');
        console.log('📧 Treatment completion notification should be sent to:', testPatient.contact_email);
        console.log('📱 SMS completion notification should be sent to:', testPatient.contact_phone);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.error('❌ Failed to complete treatment:', completionResponse.data);
      }
      
      // Step 6: Test queue update notifications
      console.log('\n📋 Step 6: Testing queue update notifications...');
      const queueResponse = await makeRequest(`${BASE_URL}/api/queue/${hospitalId}`);
      
      if (queueResponse.status === 200) {
        console.log('✅ Queue data retrieved');
        console.log(`Queue has ${queueResponse.data.data.queue_items?.length || 0} patients`);
        
        // Test bulk notification to all patients in queue
        const bulkNotifyResponse = await makeRequest(
          `${BASE_URL}/api/queue/notify-all/${hospitalId}`, 
          'POST', 
          {
            nurse_id: testDoctor.user_id,
            user_role: 'nurse'
          }
        );
        
        if (bulkNotifyResponse.status === 200) {
          console.log('✅ Bulk queue notifications sent');
          console.log(`📧 Notifications sent to ${bulkNotifyResponse.data.data.notification_results.successful} patients`);
        } else {
          console.error('❌ Failed to send bulk notifications:', bulkNotifyResponse.data);
        }
      }
      
    } else {
      console.error('❌ Failed to get hospitals:', hospitalsResponse.data);
      return;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Cleanup: Remove test patient if created
    if (reportId) {
      console.log('\n🧹 Cleanup: Removing test patient...');
      const deleteResponse = await makeRequest(
        `${BASE_URL}/api/reports/${reportId}`, 
        'DELETE', 
        {
          user_id: testDoctor.user_id,
          user_role: testDoctor.user_role
        }
      );
      
      if (deleteResponse.status === 200) {
        console.log('✅ Test patient removed successfully');
      } else {
        console.log('⚠️  Could not remove test patient (may need manual cleanup)');
      }
    }
  }
  
  console.log('\n🎉 Patient Queue Notification Tests Completed!');
  console.log('\n📝 Expected Notifications Summary:');
  console.log('  1. ✅ Patient Arrival Confirmation (email + SMS)');
  console.log('  2. 🏥 Treatment Started (email + SMS)');
  console.log('  3. ✅ Treatment Completed with discharge info (email + SMS)');
  console.log('  4. 📋 Queue position updates (email + SMS)');
  console.log('\n💡 Check your notification service logs to verify delivery');
  console.log('💡 In production, these would be sent to real email/SMS providers');
}

// Function to test individual notification endpoints
async function testNotificationEndpoints() {
  console.log('\n🔧 Testing Individual Notification Endpoints\n');
  
  const testReportId = 'TEST_REPORT_' + Date.now();
  
  // Test patient queue update notification
  console.log('📋 Testing queue update notification endpoint...');
  const queueUpdateResponse = await makeRequest(
    `${BASE_URL}/api/patients/notify/queue-update`,
    'POST',
    {
      report_id: testReportId,
      queue_data: {
        hospital_name: 'Test Hospital',
        queue_position: 3,
        estimated_wait_time: 1800 // 30 minutes
      }
    }
  );
  
  console.log('Queue Update Response:', queueUpdateResponse.data);
  
  // Test status update notification
  console.log('\n📱 Testing status update notification endpoint...');
  const statusUpdateResponse = await makeRequest(
    `${BASE_URL}/api/patients/notify/status-update`,
    'POST',
    {
      report_id: testReportId,
      new_status: 'InTreatment',
      assigned_doctor: 'Dr. Test'
    }
  );
  
  console.log('Status Update Response:', statusUpdateResponse.data);
  
  // Test treatment ready notification
  console.log('\n🚨 Testing treatment ready notification endpoint...');
  const treatmentReadyResponse = await makeRequest(
    `${BASE_URL}/api/patients/notify/treatment-ready`,
    'POST',
    {
      report_id: testReportId,
      doctor_name: 'Dr. Test'
    }
  );
  
  console.log('Treatment Ready Response:', treatmentReadyResponse.data);
}

// Check if server is running
async function checkServerHealth() {
  console.log('🏥 Checking Emergency Triage Server...');
  const healthResponse = await makeRequest(`${BASE_URL}/api/health`);
  
  if (healthResponse.status === 200) {
    console.log('✅ Server is running and healthy');
    console.log(`Server version: ${healthResponse.data.version}`);
    return true;
  } else {
    console.error('❌ Server is not responding properly');
    console.log('Please make sure the server is running on http://localhost:3001');
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚨 Emergency Triage Patient Notification System Tests');
  console.log('=====================================================\n');
  
  const serverHealthy = await checkServerHealth();
  
  if (!serverHealthy) {
    process.exit(1);
  }
  
  await testPatientNotifications();
  await testNotificationEndpoints();
  
  console.log('\n✨ All tests completed!');
}

// Run the tests
runTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});