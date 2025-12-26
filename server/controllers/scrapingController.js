const db = require('../config/db');

// Trigger n8n scraping webhook (auth required)
exports.triggerScraping = async (req, res) => {
    try {
        const { url, category } = req.body;
        const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;

        if (!n8nWebhookUrl) {
            return res.status(500).json({ success: false, message: 'n8n webhook URL not configured' });
        }

        if (!url) {
            return res.status(400).json({ success: false, message: 'URL is required' });
        }

        // Call n8n webhook
        const response = await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url,
                category: category || 'general',
                userId: req.user.id,
                timestamp: new Date().toISOString()
            })
        });

        if (response.ok) {
            res.json({ success: true, message: 'Scraping triggered successfully' });
        } else {
            res.status(500).json({ success: false, message: 'Failed to trigger n8n webhook' });
        }
    } catch (err) {
        console.error('Scraping trigger error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Receive scraped data from n8n (webhook endpoint)
exports.receiveScrapedData = async (req, res) => {
    try {
        const { title, content, source_url, category, userId } = req.body;

        await db.query(
            'INSERT INTO scraped_data (title, content, source_url, category, user_id) VALUES (?, ?, ?, ?, ?)',
            [title || 'Untitled', content || '', source_url || '', category || 'general', userId || null]
        );

        res.json({ success: true, message: 'Data saved' });
    } catch (err) {
        console.error('Save scraped data error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get all scraped data (public)
exports.getScrapedData = async (req, res) => {
    try {
        const { category, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = 'SELECT sd.*, u.username as scraped_by FROM scraped_data sd LEFT JOIN users u ON sd.user_id = u.id WHERE 1=1';
        let params = [];

        if (category) {
            query += ' AND sd.category = ?';
            params.push(category);
        }

        query += ' ORDER BY sd.scraped_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const [data] = await db.query(query, params);
        const [countResult] = await db.query('SELECT COUNT(*) as total FROM scraped_data');

        res.json({
            success: true,
            data,
            total: countResult[0].total
        });
    } catch (err) {
        console.error('Get scraped data error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get my scraped data (auth required)
exports.getMyScrapedData = async (req, res) => {
    try {
        const [data] = await db.query(
            'SELECT * FROM scraped_data WHERE user_id = ? ORDER BY scraped_at DESC',
            [req.user.id]
        );
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Delete scraped data (auth required, owner only)
exports.deleteScrapedData = async (req, res) => {
    try {
        const [result] = await db.query(
            'DELETE FROM scraped_data WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Not found or unauthorized' });
        }
        res.json({ success: true, message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
