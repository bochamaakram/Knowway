const db = require('../config/db');

// Helper: Check if user ID 1 is super_admin
const isSuperAdmin = (userId) => parseInt(userId) === 1;

// Helper: Get effective role (user 1 is always super_admin)
const getEffectiveRole = async (userId) => {
    if (isSuperAdmin(userId)) return 'super_admin';
    const [users] = await db.query('SELECT role FROM users WHERE id = ?', [userId]);
    return users.length > 0 ? users[0].role : 'learner';
};

// Get all users (super_admin only)
exports.getAllUsers = async (req, res) => {
    try {
        const role = await getEffectiveRole(req.user.id);
        if (role !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Super admin only.' });
        }

        // Get all users and override role for id=1
        const [allUsers] = await db.query('SELECT id, username, email, role, created_at FROM users ORDER BY id');
        const usersWithRoles = allUsers.map(u => ({
            ...u,
            role: isSuperAdmin(u.id) ? 'super_admin' : u.role
        }));

        res.json({ success: true, users: usersWithRoles });
    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Update user role (super_admin only)
exports.updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        const targetUserId = req.params.id;

        // Check if requester is super_admin
        const requesterRole = await getEffectiveRole(req.user.id);
        if (requesterRole !== 'super_admin') {
            return res.status(403).json({ success: false, message: 'Access denied. Super admin only.' });
        }

        // Prevent changing role of user 1 (always super_admin)
        if (isSuperAdmin(targetUserId)) {
            return res.status(400).json({ success: false, message: 'Cannot change the main admin role' });
        }

        // Only allow setting to teacher or learner
        if (!['teacher', 'learner'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role. Must be teacher or learner.' });
        }

        await db.query('UPDATE users SET role = ? WHERE id = ?', [role, targetUserId]);
        res.json({ success: true, message: 'User role updated' });
    } catch (err) {
        console.error('Update role error:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Get current user's role
exports.getMyRole = async (req, res) => {
    try {
        const role = await getEffectiveRole(req.user.id);
        res.json({ success: true, role });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Export helper for use in other controllers
exports.getEffectiveRole = getEffectiveRole;
exports.isSuperAdmin = isSuperAdmin;
