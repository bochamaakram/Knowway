const db = require('../config/db');

/**
 * Get quiz for a course
 */
exports.getQuiz = async (req, res) => {
    try {
        const { courseId } = req.params;

        // Get quiz
        const [quizzes] = await db.query(
            'SELECT * FROM course_quizzes WHERE course_id = ?',
            [courseId]
        );

        if (!quizzes.length) {
            return res.json({ success: true, quiz: null });
        }

        const quiz = quizzes[0];

        // Get questions (don't include correct_index for security)
        const [questions] = await db.query(
            'SELECT id, question, options, order_index FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index',
            [quiz.id]
        );

        // Parse options JSON
        quiz.questions = questions.map(q => ({
            ...q,
            options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
        }));

        res.json({ success: true, quiz });
    } catch (err) {
        console.error('Get quiz error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Submit quiz answers
 */
exports.submitQuiz = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { quizId } = req.params;
        const { answers } = req.body; // { questionId: selectedIndex, ... }
        const userId = req.user.id;

        // Get quiz info
        const [quizzes] = await connection.query(
            'SELECT * FROM course_quizzes WHERE id = ?',
            [quizId]
        );
        if (!quizzes.length) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Quiz not found' });
        }

        const quiz = quizzes[0];

        // Check if enrolled
        const [purchases] = await connection.query(
            'SELECT * FROM purchases WHERE user_id = ? AND course_id = ?',
            [userId, quiz.course_id]
        );
        if (!purchases.length) {
            await connection.rollback();
            return res.status(403).json({ success: false, message: 'Not enrolled in this course' });
        }

        // Get all questions with correct answers
        const [questions] = await connection.query(
            'SELECT id, correct_index FROM quiz_questions WHERE quiz_id = ?',
            [quizId]
        );

        if (!questions.length) {
            await connection.rollback();
            return res.status(400).json({ success: false, message: 'Quiz has no questions' });
        }

        // Calculate score
        let correct = 0;
        questions.forEach(q => {
            if (answers[q.id] === q.correct_index) {
                correct++;
            }
        });

        const score = Math.round((correct / questions.length) * 100);
        const passed = score >= quiz.passing_score;

        // Record attempt
        await connection.query(
            'INSERT INTO quiz_attempts (user_id, quiz_id, course_id, score, passed, answers) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, quizId, quiz.course_id, score, passed, JSON.stringify(answers)]
        );

        // If passed, update purchase
        if (passed) {
            await connection.query(
                'UPDATE purchases SET quiz_passed = TRUE, quiz_score = ? WHERE user_id = ? AND course_id = ?',
                [score, userId, quiz.course_id]
            );
        }

        await connection.commit();

        res.json({
            success: true,
            score,
            passed,
            passingScore: quiz.passing_score,
            correct,
            total: questions.length,
            message: passed ? 'Congratulations! You passed!' : `You need ${quiz.passing_score}% to pass. Try again!`
        });
    } catch (err) {
        await connection.rollback();
        console.error('Submit quiz error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    } finally {
        connection.release();
    }
};

/**
 * Get user's quiz attempts for a course
 */
exports.getAttempts = async (req, res) => {
    try {
        const { courseId } = req.params;
        const [attempts] = await db.query(
            'SELECT * FROM quiz_attempts WHERE user_id = ? AND course_id = ? ORDER BY completed_at DESC',
            [req.user.id, courseId]
        );
        res.json({ success: true, attempts });
    } catch (err) {
        console.error('Get attempts error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

/**
 * Create or update quiz for a course (teacher/admin only)
 */
exports.saveQuiz = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const { courseId } = req.params;
        const { title, passingScore, questions } = req.body;
        const userId = req.user.id;

        // Check if user owns the course or is admin
        const [courses] = await connection.query(
            'SELECT user_id FROM courses WHERE id = ?',
            [courseId]
        );
        if (!courses.length) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        const [userRole] = await connection.query('SELECT role FROM users WHERE id = ?', [userId]);
        if (courses[0].user_id !== userId && userRole[0].role !== 'super_admin') {
            await connection.rollback();
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // Check if quiz exists
        const [existing] = await connection.query(
            'SELECT id FROM course_quizzes WHERE course_id = ?',
            [courseId]
        );

        let quizId;
        if (existing.length) {
            // Update existing quiz
            quizId = existing[0].id;
            await connection.query(
                'UPDATE course_quizzes SET title = ?, passing_score = ? WHERE id = ?',
                [title || 'Final Quiz', passingScore || 85, quizId]
            );
            // Delete old questions
            await connection.query('DELETE FROM quiz_questions WHERE quiz_id = ?', [quizId]);
        } else {
            // Create new quiz
            const [result] = await connection.query(
                'INSERT INTO course_quizzes (course_id, title, passing_score) VALUES (?, ?, ?)',
                [courseId, title || 'Final Quiz', passingScore || 85]
            );
            quizId = result.insertId;
        }

        // Insert questions
        if (questions && questions.length) {
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                await connection.query(
                    'INSERT INTO quiz_questions (quiz_id, question, options, correct_index, order_index) VALUES (?, ?, ?, ?, ?)',
                    [quizId, q.question, JSON.stringify(q.options), q.correctIndex, i]
                );
            }
        }

        await connection.commit();
        res.json({ success: true, quizId, message: 'Quiz saved successfully' });
    } catch (err) {
        await connection.rollback();
        console.error('Save quiz error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    } finally {
        connection.release();
    }
};
