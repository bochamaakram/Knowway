/**
 * Points Controller
 * ==================
 * Handles the points/gamification system.
 * Points can be earned by completing courses and spent to enroll in paid courses.
 */

const supabase = require('../config/database');

/**
 * Get User's Points Balance
 * @route GET /api/points/balance
 */
exports.getBalance = async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('points')
            .eq('id', req.user.id);

        if (error) throw error;

        res.json({ success: true, points: users?.[0]?.points || 0 });
    } catch (err) {
        console.error('Get balance error:', err);
        res.status(500).json({ success: false, message: 'Failed to get points balance' });
    }
};

/**
 * Get Points Transaction History
 * @route GET /api/points/history
 */
exports.getHistory = async (req, res) => {
    try {
        const { data: transactions, error } = await supabase
            .from('point_transactions')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, transactions: transactions || [] });
    } catch (err) {
        console.error('Get history error:', err);
        res.status(500).json({ success: false, message: 'Failed to get transaction history' });
    }
};

/**
 * Purchase/Enroll in a Course
 * Deducts points for paid courses
 * @route POST /api/points/purchase/:courseId
 */
exports.purchaseCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        // Validate courseId
        if (!courseId || isNaN(courseId)) {
            return res.status(400).json({ success: false, message: 'Invalid course ID' });
        }

        // Get course details
        const { data: courses, error: courseError } = await supabase
            .from('courses')
            .select('id, title, is_free, point_cost')
            .eq('id', courseId);

        if (courseError) throw courseError;

        if (!courses || courses.length === 0) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        const course = courses[0];

        // Check if already enrolled
        const { data: existing, error: existingError } = await supabase
            .from('purchases')
            .select('id')
            .eq('user_id', userId)
            .eq('course_id', courseId);

        if (existingError) throw existingError;

        if (existing && existing.length > 0) {
            return res.status(400).json({ success: false, message: 'You are already enrolled in this course' });
        }

        // Get user's current points
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('points')
            .eq('id', userId);

        if (userError) throw userError;

        const userPoints = users?.[0]?.points || 0;
        const cost = course.is_free ? 0 : (course.point_cost || 0);

        // Check if user has enough points
        if (userPoints < cost) {
            return res.status(400).json({
                success: false,
                message: `Not enough points. You need ${cost} points but have ${userPoints}.`
            });
        }

        // Deduct points if course is paid
        if (cost > 0) {
            const { error: updateError } = await supabase
                .from('users')
                .update({ points: userPoints - cost })
                .eq('id', userId);

            if (updateError) throw updateError;

            // Record transaction
            await supabase.from('point_transactions').insert({
                user_id: userId,
                amount: -cost,
                type: 'course_purchase',
                course_id: parseInt(courseId),
                description: `Enrolled in: ${course.title}`
            });
        }

        // Create purchase record
        const { error: purchaseError } = await supabase
            .from('purchases')
            .insert({
                user_id: userId,
                course_id: parseInt(courseId),
                points_paid: cost
            });

        if (purchaseError) throw purchaseError;

        res.json({
            success: true,
            message: cost > 0 ? `Enrolled for ${cost} points` : 'Enrolled successfully',
            pointsSpent: cost
        });
    } catch (err) {
        console.error('Purchase error:', err);
        res.status(500).json({ success: false, message: 'Failed to enroll in course. Please try again.' });
    }
};

/**
 * Complete Course and Claim Reward
 * Awards points for completing a course.
 * Courses WITH quiz: must pass quiz first
 * Courses WITHOUT quiz: must complete all lessons
 * @route POST /api/points/complete/:courseId
 */
exports.completeCourse = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        // Validate courseId
        if (!courseId || isNaN(courseId)) {
            return res.status(400).json({ success: false, message: 'Invalid course ID' });
        }

        // Check if user is enrolled
        const { data: purchases, error: purchaseError } = await supabase
            .from('purchases')
            .select('*')
            .eq('user_id', userId)
            .eq('course_id', courseId);

        if (purchaseError) throw purchaseError;

        if (!purchases || purchases.length === 0) {
            return res.status(400).json({ success: false, message: 'You are not enrolled in this course' });
        }

        const purchase = purchases[0];

        // Check if already completed
        if (purchase.completed_at) {
            return res.status(400).json({ success: false, message: 'You have already claimed the reward for this course' });
        }

        // Check if course has a quiz
        const { data: quizzes, error: quizError } = await supabase
            .from('course_quizzes')
            .select('id')
            .eq('course_id', courseId);

        if (quizError) throw quizError;

        const hasQuiz = quizzes && quizzes.length > 0;

        if (hasQuiz) {
            // Course HAS a quiz - must pass it
            if (!purchase.quiz_passed) {
                return res.status(400).json({
                    success: false,
                    message: 'You must pass the quiz before claiming your reward'
                });
            }
        } else {
            // Course has NO quiz - check if all lessons are completed
            const { data: lessons, error: lessonError } = await supabase
                .from('course_lessons')
                .select('id')
                .eq('course_id', courseId);

            if (lessonError) throw lessonError;

            if (!lessons || lessons.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'This course has no content to complete'
                });
            }

            // Get completed lessons
            const { data: completedLessons, error: progressError } = await supabase
                .from('lesson_progress')
                .select('lesson_id')
                .eq('user_id', userId)
                .eq('course_id', courseId)
                .eq('completed', true);

            if (progressError) throw progressError;

            const completedIds = (completedLessons || []).map(l => l.lesson_id);
            const allCompleted = lessons.every(l => completedIds.includes(l.id));

            if (!allCompleted) {
                const remaining = lessons.length - completedIds.length;
                return res.status(400).json({
                    success: false,
                    message: `Complete all lessons first. ${remaining} lesson${remaining > 1 ? 's' : ''} remaining.`
                });
            }
        }

        // Get course details for reward calculation
        const { data: courses, error: courseError } = await supabase
            .from('courses')
            .select('*')
            .eq('id', courseId);

        if (courseError) throw courseError;

        if (!courses || courses.length === 0) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        const course = courses[0];

        // Calculate reward
        let reward;
        if (course.is_free) {
            reward = course.points_reward || 500;
        } else {
            // Paid courses: 25% bonus on points paid
            reward = Math.round((purchase.points_paid || 0) * 1.25);
            reward = Math.max(reward, 100); // Minimum 100 points
        }

        // Get current points
        const { data: users, error: userError } = await supabase
            .from('users')
            .select('points')
            .eq('id', userId);

        if (userError) throw userError;

        const currentPoints = users?.[0]?.points || 0;

        // Add points to user
        const { error: updateError } = await supabase
            .from('users')
            .update({ points: currentPoints + reward })
            .eq('id', userId);

        if (updateError) throw updateError;

        // Record transaction
        await supabase.from('point_transactions').insert({
            user_id: userId,
            amount: reward,
            type: 'course_complete',
            course_id: parseInt(courseId),
            description: `Completed: ${course.title}`
        });

        // Mark course as completed
        await supabase
            .from('purchases')
            .update({ completed_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('course_id', courseId);

        res.json({
            success: true,
            message: `Congratulations! You earned ${reward} points!`,
            pointsEarned: reward
        });
    } catch (err) {
        console.error('Complete course error:', err);
        res.status(500).json({ success: false, message: 'Failed to complete course. Please try again.' });
    }
};
