# Patient Data Management System

This system now includes a SQLite database backend to ensure patient data persistence.

## Setup Instructions

### 1. Install Backend Dependencies

Navigate to the server directory and install dependencies:

```bash
cd server
npm install
```

### 2. Start the Backend Server

```bash
# For development with auto-reload
npm run dev

# Or for production
npm start
```

The backend server will start on `http://localhost:3001`

### 3. Start the Frontend (in a new terminal)

Navigate back to the root directory and start the frontend:

```bash
cd ..
npm run dev
```

The frontend will start on `http://localhost:5173`

## Database Features

- **SQLite Database**: Lightweight, file-based database that stores all patient data
- **Automatic Schema Creation**: Database tables are created automatically on first run
- **Data Persistence**: Patient data survives page refreshes and server restarts
- **RESTful API**: Complete CRUD operations for patient management

## Database Schema

The patient database includes fields for:
- Basic Information: firstName, lastName, gender
- Medical Data: symptoms, medications, allergies, vital signs
- Emergency Details: triage level, incident type, patient status
- Timestamps: creation and update times

## API Endpoints

- `GET /api/patients` - Get all patients
- `GET /api/patients/:id` - Get specific patient
- `POST /api/patients` - Create new patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient
- `GET /api/health` - Health check

## File Structure

```
MySpaceER/
├── server/                 # Backend API server
│   ├── package.json       # Backend dependencies
│   ├── server.js          # Express server
│   ├── database.js        # Database operations
│   └── patients.db        # SQLite database (created automatically)
├── src/
│   ├── services/
│   │   └── apiService.js  # Frontend API client
│   ├── pages/
│   │   ├── form/
│   │   └── dashboard/
│   └── App.jsx            # Updated with database integration
└── package.json           # Frontend dependencies
```

## Error Handling

- **Connection Errors**: The system shows user-friendly error messages if the database is unavailable
- **Data Validation**: Both frontend and backend validate patient data
- **Graceful Degradation**: The frontend works even when the backend is offline (with error notifications)

## Troubleshooting

1. **"Database connection unavailable"**: Make sure the backend server is running on port 3001
2. **"Failed to save patient data"**: Check the server console for detailed error messages
3. **Port conflicts**: You can change the backend port by setting `PORT=3002` environment variable