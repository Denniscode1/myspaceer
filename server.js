// Railway-compatible server entry point
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Basic middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://denniscode1.github.io',
    'https://myspaceer-production.up.railway.app'
  ],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, 'dist');
  app.use(express.static(distPath));
  console.log(`📦 Serving static files from: ${distPath}`);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'MySpaceER API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'MySpaceER API',
    message: 'Emergency Response System Backend',
    status: 'running',
    endpoints: {
      health: '/api/health',
      reports: '/api/reports',
      patients: '/api/patients'
    }
  });
});

// Import and mount the enhanced server
try {
  // Import the enhanced server app
  const { default: enhancedApp } = await import('./server/server-enhanced.js');
  
  // Remove the basic health endpoint since enhanced server has it
  app._router = undefined;
  
  // Re-setup basic middleware
  app.use(cors({
    origin: [
      'http://localhost:5173',
      'https://denniscode1.github.io',
      process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null,
      process.env.FRONTEND_URL
    ].filter(Boolean),
    credentials: true
  }));
  
  // Mount the enhanced server routes
  app.use('/', enhancedApp);
  
  console.log('✅ Enhanced server loaded successfully');
  
} catch (error) {
  console.error('❌ Could not load enhanced server:', error);
  console.log('🔄 Running in basic mode with fallback endpoints');
  
  // Fallback endpoints
  app.get('/api/reports', (req, res) => {
    res.json({
      success: true,
      data: [],
      message: 'Reports endpoint working (fallback mode)'
    });
  });

  app.post('/api/reports', (req, res) => {
    console.log('Received report submission:', req.body);
    res.json({
      success: true,
      report_id: `RPT-${Date.now()}`,
      message: 'Report submitted successfully (fallback mode)',
      data: req.body
    });
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// Serve frontend for all other routes in production (SPA fallback)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });
} else {
  // 404 handler for development
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
      path: req.originalUrl
    });
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MySpaceER API server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;