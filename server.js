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

// Import and mount the enhanced server API routes
try {
  // Import the enhanced server app
  const { default: enhancedApp } = await import('./server/server-enhanced.js');
  
  // Mount ALL enhanced server routes (already includes /api/* endpoints)
  app.use(enhancedApp);
  
  console.log('✅ Enhanced server loaded successfully');
  
} catch (error) {
  console.error('❌ Could not load enhanced server:', error);
  console.log('🔄 Running in basic mode with fallback endpoints');
  
  // Fallback health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      success: true, 
      message: 'MySpaceER API is running (fallback)',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });
  
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
app.use((error, req, res, _next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// Serve frontend for all non-API routes (SPA fallback)
// This handles all routes that aren't /api/* routes
app.get('*', (req, res) => {
  // Only serve HTML for non-API routes
  if (!req.path.startsWith('/api')) {
    if (process.env.NODE_ENV === 'production') {
      res.sendFile(join(__dirname, 'dist', 'index.html'));
    } else {
      res.json({
        message: 'Development mode - use Vite dev server for frontend',
        api_base: `http://localhost:${PORT}/api`
      });
    }
  } else {
    // 404 for unknown API routes
    res.status(404).json({
      success: false,
      error: 'API endpoint not found',
      path: req.originalUrl
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MySpaceER API server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;