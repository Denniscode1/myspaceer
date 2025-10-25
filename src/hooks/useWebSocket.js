import { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Custom hook for WebSocket real-time updates
 * @param {Object} options - Configuration options
 * @param {string} options.userId - User ID for identification
 * @param {string} options.userRole - User role (doctor, nurse, patient)
 * @param {string} options.reportId - Patient report ID to subscribe to
 * @param {string} options.hospitalId - Hospital ID to subscribe to
 */
export const useWebSocket = (options = {}) => {
  const { userId, userRole, reportId, hospitalId } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [queueUpdate, setQueueUpdate] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState(null);
  const [doctorAssignment, setDoctorAssignment] = useState(null);
  const [hospitalQueueUpdate, setHospitalQueueUpdate] = useState(null);
  const [newPatientArrival, setNewPatientArrival] = useState(null);
  const [treatmentReady, setTreatmentReady] = useState(null);
  const [ambulanceLocation, setAmbulanceLocation] = useState(null);
  const [systemAlert, setSystemAlert] = useState(null);
  
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('🔌 WebSocket connected:', socket.id);
      setIsConnected(true);
      
      // Identify client to server
      if (userId || userRole) {
        socket.emit('identify', { userId, userRole, reportId });
      }
      
      // Subscribe to relevant channels
      if (hospitalId) {
        socket.emit('subscribe:hospital', hospitalId);
      }
      if (reportId) {
        socket.emit('subscribe:patient', reportId);
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Real-time event handlers
    socket.on('queue:update', (data) => {
      console.log('📢 Queue update received:', data);
      setQueueUpdate(data);
    });

    socket.on('status:update', (data) => {
      console.log('📢 Status update received:', data);
      setStatusUpdate(data);
    });

    socket.on('doctor:assigned', (data) => {
      console.log('📢 Doctor assignment received:', data);
      setDoctorAssignment(data);
    });

    socket.on('hospital:queue:update', (data) => {
      console.log('📢 Hospital queue update received:', data);
      setHospitalQueueUpdate(data);
    });

    socket.on('patient:new', (data) => {
      console.log('📢 New patient arrival:', data);
      setNewPatientArrival(data);
    });

    socket.on('treatment:ready', (data) => {
      console.log('📢 Treatment ready notification:', data);
      setTreatmentReady(data);
    });

    socket.on('ambulance:location', (data) => {
      console.log('📢 Ambulance location update:', data);
      setAmbulanceLocation(data);
    });

    socket.on('system:alert', (data) => {
      console.log('📢 System alert:', data);
      setSystemAlert(data);
    });

    // Cleanup on unmount
    return () => {
      if (hospitalId) {
        socket.emit('unsubscribe:hospital', hospitalId);
      }
      if (reportId) {
        socket.emit('unsubscribe:patient', reportId);
      }
      socket.disconnect();
    };
  }, [userId, userRole, reportId, hospitalId]);

  // Helper function to subscribe to a hospital
  const subscribeToHospital = useCallback((newHospitalId) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('subscribe:hospital', newHospitalId);
    }
  }, []);

  // Helper function to unsubscribe from a hospital
  const unsubscribeFromHospital = useCallback((oldHospitalId) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('unsubscribe:hospital', oldHospitalId);
    }
  }, []);

  // Helper function to subscribe to a patient
  const subscribeToPatient = useCallback((newReportId) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('subscribe:patient', newReportId);
    }
  }, []);

  // Helper function to unsubscribe from a patient
  const unsubscribeFromPatient = useCallback((oldReportId) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('unsubscribe:patient', oldReportId);
    }
  }, []);

  return {
    isConnected,
    queueUpdate,
    statusUpdate,
    doctorAssignment,
    hospitalQueueUpdate,
    newPatientArrival,
    treatmentReady,
    ambulanceLocation,
    systemAlert,
    subscribeToHospital,
    unsubscribeFromHospital,
    subscribeToPatient,
    unsubscribeFromPatient,
    // Clear functions to reset state
    clearQueueUpdate: () => setQueueUpdate(null),
    clearStatusUpdate: () => setStatusUpdate(null),
    clearDoctorAssignment: () => setDoctorAssignment(null),
    clearHospitalQueueUpdate: () => setHospitalQueueUpdate(null),
    clearNewPatientArrival: () => setNewPatientArrival(null),
    clearTreatmentReady: () => setTreatmentReady(null),
    clearAmbulanceLocation: () => setAmbulanceLocation(null),
    clearSystemAlert: () => setSystemAlert(null)
  };
};
