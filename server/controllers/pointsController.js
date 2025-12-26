const db = require('../config/db');

/**
 * Get user's point balance
 */
exports.getBalance = async (req, res) => {
    try {
        const [users] = await db.query('SELECT points FROM users WHERE id = ?', [req.user.id]);
        if (!users.length) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, points: users[0].points });
    } catch (err) {
        console.error('Get balance error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Get point transaction history
 */
exports.getHistory = async (req, res) => {
    try {
        const [transactions] = await db.query(`
            SELECT pt.*, c.title as course_title 
            FROM point_transactions pt 
            LEFT JOIN courses c ON pt.course_id = c.id 
            WHERE pt.user_id = ? 
            ORDER BY pt.created_at DESC 
            LIMIT 50
        `, [req.user.id]);

        res.json({ success: true, transactions });
    } catch (err) {
        console.error('Get history error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Purchase course with points
 */
exports.purchaseCourse = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { courseId } = req.params;
        const userId = req.user.id;

        // Get course info
        const [courses] = await connection.query(
            'SELECT id, title, is_free, point_cost FROM courses WHERE id = ?',
            [courseId]
        );
        if (!courses.length) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        const course = courses[0];

        // Check if already purchased
        const [existing] = await connection.query(
            'SELECT id FROM purchases WHERE user_id = ? AND course_id = ?',
            [userId, courseId]
        );
        if (existing.length) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Already enrolled' });
        }

        // Get user points
        const [users] = await connection.query('SELECT points FROM users WHERE id = ?', [userId]);
        const userPoints = users[0].points;

        // Check if user has enough points (free courses cost 0)
        const cost = course.is_free ? 0 : course.point_cost;
        if (userPoints < cost) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: `Not enough points. You need ${cost} points but have ${userPoints}.`
            });
        }

        // Deduct points
        if (cost > 0) {
            await connection.query(
                'UPDATE users SET points = points - ? WHERE id = ?',
                [cost, userId]
            );

            // Record transaction
            await connection.query(
                'INSERT INTO point_transactions (user_id, amount, type, course_id, description) VALUES (?, ?, ?, ?, ?)',
                [userId, -cost, 'course_purchase', courseId, `Enrolled in: ${course.title}`]
            );
        }

        // Create purchase
        await connection.query(
            'INSERT INTO purchases (user_id, course_id, points_paid) VALUES (?, ?, ?)',
            [userId, courseId, cost]
        );

        // Update course student count
        await connection.query(
            'UPDATE courses SET total_students = total_students + 1 WHERE id = ?',
            [courseId]
        );

        await connection.commit();

        res.json({
            success: true,
            message: cost > 0 ? `Enrolled for ${cost} points` : 'Enrolled successfully',
            pointsSpent: cost
        });
    } catch (err) {
        await connection.rollback();
        console.error('Purchase error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    } finally {
        connection.release();
    }
};

/**
 * Complete course and award points (called after passing quiz)
 */
exports.completeCourse = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { courseId } = req.params;
        const userId = req.user.id;

        // Get purchase
        const [purchases] = await connection.query(
            'SELECT * FROM purchases WHERE user_id = ? AND course_id = ?',
            [userId, courseId]
        );
        if (!purchases.length) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Not enrolled' });
        }

        const purchase = purchases[0];
        if (purchase.completed_at) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Already completed' });
        }

        if (!purchase.quiz_passed) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Must pass quiz first' });
        }

        // Get course info
        const [courses] = await connection.query(
            'SELECT * FROM courses WHERE id = ?',
            [courseId]
        );
        const course = courses[0];

        // Calculate reward
        let reward;
        if (course.is_free) {
            reward = course.points_reward || 500;
        } else {
            // Paid course: return cost + 25%
            reward = Math.round(purchase.points_paid * 1.25);
        }

        // Award points
        await connection.query(
            'UPDATE users SET points = points + ? WHERE id = ?',
            [reward, userId]
        );

        // Record transaction
        await connection.query(
            'INSERT INTO point_transactions (user_id, amount, type, course_id, description) VALUES (?, ?, ?, ?, ?)',
            [userId, reward, 'course_complete', courseId, `Completed: ${course.title}`]
        );

        // Mark purchase as completed
        await connection.query(
            'UPDATE purchases SET completed_at = NOW(), progress = 100 WHERE user_id = ? AND course_id = ?',
            [userId, courseId]
        );

        await connection.commit();

        res.json({
            success: true,
            message: `Course completed! Earned ${reward} points`,
            pointsEarned: reward
        });
    } catch (err) {
        await connection.rollback();
        console.error('Complete course error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    } finally {
        connection.release();
    }
};
