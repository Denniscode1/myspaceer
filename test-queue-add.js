#!/usr/bin/env node

import { addToQueue } from './server/services/queueManager.js';

async function testAddToQueue() {
  console.log('🧪 Testing addToQueue function...\n');
  
  try {
    const result = await addToQueue(
      'TEST_REPORT_ID',
      'HOSP001',
      15.5
    );
    
    console.log('✅ addToQueue succeeded:', result);
    
  } catch (error) {
    console.error('❌ addToQueue failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

testAddToQueue();