const db = require('../config/db');

// Get all lessons for a course
exports.getLessons = async (req, res) => {
    try {
        const [lessons] = await db.query(
            'SELECT id, title, order_index FROM course_lessons WHERE course_id = ? ORDER BY order_index ASC',
            [req.params.courseId]
        );
        res.json({ success: true, lessons });
    } catch (err) {
        console.error('Get lessons error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get single lesson with full content
exports.getLesson = async (req, res) => {
    try {
        const [lessons] = await db.query(
            `SELECT l.*, c.title as course_title, c.user_id as course_owner_id 
             FROM course_lessons l 
             JOIN courses c ON l.course_id = c.id 
             WHERE l.id = ?`,
            [req.params.id]
        );
        if (lessons.length === 0) {
            return res.status(404).json({ success: false, message: 'Lesson not found' });
        }

        // Get prev/next lessons
        const lesson = lessons[0];
        const [allLessons] = await db.query(
            'SELECT id, title, order_index FROM course_lessons WHERE course_id = ? ORDER BY order_index ASC',
            [lesson.course_id]
        );

        const currentIndex = allLessons.findIndex(l => l.id === lesson.id);
        const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
        const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

        res.json({
            success: true,
            lesson,
            prevLesson,
            nextLesson,
            totalLessons: allLessons.length,
            currentIndex: currentIndex + 1
        });
    } catch (err) {
        console.error('Get lesson error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Create lesson (course owner only)
exports.createLesson = async (req, res) => {
    try {
        const { course_id, title, content, video_url } = req.body;

        if (!course_id || !title) {
            return res.status(400).json({ success: false, message: 'Course ID and title are required' });
        }

        // Check if user owns the course
        const [courses] = await db.query('SELECT user_id FROM courses WHERE id = ?', [course_id]);
        if (courses.length === 0) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        // Check permission
        const { getEffectiveRole } = require('./usersController');
        const userRole = await getEffectiveRole(req.user.id);
        if (courses[0].user_id !== req.user.id && userRole !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Get next order index
        const [maxOrder] = await db.query(
            'SELECT MAX(order_index) as max_order FROM course_lessons WHERE course_id = ?',
            [course_id]
        );
        const nextOrder = (maxOrder[0].max_order || 0) + 1;

        const [result] = await db.query(
            'INSERT INTO course_lessons (course_id, title, content, video_url, order_index) VALUES (?, ?, ?, ?, ?)',
            [course_id, title, content || '', video_url || null, nextOrder]
        );

        res.status(201).json({ success: true, message: 'Lesson created', lessonId: result.insertId });
    } catch (err) {
        console.error('Create lesson error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Update lesson
exports.updateLesson = async (req, res) => {
    try {
        const { title, content, video_url, order_index } = req.body;

        // Get lesson and check ownership
        const [lessons] = await db.query(
            `SELECT l.*, c.user_id as course_owner_id 
             FROM course_lessons l 
             JOIN courses c ON l.course_id = c.id 
             WHERE l.id = ?`,
            [req.params.id]
        );

        if (lessons.length === 0) {
            return res.status(404).json({ success: false, message: 'Lesson not found' });
        }

        const { getEffectiveRole } = require('./usersController');
        const userRole = await getEffectiveRole(req.user.id);
        if (lessons[0].course_owner_id !== req.user.id && userRole !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await db.query(
            'UPDATE course_lessons SET title = ?, content = ?, video_url = ?, order_index = ? WHERE id = ?',
            [
                title || lessons[0].title,
                content !== undefined ? content : lessons[0].content,
                video_url !== undefined ? video_url : lessons[0].video_url,
                order_index !== undefined ? order_index : lessons[0].order_index,
                req.params.id
            ]
        );

        res.json({ success: true, message: 'Lesson updated' });
    } catch (err) {
        console.error('Update lesson error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Delete lesson
exports.deleteLesson = async (req, res) => {
    try {
        const [lessons] = await db.query(
            `SELECT l.*, c.user_id as course_owner_id 
             FROM course_lessons l 
             JOIN courses c ON l.course_id = c.id 
             WHERE l.id = ?`,
            [req.params.id]
        );

        if (lessons.length === 0) {
            return res.status(404).json({ success: false, message: 'Lesson not found' });
        }

        const { getEffectiveRole } = require('./usersController');
        const userRole = await getEffectiveRole(req.user.id);
        if (lessons[0].course_owner_id !== req.user.id && userRole !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await db.query('DELETE FROM course_lessons WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Lesson deleted' });
    } catch (err) {
        console.error('Delete lesson error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
