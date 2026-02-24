const pool = require('../config/database');
const bcrypt = require('bcryptjs');

const getAllUsers = async (req, res) => {
    try {
        const [users] = await pool.query(`
      SELECT u.id, u.username, u.email, u.full_name, u.role, u.department_id, u.is_active, d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY u.username
    `);
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
};

const createUser = async (req, res) => {
    try {
        const { username, email, password, role, departmentId, isActive } = req.body;

        // Validate required fields
        if (!username || !email || !password || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if username or email already exists
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert user
        const [result] = await pool.query(
            'INSERT INTO users (username, email, password_hash, full_name, role, department_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [username, email, passwordHash, username, role, departmentId || null, isActive]
        );

        res.status(201).json({ id: result.insertId, message: 'User created successfully' });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, password, role, departmentId, isActive } = req.body;

        // Validate required fields
        if (!username || !email || !role) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if username or email exists for OTHER users
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
            [username, email, id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Username or email already used by another account' });
        }

        let query = 'UPDATE users SET username = ?, email = ?, role = ?, department_id = ?, is_active = ?';
        let params = [username, email, role, departmentId || null, isActive];

        // Update password only if provided
        if (password) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            query += ', password_hash = ?';
            params.push(passwordHash);
        }

        query += ' WHERE id = ?';
        params.push(id);

        await pool.query(query, params);

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent deleting self (optional, but good practice)
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        // Handle foreign key constraint errors (e.g. if user has created risks)
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ error: 'Cannot delete user because they have associated records' });
        }
        res.status(500).json({ error: 'Failed to delete user' });
    }
};

module.exports = {
    getAllUsers,
    createUser,
    updateUser,
    deleteUser
};
