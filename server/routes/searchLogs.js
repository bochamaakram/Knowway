/**
 * Search Logs Routes
 * API endpoints for viewing search logs in admin panel
 */
const express = require('express');
const router = express.Router();
const supabase = require('../config/database');
const auth = require('../middleware/auth');

/**
 * GET /api/search-logs
 * Get search logs with pagination (requires authentication only - admin.html has its own access control)
 */
router.get('/', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Get total count
        const { count } = await supabase
            .from('search_logs')
            .select('*', { count: 'exact', head: true });

        // Get paginated data
        const { data: logs, error } = await supabase
            .from('search_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.json({
            success: true,
            logs: logs || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });
    } catch (error) {
        console.error('Get search logs error:', error);
        res.status(500).json({ success: false, message: 'Failed to get search logs' });
    }
});

module.exports = router;
