const supabase = require('../config/database');

exports.getCourseProgress = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        // Get all lessons for course
        const { data: lessons } = await supabase
            .from('course_lessons')
            .select('id')
            .eq('course_id', courseId);

        // Get completed lessons
        const { data: progress } = await supabase
            .from('lesson_progress')
            .select('lesson_id')
            .eq('user_id', userId)
            .eq('course_id', courseId)
            .eq('completed', true);

        // Check if course is already completed (reward claimed)
        const { data: purchase } = await supabase
            .from('purchases')
            .select('completed_at')
            .eq('user_id', userId)
            .eq('course_id', courseId)
            .single();

        const completedLessonIds = progress?.map(p => p.lesson_id) || [];
        const totalLessons = lessons?.length || 0;
        const completedCount = completedLessonIds.length;
        const percentComplete = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
        const courseCompleted = !!purchase?.completed_at;

        res.json({
            success: true,
            progress: { completedLessonIds, totalLessons, completedCount, percentComplete, courseCompleted }
        });
    } catch (err) {
        console.error('Get progress error:', err);
        res.status(500).json({ success: false, message: 'Failed to get progress' });
    }
};

exports.markLessonComplete = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const userId = req.user.id;

        // Get lesson to find course_id
        const { data: lessons } = await supabase.from('course_lessons').select('course_id').eq('id', lessonId);
        if (!lessons || lessons.length === 0) {
            return res.status(404).json({ success: false, message: 'Lesson not found' });
        }

        const courseId = lessons[0].course_id;

        // Check enrollment
        const { data: purchases } = await supabase.from('purchases').select('id').eq('user_id', userId).eq('course_id', courseId);
        if (!purchases || purchases.length === 0) {
            return res.status(403).json({ success: false, message: 'Must be enrolled' });
        }

        // Upsert progress
        const { data: existing } = await supabase.from('lesson_progress').select('id').eq('user_id', userId).eq('lesson_id', lessonId);

        if (existing && existing.length > 0) {
            await supabase.from('lesson_progress')
                .update({ completed: true, completed_at: new Date().toISOString() })
                .eq('id', existing[0].id);
        } else {
            await supabase.from('lesson_progress').insert({
                user_id: userId, lesson_id: parseInt(lessonId), course_id: courseId,
                completed: true, completed_at: new Date().toISOString()
            });
        }

        // Update purchase progress
        const { data: allLessons } = await supabase.from('course_lessons').select('id').eq('course_id', courseId);
        const { data: completedProg } = await supabase.from('lesson_progress')
            .select('id').eq('user_id', userId).eq('course_id', courseId).eq('completed', true);

        const progress = allLessons?.length > 0
            ? Math.round((completedProg?.length || 0) / allLessons.length * 100)
            : 0;

        await supabase.from('purchases').update({ progress }).eq('user_id', userId).eq('course_id', courseId);

        res.json({ success: true, message: 'Lesson marked complete' });
    } catch (err) {
        console.error('Mark complete error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.markLessonIncomplete = async (req, res) => {
    try {
        const { lessonId } = req.params;
        const userId = req.user.id;

        const { data: lessons } = await supabase.from('course_lessons').select('course_id').eq('id', lessonId);
        if (!lessons || lessons.length === 0) {
            return res.status(404).json({ success: false, message: 'Lesson not found' });
        }

        const courseId = lessons[0].course_id;

        await supabase.from('lesson_progress')
            .update({ completed: false, completed_at: null })
            .eq('user_id', userId)
            .eq('lesson_id', lessonId);

        // Update purchase progress
        const { data: allLessons } = await supabase.from('course_lessons').select('id').eq('course_id', courseId);
        const { data: completedProg } = await supabase.from('lesson_progress')
            .select('id').eq('user_id', userId).eq('course_id', courseId).eq('completed', true);

        const progress = allLessons?.length > 0
            ? Math.round((completedProg?.length || 0) / allLessons.length * 100)
            : 0;

        await supabase.from('purchases').update({ progress }).eq('user_id', userId).eq('course_id', courseId);

        res.json({ success: true, message: 'Lesson marked incomplete' });
    } catch (err) {
        console.error('Mark incomplete error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
