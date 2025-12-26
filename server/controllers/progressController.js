const db = require('../config/db');

/**
 * Get user's progress for a course
 */
exports.getCourseProgress = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        // Get total lessons and completed lessons
        const [stats] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM course_lessons WHERE course_id = ?) as total_lessons,
                (SELECT COUNT(*) FROM lesson_progress WHERE user_id = ? AND course_id = ? AND completed = TRUE) as completed_lessons
        `, [courseId, userId, courseId]);

        // Get completed lesson IDs
        const [completed] = await db.query(`
            SELECT lesson_id FROM lesson_progress 
            WHERE user_id = ? AND course_id = ? AND completed = TRUE
        `, [userId, courseId]);

        const completedIds = completed.map(r => r.lesson_id);
        const total = stats[0].total_lessons;
        const done = stats[0].completed_lessons;
        const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

        res.json({
            success: true,
            progress: {
                total: total,
                completed: done,
                percentage: percentage,
                completedLessonIds: completedIds
            }
        });
    } catch (err) {
        console.error('Get progress error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Mark lesson as completed
 */
exports.markLessonComplete = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const userId = req.user.id;

        // Get lesson's course_id
        const [lesson] = await db.query('SELECT course_id FROM course_lessons WHERE id = ?', [lessonId]);
        if (!lesson.length) {
            return res.status(404).json({ success: false, message: 'Lesson not found' });
        }

        const courseId = lesson[0].course_id;

        // Check if user is enrolled
        const [enrollment] = await db.query(
            'SELECT id FROM purchases WHERE user_id = ? AND course_id = ?',
            [userId, courseId]
        );
        if (!enrollment.length) {
            return res.status(403).json({ success: false, message: 'Not enrolled in this course' });
        }

        // Upsert progress
        await db.query(`
            INSERT INTO lesson_progress (user_id, lesson_id, course_id, completed, completed_at)
            VALUES (?, ?, ?, TRUE, NOW())
            ON DUPLICATE KEY UPDATE completed = TRUE, completed_at = NOW()
        `, [userId, lessonId, courseId]);

        // Calculate new progress
        const [stats] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM course_lessons WHERE course_id = ?) as total,
                (SELECT COUNT(*) FROM lesson_progress WHERE user_id = ? AND course_id = ? AND completed = TRUE) as done
        `, [courseId, userId, courseId]);

        const percentage = stats[0].total > 0 ? Math.round((stats[0].done / stats[0].total) * 100) : 0;

        // Update purchase progress
        await db.query('UPDATE purchases SET progress = ? WHERE user_id = ? AND course_id = ?',
            [percentage, userId, courseId]);

        res.json({
            success: true,
            message: 'Lesson marked as complete',
            progress: percentage
        });
    } catch (err) {
        console.error('Mark complete error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Mark lesson as incomplete
 */
exports.markLessonIncomplete = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const userId = req.user.id;

        // Get lesson's course_id
        const [lesson] = await db.query('SELECT course_id FROM course_lessons WHERE id = ?', [lessonId]);
        if (!lesson.length) {
            return res.status(404).json({ success: false, message: 'Lesson not found' });
        }

        const courseId = lesson[0].course_id;

        // Update progress
        await db.query(`
            UPDATE lesson_progress SET completed = FALSE, completed_at = NULL
            WHERE user_id = ? AND lesson_id = ?
        `, [userId, lessonId]);

        // Calculate new progress
        const [stats] = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM course_lessons WHERE course_id = ?) as total,
                (SELECT COUNT(*) FROM lesson_progress WHERE user_id = ? AND course_id = ? AND completed = TRUE) as done
        `, [courseId, userId, courseId]);

        const percentage = stats[0].total > 0 ? Math.round((stats[0].done / stats[0].total) * 100) : 0;

        // Update purchase progress
        await db.query('UPDATE purchases SET progress = ? WHERE user_id = ? AND course_id = ?',
            [percentage, userId, courseId]);

        res.json({
            success: true,
            message: 'Lesson marked as incomplete',
            progress: percentage
        });
    } catch (err) {
        console.error('Mark incomplete error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
