# WebSocket Real-Time Updates - Implementation Guide

## Overview
Real-time bidirectional communication between server and clients using Socket.IO.

## Features Implemented ✅

### Server-Side (`server/services/websocketService.js`)
- ✅ WebSocket server initialization with Socket.IO
- ✅ Client identification and authentication
- ✅ Room-based subscriptions (hospitals, patients)
- ✅ Real-time event emitters for:
  - Queue position updates
  - Patient status changes
  - Doctor assignments
  - Hospital queue updates
  - New patient arrivals
  - Treatment ready notifications
  - Ambulance location tracking
  - System alerts

### Client-Side
- ✅ Custom React hook (`src/hooks/useWebSocket.js`)
- ✅ Notification toast component (`src/components/RealtimeNotifications.jsx`)
- ✅ Auto-reconnection on disconnect
- ✅ Subscription management

## Usage Examples

### 1. Dashboard - Monitor Hospital Queue in Real-Time

```jsx
import { useWebSocket } from '../hooks/useWebSocket';
import { RealtimeNotifications } from '../components/RealtimeNotifications';

function Dashboard({ user }) {
  const {
    isConnected,
    hospitalQueueUpdate,
    newPatientArrival,
    clearHospitalQueueUpdate,
    clearNewPatientArrival
  } = useWebSocket({
    userId: user.id,
    userRole: user.role, // 'doctor' or 'nurse'
    hospitalId: user.hospitalId // e.g., 'HOSP001'
  });

  // Update UI when queue changes
  useEffect(() => {
    if (hospitalQueueUpdate) {
      setQueueData(hospitalQueueUpdate.queue);
    }
  }, [hospitalQueueUpdate]);

  // Show alert for new patient arrivals
  useEffect(() => {
    if (newPatientArrival) {
      playNotificationSound();
    }
  }, [newPatientArrival]);

  return (
    <div>
      <div>WebSocket: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      
      <RealtimeNotifications
        hospitalQueueUpdate={hospitalQueueUpdate}
        newPatientArrival={newPatientArrival}
        onClear={{ clearHospitalQueueUpdate, clearNewPatientArrival }}
      />
      
      {/* Your dashboard UI */}
    </div>
  );
}
```

### 2. Patient Form - Track Your Queue Position

```jsx
import { useWebSocket } from '../hooks/useWebSocket';
import { RealtimeNotifications } from '../components/RealtimeNotifications';

function PatientStatus({ reportId }) {
  const {
    isConnected,
    queueUpdate,
    statusUpdate,
    doctorAssignment,
    treatmentReady,
    clearQueueUpdate,
    clearStatusUpdate,
    clearDoctorAssignment,
    clearTreatmentReady
  } = useWebSocket({
    userRole: 'patient',
    reportId: reportId // e.g., 'RPT_1234567890_ABC'
  });

  return (
    <div>
      <h2>Your Emergency Status</h2>
      <p>Connection: {isConnected ? '🟢 Live' : '🔴 Offline'}</p>
      
      {queueUpdate && (
        <div className="queue-info">
          <h3>Queue Position: #{queueUpdate.queuePosition}</h3>
          <p>Hospital: {queueUpdate.hospitalName}</p>
          <p>Estimated Wait: {Math.round(queueUpdate.estimatedWaitTime / 60)} minutes</p>
        </div>
      )}
      
      <RealtimeNotifications
        queueUpdate={queueUpdate}
        statusUpdate={statusUpdate}
        doctorAssignment={doctorAssignment}
        treatmentReady={treatmentReady}
        onClear={{ 
          clearQueueUpdate, 
          clearStatusUpdate, 
          clearDoctorAssignment,
          clearTreatmentReady 
        }}
      />
    </div>
  );
}
```

### 3. Multi-Hospital Monitoring

```jsx
function HospitalMonitor() {
  const { 
    subscribeToHospital, 
    unsubscribeFromHospital,
    hospitalQueueUpdate 
  } = useWebSocket({
    userId: 'admin',
    userRole: 'admin'
  });

  const [selectedHospital, setSelectedHospital] = useState('HOSP001');

  const switchHospital = (newHospitalId) => {
    unsubscribeFromHospital(selectedHospital);
    subscribeToHospital(newHospitalId);
    setSelectedHospital(newHospitalId);
  };

  return (
    <div>
      <select onChange={(e) => switchHospital(e.target.value)}>
        <option value="HOSP001">Kingston Public Hospital</option>
        <option value="HOSP002">Spanish Town Hospital</option>
        <option value="HOSP003">University Hospital</option>
      </select>
      
      {hospitalQueueUpdate && (
        <div>Total Patients: {hospitalQueueUpdate.totalPatients}</div>
      )}
    </div>
  );
}
```

## Server Events Emitted

### Queue Updates
```javascript
websocketService.emitQueueUpdate(reportId, {
  queue_position: 3,
  estimated_wait_time: 5400, // seconds
  hospital_name: 'Kingston Public Hospital'
});
```

### Status Updates
```javascript
websocketService.emitStatusUpdate(reportId, {
  status: 'InTreatment',
  assigned_doctor: 'Dr. Sarah Williams'
});
```

### Doctor Assignment
```javascript
websocketService.emitDoctorAssignment(reportId, {
  doctor_name: 'Dr. Michael Brown',
  doctor_id: 'DOC002',
  specialties: ['emergency_medicine', 'cardiology']
});
```

### Hospital Queue Update
```javascript
websocketService.emitHospitalQueueUpdate(hospitalId, {
  queue_items: [
    { report_id: 'RPT_001', name: 'John Doe', queue_position: 1 },
    { report_id: 'RPT_002', name: 'Jane Smith', queue_position: 2 }
  ]
});
```

### New Patient Arrival
```javascript
websocketService.emitNewPatientArrival(hospitalId, {
  report_id: 'RPT_003',
  name: 'Bob Johnson',
  criticality: 'severe',
  incident_type: 'shooting',
  eta: '2025-01-15T14:30:00Z'
});
```

### Treatment Ready
```javascript
websocketService.emitTreatmentReady(reportId, 'Dr. Sarah Williams');
```

### System Alert
```javascript
websocketService.broadcastSystemAlert({
  type: 'system_maintenance',
  message: 'System will undergo maintenance in 30 minutes',
  severity: 'warning'
});
```

## Testing WebSocket Connection

### 1. Start the server
```powershell
cd server
npm start
```

### 2. Check WebSocket endpoint
Console output should show:
```
✅ WebSocket service initialized
⚡ WebSocket: ws://localhost:3001
```

### 3. Monitor connections
Server logs will show:
```
🔌 Client connected: abc123
👤 Client identified: doctor001 (doctor)
🏥 Client abc123 subscribed to hospital HOSP001
```

### 4. Test real-time updates
Submit a new patient report and watch:
- Hospital dashboard updates automatically
- Patient sees queue position in real-time
- Doctor receives new arrival notification

## Performance Considerations

- **Reconnection**: Auto-reconnects with exponential backoff (1-5 seconds)
- **Room Isolation**: Clients only receive updates for subscribed hospitals/patients
- **Notification Throttling**: Toast notifications auto-dismiss after 10 seconds
- **Connection Pooling**: Socket.IO manages connection pooling automatically

## Security

- ✅ CORS configured for allowed origins only
- ✅ Client identification required for sensitive updates
- ✅ Room-based access control (subscribe only to authorized resources)
- 🚧 TODO: Add JWT authentication for WebSocket connections

## Next Steps

1. **Add Authentication**: Implement JWT token validation for WebSocket connections
2. **Add Encryption**: Encrypt sensitive messages (patient PHI)
3. **Add Rate Limiting**: Prevent WebSocket spam/abuse
4. **Add Analytics**: Track WebSocket usage metrics
5. **Add Offline Queue**: Store updates when client is offline, sync on reconnect

## Troubleshooting

### Client not receiving updates?
1. Check if client is connected: Look for `isConnected: true`
2. Verify subscriptions: Check console for "subscribed to..." messages
3. Check server logs: Ensure events are being emitted

### Connection dropping frequently?
1. Check network stability
2. Verify CORS settings match your frontend URL
3. Increase reconnection attempts in `useWebSocket.js`

### Updates delayed?
1. Check server load
2. Monitor network latency
3. Verify event handlers are not blocking

## API Reference

See `/server/services/websocketService.js` for complete API documentation.
