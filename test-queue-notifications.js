import fetch from 'node-fetch';

// Test the same notifications that the QueueManagement component would send
const NOTIFICATION_URL = 'http://localhost:3001/api/notifications/send';
const doctorEmail = 'rhanaldidenniscode@gmail.com';
const doctorPhone = '+18764740111';

async function testQueueManagementNotifications() {
  console.log('🏥 Testing Queue Management Notification Functions...\n');

  // Test scenarios that match the QueueManagement component
  const testScenarios = [
    {
      name: 'Patient Status Update',
      notifications: [
        {
          type: 'email',
          recipient: doctorEmail,
          subject: 'Queue Update - Emergency Triage System',
          message: 'Dr. Doctor, Patient 12345 status updated to InTreatment',
          priority: 'normal'
        },
        {
          type: 'sms',
          recipient: doctorPhone,
          message: 'Dr. Doctor, Patient 12345 status updated to InTreatment',
          priority: 'normal'
        }
      ]
    },
    {
      name: 'Queue Position Change',
      notifications: [
        {
          type: 'email',
          recipient: doctorEmail,
          subject: 'Queue Update - Emergency Triage System',
          message: 'Dr. Doctor, Queue updated: Patient 12345 moved up',
          priority: 'normal'
        },
        {
          type: 'sms',
          recipient: doctorPhone,
          message: 'Dr. Doctor, Queue updated: Patient 12345 moved up',
          priority: 'normal'
        }
      ]
    },
    {
      name: 'Treatment Started',
      notifications: [
        {
          type: 'email',
          recipient: doctorEmail,
          subject: 'Queue Update - Emergency Triage System',
          message: 'Dr. Doctor, Treatment started for patient 12345',
          priority: 'normal'
        },
        {
          type: 'sms',
          recipient: doctorPhone,
          message: 'Dr. Doctor, Treatment started for patient 12345',
          priority: 'normal'
        }
      ]
    },
    {
      name: 'Treatment Completed',
      notifications: [
        {
          type: 'email',
          recipient: doctorEmail,
          subject: 'Queue Update - Emergency Triage System',
          message: 'Dr. Doctor, Treatment completed for patient 12345. Patient has been moved to treated section.',
          priority: 'normal'
        },
        {
          type: 'sms',
          recipient: doctorPhone,
          message: 'Dr. Doctor, Treatment completed for patient 12345. Patient has been moved to treated section.',
          priority: 'normal'
        }
      ]
    }
  ];

  for (const scenario of testScenarios) {
    console.log(`📋 Testing: ${scenario.name}`);
    
    for (const notification of scenario.notifications) {
      try {
        console.log(`   📤 Sending ${notification.type.toUpperCase()} to ${notification.recipient}`);
        
        const response = await fetch(NOTIFICATION_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(notification)
        });

        const result = await response.json();
        
        if (result.success) {
          console.log(`   ✅ ${notification.type.toUpperCase()} sent successfully!`);
        } else {
          console.log(`   ❌ Failed to send ${notification.type}: ${result.error}`);
        }
      } catch (error) {
        console.log(`   💥 Error: ${error.message}`);
      }
    }
    
    console.log(''); // Empty line for readability
    // Small delay between scenarios
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('🎯 Queue Management notification testing complete!');
  console.log('📧 Check your email and phone for test notifications.');
}

// Run the test
testQueueManagementNotifications().catch(console.error);