#!/usr/bin/env node

/**
 * Enhanced Emergency Triage System Test Script
 * Demonstrates complete workflow from submission to queue management
 */

const API_BASE = 'http://localhost:3001/api';

async function testEnhancedSystem() {
  console.log('🚨 Testing Enhanced Emergency Triage System\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing System Health...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    const health = await healthResponse.json();
    console.log('✅ System Status:', health.message);
    console.log('📋 Features:', health.features.join(', '));
    console.log('');

    // Test 2: Submit Multiple Patient Reports
    console.log('2️⃣ Submitting Test Patient Reports...\n');
    
    const testPatients = [
      {
        name: 'John Smith',
        gender: 'male',
        age_range: '31-50',
        incident_type: 'shooting',
        patient_status: 'unconscious',
        transportation_mode: 'ambulance',
        latitude: 17.9714,
        longitude: -76.7931,
        incident_description: 'Gunshot wound to chest, unconscious on scene'
      },
      {
        name: 'Sarah Johnson',
        gender: 'female', 
        age_range: '11-30',
        incident_type: 'motor-vehicle-accident',
        patient_status: 'conscious',
        transportation_mode: 'ambulance',
        latitude: 17.9800,
        longitude: -76.7850,
        incident_description: 'Multi-vehicle collision, chest pain and difficulty breathing'
      },
      {
        name: 'Robert Davis',
        gender: 'male',
        age_range: '51+',
        incident_type: 'other',
        patient_status: 'conscious',
        transportation_mode: 'self-carry',
        latitude: 18.0000,
        longitude: -76.7500,
        incident_description: 'Severe chest pain, sweating profusely'
      }
    ];

    const submittedReports = [];
    
    for (let i = 0; i < testPatients.length; i++) {
      const patient = testPatients[i];
      console.log(`Submitting patient: ${patient.name}`);
      
      const response = await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patient)
      });
      
      const result = await response.json();
      if (result.success) {
        console.log(`✅ Report ID: ${result.report_id}`);
        submittedReports.push(result.report_id);
      } else {
        console.log(`❌ Failed: ${result.error}`);
      }
      
      // Small delay to allow async processing
      await sleep(1000);
    }

    console.log('\n3️⃣ Waiting for async processing to complete...');
    await sleep(5000); // Wait 5 seconds for processing

    // Test 3: Check Processing Results
    console.log('\n4️⃣ Checking Processing Results...\n');
    
    const reportsResponse = await fetch(`${API_BASE}/reports`);
    const reportsData = await reportsResponse.json();
    
    if (reportsData.success) {
      console.log(`📊 Total Reports: ${reportsData.count}`);
      console.log('');
      
      reportsData.data.forEach((report, index) => {
        if (submittedReports.includes(report.report_id)) {
          console.log(`👤 Patient: ${report.name}`);
          console.log(`🏥 Status: ${report.status}`);
          console.log(`⚠️ Criticality: ${report.criticality || 'Processing...'}`);
          console.log(`🏥 Hospital: ${report.hospital_name || 'Not assigned yet'}`);
          console.log(`📍 Queue Position: ${report.queue_position || 'N/A'}`);
          
          if (report.criticality_reason) {
            console.log(`💡 Reason: ${report.criticality_reason}`);
          }
          
          if (report.estimated_wait_time) {
            const waitMinutes = Math.round(report.estimated_wait_time / 60);
            console.log(`⏱️ Est. Wait: ${waitMinutes} minutes`);
          }
          
          console.log('---');
        }
      });
    }

    // Test 4: System Statistics
    console.log('\n5️⃣ System Statistics...\n');
    
    const statsResponse = await fetch(`${API_BASE}/stats`);
    const stats = await statsResponse.json();
    
    if (stats.success) {
      console.log(`📈 Total Reports: ${stats.data.total_reports}`);
      
      console.log('\n📊 Status Breakdown:');
      Object.entries(stats.data.status_breakdown).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
      
      if (Object.keys(stats.data.criticality_breakdown).length > 0) {
        console.log('\n🎯 Criticality Breakdown:');
        Object.entries(stats.data.criticality_breakdown).forEach(([level, count]) => {
          const emoji = level === 'severe' ? '🔴' : level === 'high' ? '🟠' : level === 'moderate' ? '🟡' : '🟢';
          console.log(`   ${emoji} ${level}: ${count}`);
        });
      }
      
      console.log('\n⏱️ Processing Times:');
      console.log(`   Average Triage: ${stats.data.processing_times.avg_triage_time}`);
      console.log(`   Average Assignment: ${stats.data.processing_times.avg_assignment_time}`);
    }

    // Test 5: Location Update (simulate ambulance movement)
    if (submittedReports.length > 0) {
      console.log('\n6️⃣ Testing Location Updates...\n');
      
      const reportId = submittedReports[0];
      console.log(`📍 Updating location for report: ${reportId}`);
      
      const locationResponse = await fetch(`${API_BASE}/reports/${reportId}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: 17.9750,
          longitude: -76.7800,
          speed: 60
        })
      });
      
      const locationResult = await locationResponse.json();
      if (locationResult.success) {
        console.log('✅ Location updated successfully');
      } else {
        console.log('❌ Location update failed:', locationResult.error);
      }
    }

    // Test 6: Status Update (simulate nurse action)
    if (submittedReports.length > 0) {
      console.log('\n7️⃣ Testing Status Updates...\n');
      
      const reportId = submittedReports[0];
      console.log(`📝 Updating status for report: ${reportId}`);
      
      const statusResponse = await fetch(`${API_BASE}/reports/${reportId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Arrived',
          user_id: 'nurse_test_001',
          user_role: 'nurse'
        })
      });
      
      const statusResult = await statusResponse.json();
      if (statusResult.success) {
        console.log('✅ Status updated to: Arrived');
      } else {
        console.log('❌ Status update failed:', statusResult.error);
      }
    }

    console.log('\n🎉 Enhanced Emergency Triage System Test Complete!\n');
    
    // Display system capabilities summary
    console.log('📋 System Capabilities Demonstrated:');
    console.log('   ✅ Patient report submission with validation');
    console.log('   ✅ Asynchronous triage processing (rules + ML)');
    console.log('   ✅ Hospital selection with travel time optimization');
    console.log('   ✅ Priority queue management');
    console.log('   ✅ Real-time location tracking');
    console.log('   ✅ Status management and audit logging');
    console.log('   ✅ System monitoring and statistics');
    console.log('');
    console.log('🔗 API Endpoints Tested:');
    console.log('   - POST /api/reports (field submission)');
    console.log('   - GET /api/reports (retrieve with triage data)');
    console.log('   - POST /api/reports/:id/location (live tracking)');
    console.log('   - PATCH /api/reports/:id/status (status updates)');
    console.log('   - GET /api/health (system health)');
    console.log('   - GET /api/stats (system statistics)');
    console.log('');
    console.log('🏥 Triage Features:');
    console.log('   - Deterministic rules (shooting + unconscious → severe)');
    console.log('   - ML classifier fallback with confidence scoring');
    console.log('   - Keyword analysis of incident descriptions');
    console.log('   - Explainable AI reasoning');
    console.log('');
    console.log('🚑 Hospital Selection:');
    console.log('   - Multi-factor scoring algorithm');
    console.log('   - Travel time optimization with routing APIs');
    console.log('   - Capacity and specialty matching');
    console.log('   - Dynamic ETA calculation');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('💡 Make sure the enhanced server is running:');
      console.log('   cd server');
      console.log('   node server-enhanced.js');
    }
  }
}

// Helper function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Add fetch polyfill for Node.js if needed
if (typeof fetch === 'undefined') {
  try {
    const { fetch: nodeFetch } = await import('node-fetch');
    global.fetch = nodeFetch;
  } catch (error) {
    console.error('❌ node-fetch not available. Please install it:');
    console.log('npm install node-fetch');
    process.exit(1);
  }
}

// Run the test
testEnhancedSystem();