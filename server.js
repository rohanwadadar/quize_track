// server.js - Complete backend for Zodiac Fortune App
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ✅ YOUR Neon PostgreSQL database connection
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:npg_POn7GruH2UWm@ep-round-dust-aekr3wpp-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require',
    ssl: { rejectUnauthorized: false }
});

// Test database connection
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ 
            status: 'healthy', 
            database: 'connected',
            message: 'Neon PostgreSQL database is connected!',
            timestamp: new Date().toISOString() 
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'unhealthy', 
            error: error.message 
        });
    }
});

// ✅ MAIN ENDPOINT: Save zodiac reading
app.post('/api/save-reading', async (req, res) => {
    try {
        const {
            session_id,
            birth_month,
            zodiac_sign,
            spirit_animal,
            spirit_animal_emoji,
            has_photo = false,
            location_available = false,
            device_type = 'Unknown',
            browser = 'Unknown',
            timestamp
        } = req.body;

        // Validate required fields
        if (!session_id || !birth_month) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: session_id and birth_month'
            });
        }

        // Insert into Neon database
        const result = await pool.query(
            `INSERT INTO zodiac_readings 
            (session_id, birth_month, zodiac_sign, spirit_animal, spirit_animal_emoji,
             has_photo, location_available, device_type, browser) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, created_at`,
            [
                session_id,
                birth_month,
                zodiac_sign,
                spirit_animal,
                spirit_animal_emoji,
                has_photo,
                location_available,
                device_type,
                browser.substring(0, 100) // Limit browser length
            ]
        );

        res.json({
            success: true,
            recordId: result.rows[0].id,
            createdAt: result.rows[0].created_at,
            message: 'Zodiac reading saved to Neon PostgreSQL successfully!'
        });

    } catch (error) {
        console.error('Database error:', error);
        
        // Check if it's a duplicate session_id error
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({
                success: false,
                error: 'This reading has already been saved'
            });
        }
        
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ✅ Get all readings (optional - for admin panel)
app.get('/api/readings', async (req, res) => {
    try {
        const limit = req.query.limit || 50;
        const result = await pool.query(
            'SELECT * FROM zodiac_readings ORDER BY created_at DESC LIMIT $1',
            [limit]
        );
        
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ Get statistics (optional)
app.get('/api/stats', async (req, res) => {
    try {
        const total = await pool.query('SELECT COUNT(*) as count FROM zodiac_readings');
        const byMonth = await pool.query(
            'SELECT birth_month, COUNT(*) as count FROM zodiac_readings GROUP BY birth_month ORDER BY birth_month'
        );
        const photos = await pool.query('SELECT COUNT(*) as count FROM zodiac_readings WHERE has_photo = true');
        
        res.json({
            success: true,
            totalReadings: parseInt(total.rows[0].count),
            byMonth: byMonth.rows,
            photosTaken: parseInt(photos.rows[0].count),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ Serve frontend HTML (optional - for all-in-one deployment)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Zodiac Fortune App</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; text-align: center; }
                h1 { color: #667eea; }
                .endpoint { background: #f5f5f5; padding: 10px; margin: 10px; border-radius: 5px; }
            </style>
        </head>
        <body>
            <h1>🎯 Zodiac Fortune Backend API</h1>
            <p>Your Neon PostgreSQL database is connected and running!</p>
            
            <div class="endpoint">
                <strong>GET /api/health</strong><br>
                Health check and database connection test
            </div>
            
            <div class="endpoint">
                <strong>POST /api/save-reading</strong><br>
                Save zodiac reading to database
            </div>
            
            <div class="endpoint">
                <strong>GET /api/readings</strong><br>
                Get all saved readings
            </div>
            
            <div class="endpoint">
                <strong>GET /api/stats</strong><br>
                Get statistics
            </div>
            
            <p>Frontend: <a href="/frontend">/frontend</a> (if deployed)</p>
            <p>Database: Neon PostgreSQL (connected)</p>
        </body>
        </html>
    `);
});

// Start server
app.listen(PORT, () => {
    console.log(`
    🚀 Zodiac Fortune Backend Server Started!
    📍 Port: ${PORT}
    💾 Database: Neon PostgreSQL (Connected)
    
    🔗 Endpoints:
    - Health Check: http://localhost:${PORT}/api/health
    - Save Reading: http://localhost:${PORT}/api/save-reading
    - Get Readings: http://localhost:${PORT}/api/readings
    - Get Stats: http://localhost:${PORT}/api/stats
    
    ⚡ Frontend: Update BACKEND_URL in index.html to: http://localhost:${PORT}/api
    `);
});
