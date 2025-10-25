import { Server } from 'socket.io';

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedClients = new Map(); // Store client connections with metadata
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: [
          'http://localhost:5173',
          'http://localhost:3000',
          'https://denniscode1.github.io',
          process.env.FRONTEND_URL
        ].filter(Boolean),
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    console.log('✅ WebSocket service initialized');
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // Handle client identification
      socket.on('identify', (data) => {
        const { userId, userRole, reportId } = data;
        this.connectedClients.set(socket.id, {
          socket,
          userId,
          userRole,
          reportId,
          connectedAt: new Date()
        });
        console.log(`👤 Client identified: ${userId} (${userRole})`);
      });

      // Subscribe to specific hospital queue updates
      socket.on('subscribe:hospital', (hospitalId) => {
        socket.join(`hospital:${hospitalId}`);
        console.log(`🏥 Client ${socket.id} subscribed to hospital ${hospitalId}`);
      });

      // Subscribe to specific patient updates
      socket.on('subscribe:patient', (reportId) => {
        socket.join(`patient:${reportId}`);
        console.log(`👨‍⚕️ Client ${socket.id} subscribed to patient ${reportId}`);
      });

      // Unsubscribe from hospital
      socket.on('unsubscribe:hospital', (hospitalId) => {
        socket.leave(`hospital:${hospitalId}`);
        console.log(`🏥 Client ${socket.id} unsubscribed from hospital ${hospitalId}`);
      });

      // Unsubscribe from patient
      socket.on('unsubscribe:patient', (reportId) => {
        socket.leave(`patient:${reportId}`);
        console.log(`👨‍⚕️ Client ${socket.id} unsubscribed from patient ${reportId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        const client = this.connectedClients.get(socket.id);
        if (client) {
          console.log(`🔌 Client disconnected: ${client.userId || socket.id}`);
          this.connectedClients.delete(socket.id);
        }
      });
    });
  }

  /**
   * Emit queue position update to specific patient
   */
  emitQueueUpdate(reportId, queueData) {
    if (!this.io) return;
    
    this.io.to(`patient:${reportId}`).emit('queue:update', {
      reportId,
      queuePosition: queueData.queue_position,
      estimatedWaitTime: queueData.estimated_wait_time,
      hospitalName: queueData.hospital_name,
      timestamp: new Date().toISOString()
    });

    console.log(`📢 Queue update sent to patient ${reportId}: position ${queueData.queue_position}`);
  }

  /**
   * Emit patient status update
   */
  emitStatusUpdate(reportId, statusData) {
    if (!this.io) return;

    this.io.to(`patient:${reportId}`).emit('status:update', {
      reportId,
      status: statusData.status,
      assignedDoctor: statusData.assigned_doctor,
      timestamp: new Date().toISOString()
    });

    console.log(`📢 Status update sent to patient ${reportId}: ${statusData.status}`);
  }

  /**
   * Emit doctor assignment notification
   */
  emitDoctorAssignment(reportId, doctorData) {
    if (!this.io) return;

    this.io.to(`patient:${reportId}`).emit('doctor:assigned', {
      reportId,
      doctorName: doctorData.doctor_name,
      doctorId: doctorData.doctor_id,
      specialties: doctorData.specialties,
      timestamp: new Date().toISOString()
    });

    console.log(`📢 Doctor assignment sent to patient ${reportId}: ${doctorData.doctor_name}`);
  }

  /**
   * Emit hospital queue update to all subscribers
   */
  emitHospitalQueueUpdate(hospitalId, queueData) {
    if (!this.io) return;

    this.io.to(`hospital:${hospitalId}`).emit('hospital:queue:update', {
      hospitalId,
      totalPatients: queueData.queue_items?.length || 0,
      queue: queueData.queue_items || [],
      timestamp: new Date().toISOString()
    });

    console.log(`📢 Hospital queue update sent for ${hospitalId}: ${queueData.queue_items?.length || 0} patients`);
  }

  /**
   * Emit new patient arrival notification to hospital staff
   */
  emitNewPatientArrival(hospitalId, patientData) {
    if (!this.io) return;

    this.io.to(`hospital:${hospitalId}`).emit('patient:new', {
      reportId: patientData.report_id,
      name: patientData.name,
      criticality: patientData.criticality,
      incidentType: patientData.incident_type,
      eta: patientData.eta,
      timestamp: new Date().toISOString()
    });

    console.log(`📢 New patient arrival notification sent to hospital ${hospitalId}`);
  }

  /**
   * Emit treatment ready notification
   */
  emitTreatmentReady(reportId, doctorName) {
    if (!this.io) return;

    this.io.to(`patient:${reportId}`).emit('treatment:ready', {
      reportId,
      doctorName,
      message: `Your doctor ${doctorName} is ready to see you now.`,
      timestamp: new Date().toISOString()
    });

    console.log(`📢 Treatment ready notification sent to patient ${reportId}`);
  }

  /**
   * Emit ambulance location update
   */
  emitAmbulanceLocation(reportId, locationData) {
    if (!this.io) return;

    this.io.to(`patient:${reportId}`).emit('ambulance:location', {
      reportId,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      speed: locationData.speed,
      eta: locationData.eta,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast system alert to all connected clients
   */
  broadcastSystemAlert(alertData) {
    if (!this.io) return;

    this.io.emit('system:alert', {
      type: alertData.type,
      message: alertData.message,
      severity: alertData.severity,
      timestamp: new Date().toISOString()
    });

    console.log(`📢 System alert broadcasted: ${alertData.message}`);
  }

  /**
   * Get connection statistics
   */
  getStats() {
    const stats = {
      totalConnections: this.connectedClients.size,
      doctors: 0,
      nurses: 0,
      patients: 0,
      other: 0
    };

    this.connectedClients.forEach((client) => {
      if (client.userRole === 'doctor') stats.doctors++;
      else if (client.userRole === 'nurse') stats.nurses++;
      else if (client.userRole === 'patient') stats.patients++;
      else stats.other++;
    });

    return stats;
  }
}

// Singleton instance
export const websocketService = new WebSocketService();
