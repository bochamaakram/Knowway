const db = require('../config/db');

exports.addFavorite = async (req, res) => {
    try {
        await db.query('INSERT IGNORE INTO favorites (user_id, course_id) VALUES (?, ?)', [req.user.id, req.params.courseId]);
        res.json({ success: true, message: 'Added to favorites' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.removeFavorite = async (req, res) => {
    try {
        await db.query('DELETE FROM favorites WHERE user_id = ? AND course_id = ?', [req.user.id, req.params.courseId]);
        res.json({ success: true, message: 'Removed from favorites' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getMyFavorites = async (req, res) => {
    try {
        const [favorites] = await db.query(
            `SELECT c.*, u.username as author FROM favorites f 
             JOIN courses c ON f.course_id = c.id 
             LEFT JOIN users u ON c.user_id = u.id 
             WHERE f.user_id = ? ORDER BY f.created_at DESC`,
            [req.user.id]
        );
        res.json({ success: true, favorites });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getMyFavoriteIds = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT course_id FROM favorites WHERE user_id = ?', [req.user.id]);
        res.json({ success: true, favoriteIds: rows.map(r => r.course_id) });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
