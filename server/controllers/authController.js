const supabase = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        // Validate email format - only allow common TLDs
        const allowedTLDs = ['com', 'ma', 'net', 'org', 'edu', 'gov', 'io', 'co', 'fr', 'uk', 'de', 'es', 'it'];
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.([a-zA-Z]{2,})$/;
        const match = email.match(emailRegex);

        if (!match || !allowedTLDs.includes(match[1].toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address (allowed: .com, .ma, .net, .org, .edu, .gov, .io, .co, .fr, .uk, .de, .es, .it)'
            });
        }

        // Validate email length
        if (email.length > 254) {
            return res.status(400).json({ success: false, message: 'Email address is too long' });
        }

        // Validate username (alphanumeric, underscores, 3-30 chars)
        const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({ success: false, message: 'Username must be 3-30 characters and contain only letters, numbers, and underscores' });
        }

        // Validate password strength (min 6 chars)
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
        }

        // Check if user exists
        const { data: existing } = await supabase.from('users').select('id').eq('email', email.toLowerCase());
        if (existing && existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        // Hash password and create user
        const hashedPassword = await bcrypt.hash(password, 10);
        const { data, error } = await supabase
            .from('users')
            .insert({ username, email: email.toLowerCase(), password: hashedPassword, role: 'learner', points: 0 })
            .select('id, username, email, role')
            .single();

        if (error) throw error;

        const token = jwt.sign({ id: data.id, email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION || '7d' });

        res.status(201).json({ success: true, user: data, token });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password required' });
        }

        const { data: users, error } = await supabase.from('users').select('*').eq('email', email);
        if (error) throw error;
        if (!users || users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const effectiveRole = user.id === 1 ? 'super_admin' : user.role;
        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION || '7d' });

        res.json({
            success: true,
            user: { id: user.id, username: user.username, email: user.email, role: effectiveRole },
            token
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getMe = async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, username, email, role, points')
            .eq('id', req.user.id);

        if (error) throw error;
        if (!users || users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = users[0];
        user.role = user.id === 1 ? 'super_admin' : user.role;

        res.json({ success: true, user });
    } catch (err) {
        console.error('GetMe error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
