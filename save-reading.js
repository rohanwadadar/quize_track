// netlify/functions/save-reading.js
const { Pool } = require('pg');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    // Configure CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        // Parse the incoming data
        const data = JSON.parse(event.body);
        
        // ✅ Use YOUR Neon database connection string
        const connectionString = 'postgresql://neondb_owner:npg_POn7GruH2UWm@ep-round-dust-aekr3wpp-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require';
        
        // Create connection pool
        const pool = new Pool({
            connectionString: connectionString,
            ssl: {
                rejectUnauthorized: false
            }
        });
        
        // Create table if it doesn't exist
        await pool.query(`
            CREATE TABLE IF NOT EXISTS zodiac_readings (
                id SERIAL PRIMARY KEY,
                session_id VARCHAR(100) UNIQUE NOT NULL,
                birth_month INTEGER NOT NULL,
                zodiac_sign VARCHAR(50),
                spirit_animal VARCHAR(50),
                spirit_animal_emoji VARCHAR(10),
                quote TEXT,
                author VARCHAR(100),
                prediction TEXT,
                good_point1 VARCHAR(100),
                good_point2 VARCHAR(100),
                good_point3 VARCHAR(100),
                good_point4 VARCHAR(100),
                has_photo BOOLEAN DEFAULT FALSE,
                location_available BOOLEAN DEFAULT FALSE,
                device_type VARCHAR(50),
                browser VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Get zodiac quote and points from your data
        const zodiacData = {
            1: { quote: "Go confidently in the direction of your dreams...", author: "Henry David Thoreau", points: ["Ambitious goal-setting", "Disciplined approach", "Innovative thinking", "Strong work ethic"] },
            2: { quote: "The quieter you become, the more you are able to hear.", author: "Rumi", points: ["Deep intuition", "Creative expression", "Empathetic nature", "Resilient spirit"] },
            3: { quote: "If nothing ever changed, there would be no butterflies.", author: "Unknown", points: ["Transformative energy", "Passionate drive", "Open-mindedness", "Creative potential"] },
            4: { quote: "What you do makes a difference...", author: "Jane Goodall", points: ["Natural leadership", "Practical wisdom", "Strategic thinking", "Hopeful outlook"] },
            5: { quote: "What you think, you become...", author: "Buddha", points: ["Grounded nature", "Dynamic energy", "Creative manifestation", "Intellectual growth"] },
            6: { quote: "Happiness is not something ready-made...", author: "Dalai Lama", points: ["Intellectual depth", "Emotional intelligence", "Joy-seeking nature", "Sage wisdom"] },
            7: { quote: "Peace cannot be kept by force...", author: "Albert Einstein", points: ["Intuitive nature", "Radiant personality", "Harmony-seeking", "Emotional depth"] },
            8: { quote: "You are braver than you believe...", author: "A.A. Milne", points: ["Courageous spirit", "Inner strength", "Intellectual sharpness", "Self-love capacity"] },
            9: { quote: "To live is the rarest thing...", author: "Oscar Wilde", points: ["Analytical mind", "Diplomatic skills", "Intentional living", "Spiritual awareness"] },
            10: { quote: "You must do the thing you think you cannot do.", author: "Eleanor Roosevelt", points: ["Charming personality", "Transformative power", "Courage to overcome", "Hidden talents"] },
            11: { quote: "Letting go gives us freedom...", author: "Thich Nhat Hanh", points: ["Soulful depth", "Philosophical mind", "Freedom-seeking", "Transformative release"] },
            12: { quote: "Wherever you go, go with all your heart.", author: "Confucius", points: ["Adventurous spirit", "Ambitious drive", "Wholehearted living", "Fresh perspective"] }
        };
        
        const monthData = zodiacData[data.birth_month] || zodiacData[1];
        
        // Insert data into database
        const result = await pool.query(
            `INSERT INTO zodiac_readings (
                session_id, 
                birth_month, 
                zodiac_sign, 
                spirit_animal, 
                spirit_animal_emoji,
                quote,
                author,
                prediction,
                good_point1,
                good_point2,
                good_point3,
                good_point4,
                has_photo,
                location_available,
                device_type,
                browser
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id`,
            [
                data.session_id,
                data.birth_month,
                data.zodiac_sign,
                data.spirit_animal,
                data.spirit_animal_emoji,
                monthData.quote,
                monthData.author,
                "This year marks a turning point in your life journey. Expect unexpected opportunities that will lead to personal growth.",
                monthData.points[0],
                monthData.points[1],
                monthData.points[2],
                monthData.points[3],
                data.has_photo || false,
                data.location_available || false,
                data.device_type || 'Unknown',
                data.browser || 'Unknown'
            ]
        );
        
        // Close the connection
        await pool.end();
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                success: true, 
                recordId: result.rows[0].id,
                message: 'Data saved to Neon PostgreSQL database successfully!'
            })
        };
        
    } catch (error) {
        console.error('Database error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                success: false, 
                error: error.message,
                details: 'Failed to save to Neon database'
            })
        };
    }
};
