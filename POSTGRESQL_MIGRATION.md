# PostgreSQL Migration Guide

## Overview
This guide helps you migrate from SQLite to PostgreSQL for production deployment.

## Why PostgreSQL?

### SQLite Limitations
❌ Single-writer bottleneck  
❌ No replication/failover  
❌ File corruption risk  
❌ Poor concurrent write performance  
❌ No network isolation  

### PostgreSQL Benefits
✅ **Multi-user concurrency** - Handle 1000s of simultaneous connections  
✅ **ACID compliant** - Transaction safety guaranteed  
✅ **Replication** - Master-slave for high availability  
✅ **Connection pooling** - Efficient resource management  
✅ **Advanced indexing** - B-tree, Hash, GiST, GIN indexes  
✅ **JSON support** - JSONB for complex data structures  
✅ **Full-text search** - Built-in search capabilities  
✅ **Partitioning** - Table partitioning for large datasets  

---

## 🚀 Quick Start

###  1. Install PostgreSQL

#### Windows
```powershell
# Download from https://www.postgresql.org/download/windows/
# Or use Chocolatey
choco install postgresql

# Verify installation
psql --version
```

#### Mac
```bash
brew install postgresql@15
brew services start postgresql@15
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database

```powershell
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE myspaceer_db;

# Create user (optional)
CREATE USER myspaceer_user WITH PASSWORD 'secure_password_here';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE myspaceer_db TO myspaceer_user;

# Exit
\q
```

### 3. Configure Environment

```powershell
# Copy environment template
Copy-Item server\.env.example server\.env

# Edit server/.env
```

```env
# Change this line:
DB_TYPE=postgres

# Update PostgreSQL credentials:
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myspaceer_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password
```

### 4. Initialize PostgreSQL Schema

```powershell
cd server
node -e "import('./database-postgres.js').then(db => db.initializePostgresDatabase().then(() => db.seedPostgresData()).then(() => process.exit(0)))"
```

### 5. Update Server to Use PostgreSQL

The system automatically detects `DB_TYPE` from `.env`:
- `DB_TYPE=sqlite` → Uses SQLite (development)
- `DB_TYPE=postgres` → Uses PostgreSQL (production)

### 6. Start Server

```powershell
cd server
npm start

# Expected output:
# ✅ Connected to PostgreSQL database
# ✅ PostgreSQL database schema created successfully
# ✅ PostgreSQL default data seeded successfully
# 🚀 Server running on port 3001
```

---

## 📊 Schema Overview

### Tables Created (13 total)

| Table | Purpose | Key Features |
|-------|---------|--------------|
| **patient_reports** | Main patient data | Vital signs, status tracking |
| **triage_results** | AI triage decisions | Confidence scores, reasoning |
| **hospitals** | Hospital registry | Capacity, specialties (JSONB) |
| **travel_estimates** | ETA calculations | Route data, traffic factors |
| **hospital_assignments** | Patient-hospital mapping | Assignment scores |
| **patient_queue** | Queue management | Priority sorting, wait times |
| **doctor_shifts** | Staff scheduling | Availability, specialties (JSONB) |
| **event_log** | Audit trail | Event data (JSONB), indexed |
| **notification_queue** | Notification tracking | Retry logic, status |
| **treated_patients** | Treatment history | Outcomes, satisfaction |
| **triage_rules** | Business rules | Conditions (JSONB), priority |

### Key Indexes for Performance

```sql
-- Patient reports (most queried table)
idx_patient_reports_report_id    -- Unique lookups
idx_patient_reports_status       -- Filter by status
idx_patient_reports_hospital     -- Filter by hospital

-- Queue management
idx_patient_queue_hospital       -- Hospital + status composite

-- Event logging
idx_event_log_entity             -- Entity lookups
idx_event_log_timestamp          -- Time-based queries

-- Triage results
idx_triage_results_report_id     -- Fast joins
```

---

## 🔄 Data Migration (SQLite → PostgreSQL)

### Option 1: Manual Export/Import

#### Step 1: Export from SQLite
```powershell
# Export to CSV
sqlite3 server/emergency_system.db

.mode csv
.headers on
.output patient_reports.csv
SELECT * FROM patient_reports;
.output hospitals.csv
SELECT * FROM hospitals;
# ... repeat for other tables
.quit
```

#### Step 2: Import to PostgreSQL
```powershell
psql -U postgres -d myspaceer_db

\copy patient_reports FROM 'patient_reports.csv' CSV HEADER;
\copy hospitals FROM 'hospitals.csv' CSV HEADER;
# ... repeat for other tables
```

### Option 2: Automated Migration Script

Create `server/migrations/migrate-sqlite-to-postgres.js`:

```javascript
import sqlite3 from 'sqlite3';
import { getClient } from '../database-postgres.js';

async function migrateSQLiteToPostgres() {
  const sqliteDb = new sqlite3.Database('./emergency_system.db');
  const pgClient = await getClient();

  try {
    await pgClient.query('BEGIN');

    // Migrate patient_reports
    const patients = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM patient_reports', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const patient of patients) {
      await pgClient.query(`
        INSERT INTO patient_reports (...)
        VALUES ($1, $2, ...)
        ON CONFLICT (report_id) DO NOTHING
      `, [patient.report_id, patient.name, ...]);
    }

    // Repeat for other tables...

    await pgClient.query('COMMIT');
    console.log('✅ Migration completed successfully');
  } catch (error) {
    await pgClient.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
  } finally {
    pgClient.release();
    sqliteDb.close();
  }
}
```

---

## 🔧 Connection Pooling

PostgreSQL uses connection pooling for efficiency:

```javascript
// Configured in database-postgres.js
const pool = new Pool({
  max: 20,                    // Max connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000 // Timeout for new connections
});
```

### Pool Monitoring

```javascript
// Check pool stats
console.log('Total clients:', pool.totalCount);
console.log('Idle clients:', pool.idleCount);
console.log('Waiting clients:', pool.waitingCount);
```

---

## 🔐 Security Best Practices

### 1. Use Environment Variables
```env
# NEVER commit real credentials
DB_PASSWORD=use_strong_password_here
```

### 2. Enable SSL/TLS (Production)
```javascript
const pool = new Pool({
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/ca-certificate.crt').toString(),
  }
});
```

### 3. Restrict Database Access
```sql
-- Create limited user for app
CREATE USER myspaceer_app WITH PASSWORD 'strong_password';

-- Grant only necessary permissions
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO myspaceer_app;

-- No DROP, ALTER, or TRUNCATE
```

### 4. Use Prepared Statements
```javascript
// ✅ GOOD - Prevents SQL injection
await pool.query('SELECT * FROM patients WHERE id = $1', [patientId]);

// ❌ BAD - Vulnerable to injection
await pool.query(`SELECT * FROM patients WHERE id = ${patientId}`);
```

---

## 📈 Performance Tuning

### 1. Analyze Query Performance

```sql
-- Enable query timing
\timing on

-- Explain query plan
EXPLAIN ANALYZE
SELECT * FROM patient_reports
WHERE status = 'Assigned'
ORDER BY created_at DESC;

-- Look for:
-- - Seq Scan (bad) vs Index Scan (good)
-- - High execution time
-- - Missing indexes
```

### 2. Create Custom Indexes

```sql
-- Index for common searches
CREATE INDEX idx_reports_status_hospital 
ON patient_reports(status, assigned_hospital_id);

-- Partial index for active patients only
CREATE INDEX idx_active_patients 
ON patient_reports(status)
WHERE status IN ('Created', 'Processing', 'Assigned');

-- Full-text search on descriptions
CREATE INDEX idx_incident_description_fts
ON patient_reports USING gin(to_tsvector('english', incident_description));
```

### 3. Optimize Database Settings

```sql
-- In postgresql.conf or via ALTER SYSTEM

-- Increase shared buffers (25% of RAM)
shared_buffers = 2GB

-- Increase work_mem for sorting
work_mem = 16MB

-- Enable parallel queries
max_parallel_workers_per_gather = 4

-- Tune autovacuum
autovacuum = on
autovacuum_vacuum_scale_factor = 0.1
```

---

## 🔍 Monitoring & Maintenance

### Daily Health Checks

```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('myspaceer_db'));

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Check slow queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '1 minute';
```

### Regular Maintenance

```sql
-- Vacuum and analyze (weekly)
VACUUM ANALYZE;

-- Reindex (monthly)
REINDEX DATABASE myspaceer_db;

-- Update statistics
ANALYZE;
```

---

## 🚨 Backup & Recovery

### Automated Daily Backups

```powershell
# Create backup script: backup.ps1
$date = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "C:\backups\myspaceer_$date.sql"

pg_dump -U postgres -d myspaceer_db -F c -f $backupFile

# Keep only last 7 days
Get-ChildItem C:\backups\myspaceer_*.sql | 
  Where-Object {$_.CreationTime -lt (Get-Date).AddDays(-7)} | 
  Remove-Item

Write-Host "✅ Backup completed: $backupFile"
```

### Schedule with Task Scheduler

```powershell
# Run daily at 2 AM
$action = New-ScheduledTaskAction -Execute 'PowerShell.exe' -Argument '-File C:\scripts\backup.ps1'
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "MySpaceER_Backup" -Description "Daily PostgreSQL backup"
```

### Restore from Backup

```powershell
# Restore database
pg_restore -U postgres -d myspaceer_db -c C:\backups\myspaceer_20250115_020000.sql

# Or create new database from backup
createdb myspaceer_restored
pg_restore -U postgres -d myspaceer_restored C:\backups\myspaceer_20250115_020000.sql
```

---

## 🧪 Testing PostgreSQL Setup

### 1. Test Connection

```powershell
node -e "import('pg').then(pg => { const client = new pg.Client({ connectionString: 'postgresql://postgres:password@localhost:5432/myspaceer_db' }); client.connect().then(() => console.log('✅ Connected')).catch(err => console.error('❌ Error:', err)); });"
```

### 2. Test Query Performance

```javascript
import { query } from './database-postgres.js';

// Insert test
console.time('Insert 1000 patients');
for (let i = 0; i < 1000; i++) {
  await query(`
    INSERT INTO patient_reports (report_id, name, gender, age_range, incident_type, patient_status, transportation_mode, submitted_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [`TEST_${i}`, 'Test Patient', 'male', '26-50', 'other', 'conscious', 'self-carry', new Date()]);
}
console.timeEnd('Insert 1000 patients');

// Query test
console.time('Select 1000 patients');
const result = await query('SELECT * FROM patient_reports LIMIT 1000');
console.timeEnd('Select 1000 patients');
console.log(`Fetched ${result.rows.length} records`);
```

---

## 🐛 Troubleshooting

### Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution**:
```powershell
# Check if PostgreSQL is running
Get-Service postgresql*

# Start if stopped
Start-Service postgresql-x64-15
```

### Authentication Failed
```
Error: password authentication failed for user "postgres"
```
**Solution**:
```powershell
# Reset password
psql -U postgres
ALTER USER postgres PASSWORD 'new_password';
```

### Permission Denied
```
Error: permission denied for table patient_reports
```
**Solution**:
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO myspaceer_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO myspaceer_user;
```

---

## 📚 Additional Resources

- [PostgreSQL Official Docs](https://www.postgresql.org/docs/)
- [Node-postgres (pg) Guide](https://node-postgres.com/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Backup & Recovery Best Practices](https://www.postgresql.org/docs/current/backup.html)

---

## ✅ Migration Checklist

- [ ] Install PostgreSQL
- [ ] Create database and user
- [ ] Copy `.env.example` to `.env`
- [ ] Configure `DB_TYPE=postgres` in `.env`
- [ ] Run schema initialization
- [ ] Test connection
- [ ] Migrate existing data (if any)
- [ ] Set up automated backups
- [ ] Configure monitoring
- [ ] Test application end-to-end
- [ ] Update documentation

---

**Last Updated**: 2025-01-15  
**PostgreSQL Version**: 15+  
**Node.js Version**: 18+
