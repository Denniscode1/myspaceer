# Enhanced Emergency Triage System (MySpaceER v2.0)

A comprehensive emergency triage system with AI-powered decision making, real-time hospital selection, queue management, and automated notifications.

## 🚨 System Overview

This enhanced version of MySpaceER implements the complete emergency triage workflow described in your specifications, featuring:

### ✅ **Implemented Core Features**

1. **Field Submission System**
   - POST `/api/reports` endpoint with immediate 201 response
   - Comprehensive validation and schema checking
   - Rate limiting protection
   - Asynchronous processing pipeline

2. **Advanced Triage Engine**
   - **Deterministic Rules**: Fast, auditable business logic
   - **ML Classifier Fallback**: Feature-based risk scoring with confidence metrics
   - **Keyword Analysis**: Natural language processing of incident descriptions
   - **Explainable AI**: Clear reasoning for all triage decisions

3. **Hospital Selection & Travel Time Estimation**
   - **Multi-factor Scoring**: Travel time, capacity, specialty matching, quality ratings
   - **Routing Integration**: OSRM support with Google Maps API ready
   - **Dynamic ETA Updates**: Real-time location tracking capability
   - **Traffic Awareness**: Time-of-day and congestion factors

4. **Priority Queue Management**
   - **Smart Positioning**: Priority-based queue ordering
   - **Wait Time Calculation**: Multi-factor estimation algorithm
   - **Automatic Reordering**: High-priority patients jump queue
   - **Capacity Optimization**: Doctor availability and hospital load factors

5. **Notification System**
   - **Multi-channel Support**: SMS, Push, Email (console mode for development)
   - **Template-based Messages**: Customizable notification templates
   - **Retry Logic**: Automatic retry with exponential backoff
   - **Queue Position Updates**: Real-time patient notifications

6. **Comprehensive Audit Trail**
   - **Event Logging**: All system events with correlation IDs
   - **User Actions**: Complete audit of manual overrides
   - **Performance Tracking**: Processing times and system metrics
   - **Compliance Ready**: HIPAA-compatible logging structure

### 🏗️ **Architecture Overview**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   EMT/App       │───▶│  API Gateway     │───▶│  Triage Engine  │
│   Submission    │    │  (Validation)    │    │  (Rules + ML)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Notifications  │◀───│   Event System   │◀───│ Hospital        │
│  (SMS/Push)     │    │  (Audit Log)     │    │ Selection       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Queue Manager  │◀───│   Database       │◀───│ Travel Time     │
│  (Priority)     │    │  (Enhanced)      │    │ Estimation      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📋 **Quick Start Guide**

### Prerequisites
- Node.js 18+ 
- NPM or Yarn
- SQLite3 (included)

### Installation

1. **Install Backend Dependencies**
```bash
cd server
npm install
```

2. **Install Frontend Dependencies**
```bash
cd ..
npm install
```

3. **Start the Enhanced Backend**
```bash
cd server
npm run dev
# or
node server-enhanced.js
```

4. **Start the Frontend**
```bash
npm run dev
```

5. **Access the System**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/api/health

## 🔧 **Configuration Options**

### Routing Provider Setup
```javascript
// server/services/travelTimeService.js
export class TravelTimeService {
  constructor() {
    this.routingProvider = 'osrm'; // 'osrm', 'google', 'here'
    this.osrmServer = 'http://router.project-osrm.org';
    // For Google Maps, add your API key
    // this.googleApiKey = 'YOUR_API_KEY';
  }
}
```

### Notification Provider Configuration
```javascript
// server/services/notificationService.js
export class NotificationService {
  constructor() {
    this.providers = {
      sms: 'console',    // 'twilio', 'console', 'disabled'
      push: 'console',   // 'firebase', 'console', 'disabled'
      email: 'disabled'  // 'smtp', 'console', 'disabled'
    };
  }
}
```

### Triage Rules Customization
Add custom rules via the database or API:
```sql
INSERT INTO triage_rules (rule_name, rule_conditions, criticality_result, priority) 
VALUES ('Custom Rule', '{"incident_type": "burns", "patient_status": "conscious"}', 'high', 6);
```

## 📚 **API Documentation**

### Core Endpoints

#### Submit Patient Report
```http
POST /api/reports
Content-Type: application/json

{
  "name": "John Doe",
  "gender": "male",
  "age_range": "31-50",
  "incident_type": "motor-vehicle-accident",
  "patient_status": "conscious",
  "transportation_mode": "ambulance",
  "latitude": 17.9714,
  "longitude": -76.7931,
  "incident_description": "Multi-vehicle collision, chest pain"
}

Response: 201 Created
{
  "success": true,
  "report_id": "RPT_1703123456_ABC123XYZ",
  "message": "Report submitted successfully",
  "processing_started": true,
  "submitted_at": "2023-12-20T15:30:45.123Z"
}
```

#### Get All Reports (with triage data)
```http
GET /api/reports

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": 1,
      "report_id": "RPT_1703123456_ABC123XYZ",
      "name": "John Doe",
      "status": "Assigned",
      "criticality": "high",
      "criticality_reason": "Rule: Motor Vehicle Accident + Age 31-50 + Ambulance = High",
      "hospital_name": "Kingston Public Hospital",
      "queue_position": 2,
      "estimated_wait_time": 1800
    }
  ],
  "count": 1
}
```

#### Update Report Status
```http
PATCH /api/reports/{reportId}/status
Content-Type: application/json

{
  "status": "Arrived",
  "user_id": "nurse_123",
  "user_role": "nurse"
}
```

#### Update Live Location
```http
POST /api/reports/{reportId}/location
Content-Type: application/json

{
  "latitude": 17.9800,
  "longitude": -76.7850,
  "speed": 45
}
```

### System Monitoring

#### Health Check
```http
GET /api/health

Response: 200 OK
{
  "success": true,
  "message": "Enhanced Emergency Triage System operational",
  "version": "2.0.0",
  "features": [
    "automated_triage",
    "hospital_selection", 
    "queue_management",
    "real_time_tracking",
    "event_logging"
  ]
}
```

#### System Statistics
```http
GET /api/stats

Response: 200 OK
{
  "success": true,
  "data": {
    "total_reports": 156,
    "status_breakdown": {
      "Created": 5,
      "Processing": 12,
      "Assigned": 28,
      "Completed": 111
    },
    "criticality_breakdown": {
      "severe": 8,
      "high": 45,
      "moderate": 67,
      "low": 36
    },
    "processing_times": {
      "avg_triage_time": "2.3s",
      "avg_assignment_time": "4.7s"
    }
  }
}
```

## 🏥 **Default Hospital Configuration**

The system comes pre-configured with Jamaica hospitals:

| Hospital | Specialties | Location |
|----------|-------------|----------|
| Kingston Public Hospital | Emergency, Trauma, Surgery, ICU | Kingston |
| Spanish Town Hospital | Emergency, General Medicine, Pediatrics | Spanish Town |
| University Hospital of the West Indies | Emergency, Trauma, Surgery, ICU, Cardiology, Neurology | Mona Campus |

## 🧠 **Triage Algorithm Details**

### Deterministic Rules (Priority Order)
1. **Shooting + Unconscious** → Severe
2. **Stabbing + Unconscious** → Severe  
3. **Any Shooting** → High
4. **Motor Vehicle Accident + Age 51+ + Ambulance** → High
5. **Keyword Detection** → Critical/High/Moderate based on terms

### ML Classifier Features
- **Incident Severity Score** (25% weight)
- **Consciousness Level** (20% weight)
- **Age Risk Factor** (15% weight)
- **Transportation Urgency** (15% weight)
- **Text Analysis** (15% weight)
- **Time of Day Risk** (10% weight)

### Hospital Scoring Algorithm
- **Travel Time** (Critical factor for severe cases)
- **Specialty Match** (Emergency, Trauma, Surgery, ICU)
- **Hospital Capacity** (Current load vs. capacity)
- **Quality Rating** (Hospital reputation score)
- **Distance Penalty** (For very distant hospitals)

## 🔧 **Development & Testing**

### Running Tests
```bash
# Backend tests (when implemented)
cd server
npm test

# Frontend tests (when implemented)
npm test
```

### Sample Data Generation
```bash
# Generate test reports
cd server
node scripts/generate-test-data.js
```

### Database Management
```bash
# View database
sqlite3 server/emergency_system.db
.schema
.tables
SELECT * FROM patient_reports LIMIT 5;
```

## 🚀 **Production Deployment**

### Environment Variables
```bash
# .env file
NODE_ENV=production
PORT=3001
DATABASE_URL=/path/to/production.db

# Routing API Keys
GOOGLE_MAPS_API_KEY=your_key_here
HERE_API_KEY=your_key_here

# Notification Services
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
FIREBASE_SERVER_KEY=your_key

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
```

### Production Considerations

1. **Database Scaling**
   - Consider PostgreSQL for production
   - Implement connection pooling
   - Set up read replicas for reporting

2. **Security Enhancements**
   - Enable HTTPS/TLS
   - Implement rate limiting per user
   - Add input sanitization
   - Enable audit logging

3. **Monitoring & Alerting**
   - Set up APM tools (New Relic, Datadog)
   - Configure error tracking (Sentry)
   - Implement health check endpoints
   - Set up log aggregation

4. **High Availability**
   - Load balancer configuration
   - Auto-scaling policies
   - Database backups
   - Disaster recovery plan

## 📊 **Monitoring Dashboards**

The system includes several monitoring endpoints:

- `/api/stats` - System statistics
- `/api/health` - Health status
- Event logs in `event_log` table
- Queue statistics per hospital
- Notification delivery metrics

## 🔍 **Troubleshooting**

### Common Issues

1. **Database Connection Issues**
```bash
# Check if database file exists
ls -la server/emergency_system.db

# Initialize database manually
cd server
node -e "import('./database-enhanced.js').then(db => db.initializeEnhancedDatabase())"
```

2. **Routing API Failures**
```bash
# Check OSRM connectivity
curl "http://router.project-osrm.org/route/v1/driving/-76.7931,17.9714;-76.7466,18.0061"
```

3. **Service Initialization**
```bash
# Enable debug logging
DEBUG=* node server-enhanced.js
```

## 🤝 **Contributing**

This system is designed to be extensible. Key areas for enhancement:

1. **Machine Learning Model Training**
2. **Additional Routing Providers**
3. **Advanced Notification Channels**
4. **Real-time Dashboard Components**
5. **Mobile App Integration**

## 📄 **License & Compliance**

- HIPAA-compatible audit logging
- GDPR-ready data handling
- Configurable data retention policies
- Secure credential management

---

## 🎯 **Implementation Status**

### ✅ Completed Features
- [x] Enhanced database schema
- [x] Report submission API with validation
- [x] Advanced triage engine (rules + ML)
- [x] Hospital selection with travel time optimization
- [x] Priority queue management
- [x] Notification system (console mode)
- [x] Comprehensive event logging
- [x] Backward compatibility with existing frontend
- [x] System monitoring and health checks

### 🚧 In Progress
- [ ] WebSocket-based real-time dashboards
- [ ] Enhanced authentication and authorization
- [ ] Message broker integration (Kafka/RabbitMQ)
- [ ] Production notification providers (Twilio, Firebase)

### 📋 Future Enhancements
- [ ] FHIR integration for HMS
- [ ] ML model training pipeline
- [ ] Mobile app with push notifications
- [ ] Advanced analytics and reporting
- [ ] Multi-language support

---

**System Version**: 2.0.0  
**Last Updated**: December 2023  
**Compatible Node.js**: 18+  
**Database**: SQLite3 (production-ready for PostgreSQL)

For technical support or feature requests, please refer to the system documentation or contact the development team.