const supabase = require('../config/database');

exports.getLessons = async (req, res) => {
    try {
        const { data: lessons, error } = await supabase
            .from('course_lessons')
            .select('*')
            .eq('course_id', req.params.courseId)
            .order('order_index', { ascending: true });

        if (error) throw error;
        res.json({ success: true, lessons: lessons || [] });
    } catch (err) {
        console.error('Get lessons error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getLesson = async (req, res) => {
    try {
        const { data: lessons, error } = await supabase
            .from('course_lessons')
            .select('*')
            .eq('id', req.params.id);

        if (error) throw error;
        if (!lessons || lessons.length === 0) {
            return res.status(404).json({ success: false, message: 'Lesson not found' });
        }

        const lesson = lessons[0];

        // Get prev/next lessons
        const { data: allLessons } = await supabase
            .from('course_lessons')
            .select('id, title, order_index')
            .eq('course_id', lesson.course_id)
            .order('order_index', { ascending: true });

        const currentIndex = allLessons?.findIndex(l => l.id === lesson.id) ?? -1;
        const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
        const nextLesson = currentIndex < (allLessons?.length || 0) - 1 ? allLessons[currentIndex + 1] : null;

        res.json({ success: true, lesson, prevLesson, nextLesson });
    } catch (err) {
        console.error('Get lesson error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.createLesson = async (req, res) => {
    try {
        const { course_id, title, content, video_url } = req.body;

        if (!course_id || !title) {
            return res.status(400).json({ success: false, message: 'Course ID and title are required' });
        }

        // Get max order index for this course
        const { data: existing, error: orderError } = await supabase
            .from('course_lessons')
            .select('order_index')
            .eq('course_id', course_id)
            .order('order_index', { ascending: false })
            .limit(1);

        if (orderError) throw orderError;

        const nextOrder = existing && existing.length > 0 ? existing[0].order_index + 1 : 0;

        // Insert the new lesson
        const { data, error } = await supabase
            .from('course_lessons')
            .insert({
                course_id,
                title,
                content: content || '',
                video_url: video_url || null,
                order_index: nextOrder
            })
            .select('id')
            .single();

        if (error) throw error;

        res.status(201).json({ success: true, message: 'Lesson created successfully', lessonId: data.id });
    } catch (err) {
        console.error('Create lesson error:', err);
        res.status(500).json({ success: false, message: 'Failed to create lesson' });
    }
};

exports.updateLesson = async (req, res) => {
    try {
        const { title, content, video_url, order_index } = req.body;

        const updates = {};
        if (title !== undefined) updates.title = title;
        if (content !== undefined) updates.content = content;
        if (video_url !== undefined) updates.video_url = video_url;
        if (order_index !== undefined) updates.order_index = order_index;

        const { error } = await supabase.from('course_lessons').update(updates).eq('id', req.params.id);
        if (error) throw error;

        res.json({ success: true, message: 'Lesson updated' });
    } catch (err) {
        console.error('Update lesson error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.deleteLesson = async (req, res) => {
    try {
        const { error } = await supabase.from('course_lessons').delete().eq('id', req.params.id);
        if (error) throw error;

        res.json({ success: true, message: 'Lesson deleted' });
    } catch (err) {
        console.error('Delete lesson error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
