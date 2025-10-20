import fetch from 'node-fetch';

// Test notification endpoint
const TEST_NOTIFICATION_URL = 'http://localhost:3001/api/notifications/send';

// Test data
const testNotifications = [
  {
    type: 'email',
    recipient: 'rhanaldidenniscode@gmail.com',
    subject: 'MySpaceER Test - Queue Management Notification',
    message: 'Testing email notifications from Queue Management system. Doctor notification: Patient status updated to InTreatment.',
    priority: 'normal'
  },
  {
    type: 'sms',
    recipient: '+18764740111', // Using the Twilio number as test
    message: 'MySpaceER Test: Queue updated - Patient moved up in queue. This is a test notification.',
    priority: 'normal'
  }
];

async function runNotificationTest() {
  console.log('🧪 Testing MySpaceER Notification System...\n');

  for (let i = 0; i < testNotifications.length; i++) {
    const notification = testNotifications[i];
    console.log(`📋 Test ${i + 1}: Testing ${notification.type.toUpperCase()} notification`);
    console.log(`   Recipient: ${notification.recipient}`);
    console.log(`   Message: ${notification.message.substring(0, 50)}...`);

    try {
      const response = await fetch(TEST_NOTIFICATION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notification)
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`   ✅ ${notification.type.toUpperCase()} sent successfully!`);
        if (result.details) {
          console.log(`   📊 Details: ${JSON.stringify(result.details)}`);
        }
      } else {
        console.log(`   ❌ Failed to send ${notification.type}: ${result.error}`);
      }
    } catch (error) {
      console.log(`   💥 Error testing ${notification.type}: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }

  console.log('🎯 Notification testing complete!');
  console.log('📱 Check your phone for SMS and email for the test messages.');
}

// Run the test
runNotificationTest().catch(console.error);
