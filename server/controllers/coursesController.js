const supabase = require('../config/database');

exports.getCourses = async (req, res) => {
    try {
        const { page = 1, limit = 6, search, category, level, status } = req.query;

        let query = supabase.from('courses').select('*');

        if (status) query = query.eq('status', status);
        if (category) query = query.eq('category', category);
        if (level) query = query.eq('level', level);
        if (search) query = query.ilike('title', `%${search}%`);

        query = query.order('created_at', { ascending: false });

        const { data: courses, error } = await query;
        if (error) throw error;

        // Get authors
        const userIds = [...new Set(courses.map(c => c.user_id))];
        const { data: users } = await supabase.from('users').select('id, username').in('id', userIds);
        const userMap = {};
        users?.forEach(u => userMap[u.id] = u.username);

        const coursesWithAuthor = courses.map(c => ({ ...c, author: userMap[c.user_id] || 'Unknown' }));

        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const paginatedCourses = coursesWithAuthor.slice(offset, offset + parseInt(limit));
        const totalItems = coursesWithAuthor.length;
        const totalPages = Math.ceil(totalItems / parseInt(limit));

        res.json({
            success: true,
            courses: paginatedCourses,
            pagination: { currentPage: parseInt(page), totalPages, totalItems, hasNextPage: page < totalPages, hasPrevPage: page > 1 }
        });
    } catch (err) {
        console.error('Get courses error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getCourse = async (req, res) => {
    try {
        const { data: courses, error } = await supabase.from('courses').select('*').eq('id', req.params.id);
        if (error) throw error;
        if (!courses || courses.length === 0) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }

        const course = courses[0];
        const { data: users } = await supabase.from('users').select('username').eq('id', course.user_id);
        course.author = users?.[0]?.username || 'Unknown';

        res.json({ success: true, course });
    } catch (err) {
        console.error('Get course error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.createCourse = async (req, res) => {
    try {
        const { data: users } = await supabase.from('users').select('role').eq('id', req.user.id);
        const userRole = users?.[0]?.role || 'learner';
        const effectiveRole = req.user.id === 1 ? 'super_admin' : userRole;

        if (effectiveRole !== 'super_admin' && effectiveRole !== 'teacher') {
            return res.status(403).json({ success: false, message: 'Only teachers and admins can create courses' });
        }

        const { title, description, short_description, category = 'dev', duration = 0, is_free = true, point_cost = 0, points_reward = 500, level = 'beginner', image_url } = req.body;
        if (!title) return res.status(400).json({ success: false, message: 'Title is required' });

        const { data, error } = await supabase
            .from('courses')
            .insert({
                title, description: description || '', short_description: short_description || '',
                category, duration, is_free, point_cost, points_reward, level,
                image_url: image_url || null, user_id: req.user.id, status: 'active'
            })
            .select('id')
            .single();

        if (error) throw error;
        res.status(201).json({ success: true, message: 'Course created', courseId: data.id });
    } catch (err) {
        console.error('Create course error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateCourse = async (req, res) => {
    try {
        const { data: courses } = await supabase.from('courses').select('*').eq('id', req.params.id).eq('user_id', req.user.id);
        if (!courses || courses.length === 0) {
            return res.status(404).json({ success: false, message: 'Course not found or unauthorized' });
        }

        const c = courses[0];
        const updates = {
            title: req.body.title || c.title,
            description: req.body.description ?? c.description,
            short_description: req.body.short_description ?? c.short_description,
            category: req.body.category || c.category,
            duration: req.body.duration ?? c.duration,
            is_free: req.body.is_free ?? c.is_free,
            point_cost: req.body.point_cost ?? c.point_cost,
            points_reward: req.body.points_reward ?? c.points_reward,
            level: req.body.level || c.level,
            status: req.body.status || c.status,
            image_url: req.body.image_url ?? c.image_url,
            what_you_learn: req.body.what_you_learn ?? c.what_you_learn
        };

        const { error } = await supabase.from('courses').update(updates).eq('id', req.params.id);
        if (error) throw error;

        res.json({ success: true, message: 'Course updated' });
    } catch (err) {
        console.error('Update course error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.deleteCourse = async (req, res) => {
    try {
        const { data, error } = await supabase.from('courses').delete().eq('id', req.params.id).eq('user_id', req.user.id);
        if (error) throw error;

        res.json({ success: true, message: 'Course deleted' });
    } catch (err) {
        console.error('Delete course error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
