const db = require('../config/db');

exports.getCourses = async (req, res) => {
    try {
        const { page = 1, limit = 6, search, category, level, status } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = `SELECT c.*, u.username as author FROM courses c LEFT JOIN users u ON c.user_id = u.id WHERE 1=1`;
        let countQuery = `SELECT COUNT(*) as total FROM courses c WHERE 1=1`;
        let params = [];
        let countParams = [];

        if (status) { query += ' AND c.status = ?'; countQuery += ' AND c.status = ?'; params.push(status); countParams.push(status); }
        if (category) { query += ' AND c.category = ?'; countQuery += ' AND c.category = ?'; params.push(category); countParams.push(category); }
        if (level) { query += ' AND c.level = ?'; countQuery += ' AND c.level = ?'; params.push(level); countParams.push(level); }
        if (search) { query += ' AND (c.title LIKE ? OR u.username LIKE ?)'; countQuery += ' AND c.title LIKE ?'; const s = `%${search}%`; params.push(s, s); countParams.push(s); }

        query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), offset);

        const [courses] = await db.query(query, params);
        const [countResult] = await db.query(countQuery, countParams);
        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / parseInt(limit));

        res.json({
            success: true,
            courses,
            pagination: { currentPage: parseInt(page), totalPages, totalItems, hasNextPage: page < totalPages, hasPrevPage: page > 1 }
        });
    } catch (err) {
        console.error('Get courses error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getCourse = async (req, res) => {
    try {
        const [courses] = await db.query('SELECT c.*, u.username as author FROM courses c LEFT JOIN users u ON c.user_id = u.id WHERE c.id = ?', [req.params.id]);
        if (courses.length === 0) return res.status(404).json({ success: false, message: 'Course not found' });
        res.json({ success: true, course: courses[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.createCourse = async (req, res) => {
    try {
        // Check if user has permission to create courses using helper function
        const { getEffectiveRole } = require('./usersController');
        const userRole = await getEffectiveRole(req.user.id);

        if (userRole !== 'super_admin' && userRole !== 'teacher') {
            return res.status(403).json({ success: false, message: 'Only teachers and admins can create courses' });
        }

        const { title, description, short_description, category = 'dev', duration = 0, is_free = true, point_cost = 0, points_reward = 500, level = 'beginner', image_url } = req.body;
        if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

        const [result] = await db.query(
            'INSERT INTO courses (title, description, short_description, category, duration, is_free, point_cost, points_reward, level, image_url, user_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [title, description || '', short_description || '', category, duration, is_free, point_cost, points_reward, level, image_url || null, req.user.id, 'active']
        );

        res.status(201).json({ success: true, message: 'Course created', courseId: result.insertId });
    } catch (err) {
        console.error('Create course error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateCourse = async (req, res) => {
    try {
        const { title, description, short_description, category, duration, is_free, point_cost, points_reward, level, status, image_url, what_you_learn } = req.body;
        const [courses] = await db.query('SELECT * FROM courses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (courses.length === 0) return res.status(404).json({ success: false, message: 'Course not found or unauthorized' });

        const c = courses[0];
        await db.query(
            `UPDATE courses SET title = ?, description = ?, short_description = ?, category = ?, duration = ?, 
             is_free = ?, point_cost = ?, points_reward = ?, level = ?, status = ?, image_url = ?, what_you_learn = ? WHERE id = ?`,
            [
                title || c.title,
                description ?? c.description,
                short_description ?? c.short_description,
                category || c.category,
                duration ?? c.duration,
                is_free ?? c.is_free,
                point_cost ?? c.point_cost,
                points_reward ?? c.points_reward,
                level || c.level,
                status || c.status,
                image_url ?? c.image_url,
                what_you_learn ?? c.what_you_learn,
                req.params.id
            ]
        );

        res.json({ success: true, message: 'Course updated' });
    } catch (err) {
        console.error('Update course error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.deleteCourse = async (req, res) => {
    try {
        const [result] = await db.query('DELETE FROM courses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Course not found or unauthorized' });
        res.json({ success: true, message: 'Course deleted' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
