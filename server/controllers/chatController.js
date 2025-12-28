const supabase = require('../config/database');

// Get messages for a course
exports.getMessages = async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;

        // Check if user is enrolled in the course
        const { data: purchase } = await supabase
            .from('purchases')
            .select('id')
            .eq('user_id', userId)
            .eq('course_id', courseId)
            .single();

        if (!purchase) {
            return res.status(403).json({ success: false, message: 'You must be enrolled to access chat' });
        }

        // Get messages with user info
        const { data: messages, error } = await supabase
            .from('course_messages')
            .select(`
                id,
                message,
                created_at,
                user_id,
                users (
                    id,
                    username
                )
            `)
            .eq('course_id', courseId)
            .order('created_at', { ascending: true })
            .limit(100);

        if (error) throw error;

        // Format messages
        const formattedMessages = messages.map(m => ({
            id: m.id,
            message: m.message,
            created_at: m.created_at,
            user_id: m.user_id,
            username: m.users?.username || 'Unknown',
            isOwn: m.user_id === userId
        }));

        res.json({ success: true, messages: formattedMessages });
    } catch (err) {
        console.error('Get messages error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Send a message
exports.sendMessage = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { message } = req.body;
        const userId = req.user.id;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        if (message.length > 1000) {
            return res.status(400).json({ success: false, message: 'Message too long (max 1000 characters)' });
        }

        // Check if user is enrolled in the course
        const { data: purchase } = await supabase
            .from('purchases')
            .select('id')
            .eq('user_id', userId)
            .eq('course_id', courseId)
            .single();

        if (!purchase) {
            return res.status(403).json({ success: false, message: 'You must be enrolled to send messages' });
        }

        // Insert message
        const { data, error } = await supabase
            .from('course_messages')
            .insert({
                course_id: parseInt(courseId),
                user_id: userId,
                message: message.trim()
            })
            .select(`
                id,
                message,
                created_at,
                user_id
            `)
            .single();

        if (error) throw error;

        // Get user info
        const { data: user } = await supabase
            .from('users')
            .select('username')
            .eq('id', userId)
            .single();

        res.status(201).json({
            success: true,
            message: {
                id: data.id,
                message: data.message,
                created_at: data.created_at,
                user_id: data.user_id,
                username: user?.username || 'Unknown',
                isOwn: true
            }
        });
    } catch (err) {
        console.error('Send message error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
