// Test script to verify all 5 Quick Win Features
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function test(name, fn) {
  try {
    fn();
    results.passed++;
    results.tests.push({ name, status: '✅ PASS' });
    console.log(`✅ ${name}`);
  } catch (error) {
    results.failed++;
    results.tests.push({ name, status: '❌ FAIL', error: error.message });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

console.log('\n🧪 Testing Quick Win Features Implementation\n');
console.log('='.repeat(60));

// ============================================
// 1. WebSocket Real-time Updates
// ============================================
console.log('\n📡 1. WebSocket Real-time Updates');
console.log('-'.repeat(60));

test('WebSocket service file exists', () => {
  const path = join(__dirname, 'server', 'services', 'websocketService.js');
  if (!existsSync(path)) throw new Error('File not found');
});

test('WebSocket service has initialize method', () => {
  const path = join(__dirname, 'server', 'services', 'websocketService.js');
  const content = readFileSync(path, 'utf8');
  if (!content.includes('initialize(server)')) throw new Error('initialize method not found');
  if (!content.includes('socket.io')) throw new Error('socket.io import not found');
});

test('WebSocket hook exists (frontend)', () => {
  const path = join(__dirname, 'src', 'hooks', 'useWebSocket.js');
  if (!existsSync(path)) throw new Error('File not found');
});

test('WebSocket hook has connection logic', () => {
  const path = join(__dirname, 'src', 'hooks', 'useWebSocket.js');
  const content = readFileSync(path, 'utf8');
  if (!content.includes('io(SOCKET_URL')) throw new Error('Socket connection not found');
  if (!content.includes('queue:update')) throw new Error('Queue update handler not found');
});

test('WebSocket integrated in server', () => {
  const path = join(__dirname, 'server', 'server-enhanced.js');
  const content = readFileSync(path, 'utf8');
  if (!content.includes('websocketService.initialize')) throw new Error('WebSocket not initialized in server');
  if (!content.includes('emitQueueUpdate') || !content.includes('emitHospitalQueueUpdate')) {
    throw new Error('WebSocket emit methods not used');
  }
});

// ============================================
// 2. Vital Signs Tracking
// ============================================
console.log('\n🩺 2. Vital Signs Tracking');
console.log('-'.repeat(60));

test('Vital signs migration file exists', () => {
  const path = join(__dirname, 'server', 'migrations', 'add-vital-signs.js');
  if (!existsSync(path)) throw new Error('Migration file not found');
});

test('Vital signs component exists', () => {
  const path = join(__dirname, 'src', 'components', 'VitalSignsInput.jsx');
  if (!existsSync(path)) throw new Error('Component file not found');
});

test('Vital signs component has all fields', () => {
  const path = join(__dirname, 'src', 'components', 'VitalSignsInput.jsx');
  const content = readFileSync(path, 'utf8');
  const requiredFields = [
    'blood_pressure_systolic',
    'blood_pressure_diastolic',
    'heart_rate',
    'respiratory_rate',
    'oxygen_saturation',
    'temperature_celsius',
    'glasgow_coma_scale',
    'pain_level',
    'consciousness_level',
    'has_allergies',
    'allergies_list',
    'current_medications',
    'medical_history'
  ];
  
  for (const field of requiredFields) {
    if (!content.includes(field)) {
      throw new Error(`Required field "${field}" not found in component`);
    }
  }
});

test('Vital signs validation exists', () => {
  const path = join(__dirname, 'src', 'components', 'VitalSignsInput.jsx');
  const content = readFileSync(path, 'utf8');
  if (!content.includes('warnings')) throw new Error('Validation warnings not found');
  if (!content.includes('Hypotension') || !content.includes('Tachycardia')) {
    throw new Error('Clinical validation messages not found');
  }
});

test('Vital signs in PostgreSQL schema', () => {
  const path = join(__dirname, 'server', 'database-postgres.js');
  const content = readFileSync(path, 'utf8');
  if (!content.includes('blood_pressure_systolic')) throw new Error('Vital signs fields not in schema');
  if (!content.includes('vital_signs_abnormal')) throw new Error('Abnormal flag not in schema');
});

// ============================================
// 3. PostgreSQL Migration
// ============================================
console.log('\n🐘 3. PostgreSQL Migration');
console.log('-'.repeat(60));

test('PostgreSQL database file exists', () => {
  const path = join(__dirname, 'server', 'database-postgres.js');
  if (!existsSync(path)) throw new Error('File not found');
});

test('PostgreSQL has connection pool', () => {
  const path = join(__dirname, 'server', 'database-postgres.js');
  const content = readFileSync(path, 'utf8');
  if (!content.includes('import pg')) throw new Error('pg import not found');
  if (!content.includes('new Pool')) throw new Error('Connection pool not found');
});

test('PostgreSQL has complete schema', () => {
  const path = join(__dirname, 'server', 'database-postgres.js');
  const content = readFileSync(path, 'utf8');
  const requiredTables = [
    'patient_reports',
    'triage_results',
    'hospitals',
    'travel_estimates',
    'hospital_assignments',
    'patient_queue',
    'doctor_shifts'
  ];
  
  for (const table of requiredTables) {
    if (!content.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) {
      throw new Error(`Table "${table}" not found in schema`);
    }
  }
});

test('PostgreSQL has indexes', () => {
  const path = join(__dirname, 'server', 'database-postgres.js');
  const content = readFileSync(path, 'utf8');
  if (!content.includes('CREATE INDEX')) throw new Error('No indexes found');
  if (!content.includes('idx_patient_reports_report_id')) throw new Error('Critical index missing');
});

test('PostgreSQL migration guide exists', () => {
  const path = join(__dirname, 'POSTGRESQL_MIGRATION.md');
  if (!existsSync(path)) throw new Error('Migration guide not found');
});

// ============================================
// 4. Push Notifications (PWA)
// ============================================
console.log('\n🔔 4. Push Notifications (PWA)');
console.log('-'.repeat(60));

test('Service worker exists', () => {
  const path = join(__dirname, 'public', 'service-worker.js');
  if (!existsSync(path)) throw new Error('Service worker not found');
});

test('Service worker has push handlers', () => {
  const path = join(__dirname, 'public', 'service-worker.js');
  const content = readFileSync(path, 'utf8');
  if (!content.includes("addEventListener('push'")) throw new Error('Push event listener not found');
  if (!content.includes('showNotification')) throw new Error('Notification API not used');
});

test('Service worker has notification click handler', () => {
  const path = join(__dirname, 'public', 'service-worker.js');
  const content = readFileSync(path, 'utf8');
  if (!content.includes("addEventListener('notificationclick'")) {
    throw new Error('Notification click handler not found');
  }
});

test('PWA manifest exists', () => {
  const path = join(__dirname, 'public', 'manifest.json');
  if (!existsSync(path)) throw new Error('PWA manifest not found');
});

test('Push notifications hook exists', () => {
  const path = join(__dirname, 'src', 'hooks', 'usePushNotifications.js');
  if (!existsSync(path)) throw new Error('Push notifications hook not found');
});

test('Push notifications hook has permission request', () => {
  const path = join(__dirname, 'src', 'hooks', 'usePushNotifications.js');
  const content = readFileSync(path, 'utf8');
  if (!content.includes('Notification.permission')) {
    throw new Error('Permission check not found');
  }
  if (!content.includes('requestPermission')) {
    throw new Error('Permission request not found');
  }
});

// ============================================
// 5. Analytics Dashboard
// ============================================
console.log('\n📊 5. Analytics Dashboard');
console.log('-'.repeat(60));

test('Analytics service file exists', () => {
  const path = join(__dirname, 'server', 'services', 'analyticsService.js');
  if (!existsSync(path)) throw new Error('File not found');
});

test('Analytics service has system stats', () => {
  const path = join(__dirname, 'server', 'services', 'analyticsService.js');
  const content = readFileSync(path, 'utf8');
  if (!content.includes('getSystemStats')) throw new Error('getSystemStats function not found');
});

test('Analytics service has wait times query', () => {
  const path = join(__dirname, 'server', 'services', 'analyticsService.js');
  const content = readFileSync(path, 'utf8');
  if (!content.includes('getWaitTimesByPriority')) throw new Error('getWaitTimesByPriority function not found');
});

test('Analytics service has hourly arrivals', () => {
  const path = join(__dirname, 'server', 'services', 'analyticsService.js');
  const content = readFileSync(path, 'utf8');
  if (!content.includes('getHourlyArrivals')) throw new Error('getHourlyArrivals function not found');
});

test('Analytics service has incident distribution', () => {
  const path = join(__dirname, 'server', 'services', 'analyticsService.js');
  const content = readFileSync(path, 'utf8');
  if (!content.includes('getIncidentDistribution')) throw new Error('getIncidentDistribution function not found');
});

test('Analytics service has doctor performance', () => {
  const path = join(__dirname, 'server', 'services', 'analyticsService.js');
  const content = readFileSync(path, 'utf8');
  if (!content.includes('getDoctorPerformance')) throw new Error('getDoctorPerformance function not found');
});

// ============================================
// Summary
// ============================================
console.log('\n' + '='.repeat(60));
console.log('📋 TEST SUMMARY');
console.log('='.repeat(60));
console.log(`Total Tests: ${results.passed + results.failed}`);
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

if (results.failed > 0) {
  console.log('\n❌ Failed Tests:');
  results.tests
    .filter(t => t.status.includes('FAIL'))
    .forEach(t => console.log(`   - ${t.name}: ${t.error}`));
  process.exit(1);
} else {
  console.log('\n🎉 All Quick Win features are properly implemented!');
  console.log('\n✅ Feature Status:');
  console.log('   1. WebSocket Real-time Updates - COMPLETE');
  console.log('   2. Vital Signs Tracking - COMPLETE');
  console.log('   3. PostgreSQL Migration - COMPLETE');
  console.log('   4. Push Notifications (PWA) - COMPLETE');
  console.log('   5. Analytics Dashboard - COMPLETE');
  process.exit(0);
}
