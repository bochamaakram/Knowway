const db = require('../config/db');

/**
 * Legacy purchase function - now redirects to points-based purchase
 * This endpoint is kept for backwards compatibility but uses points system
 */
exports.purchaseCourse = async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const userId = req.user.id;

        // Get course info
        const [courses] = await db.query('SELECT id, title, is_free, point_cost FROM courses WHERE id = ?', [courseId]);
        if (courses.length === 0) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        const course = courses[0];

        // Check if already purchased
        const [existing] = await db.query(
            'SELECT id FROM purchases WHERE user_id = ? AND course_id = ?',
            [userId, courseId]
        );
        if (existing.length) {
            return res.status(400).json({ success: false, message: 'Already enrolled' });
        }

        // Get user points
        const [users] = await db.query('SELECT points FROM users WHERE id = ?', [userId]);
        const userPoints = users[0].points;

        // Check if user has enough points (free courses cost 0)
        const cost = course.is_free ? 0 : course.point_cost;
        if (userPoints < cost) {
            return res.status(400).json({
                success: false,
                message: `Not enough points. You need ${cost} points but have ${userPoints}.`
            });
        }

        // Deduct points
        if (cost > 0) {
            await db.query(
                'UPDATE users SET points = points - ? WHERE id = ?',
                [cost, userId]
            );

            // Record transaction
            await db.query(
                'INSERT INTO point_transactions (user_id, amount, type, course_id, description) VALUES (?, ?, ?, ?, ?)',
                [userId, -cost, 'course_purchase', courseId, `Enrolled in: ${course.title}`]
            );
        }

        // Insert purchase
        await db.query(
            'INSERT INTO purchases (user_id, course_id, points_paid) VALUES (?, ?, ?)',
            [userId, courseId, cost]
        );

        // Increment total_students
        await db.query('UPDATE courses SET total_students = total_students + 1 WHERE id = ?', [courseId]);

        res.json({
            success: true,
            message: cost > 0 ? `Enrolled for ${cost} points` : 'Enrolled successfully',
            pointsSpent: cost
        });
    } catch (err) {
        console.error('Purchase error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getMyPurchases = async (req, res) => {
    try {
        const [purchases] = await db.query(
            `SELECT c.*, u.username as author, p.progress, p.points_paid, p.quiz_passed, p.quiz_score, p.created_at as purchased_at
             FROM purchases p
             JOIN courses c ON p.course_id = c.id
             LEFT JOIN users u ON c.user_id = u.id
             WHERE p.user_id = ?
             ORDER BY p.created_at DESC`,
            [req.user.id]
        );
        res.json({ success: true, purchases });
    } catch (err) {
        console.error('Get purchases error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getMyPurchaseIds = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT course_id FROM purchases WHERE user_id = ?', [req.user.id]);
        res.json({ success: true, purchaseIds: rows.map(r => r.course_id) });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateProgress = async (req, res) => {
    try {
        const { progress } = req.body;
        await db.query(
            'UPDATE purchases SET progress = ? WHERE user_id = ? AND course_id = ?',
            [progress, req.user.id, req.params.courseId]
        );
        res.json({ success: true, message: 'Progress updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
