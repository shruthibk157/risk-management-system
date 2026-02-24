const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();

// Get database path from engine.js structure
const dbPath = path.join(__dirname, '../risk_management.db');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads/documents');

        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = crypto.randomBytes(16).toString('hex');
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
    }
});

// File filter - only allow specific file types
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/json',
        'text/markdown'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, DOCX, TXT, JSON, and MD files are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Helper function to get database connection
const getDb = () => {
    return new sqlite3.Database(dbPath);
};

// POST /api/documents/upload - Upload document(s)
router.post('/upload', upload.array('files', 10), async (req, res) => {
    const db = getDb();

    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const departmentId = req.body.department || req.body.department_id;

        if (!departmentId) {
            // Clean up uploaded files
            req.files.forEach(file => {
                try {
                    fs.unlinkSync(file.path);
                } catch (err) {
                    console.error('Error deleting file:', err);
                }
            });
            return res.status(400).json({ error: 'Department ID is required' });
        }

        // Create table if not exists
        await new Promise((resolve, reject) => {
            db.run(`
                CREATE TABLE IF NOT EXISTS documents (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    filename TEXT NOT NULL,
                    stored_filename TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    file_size INTEGER,
                    mime_type TEXT,
                    department_id INTEGER,
                    uploaded_by INTEGER,
                    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
                    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
                )
            `, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        const uploadedDocs = [];

        for (const file of req.files) {
            const result = await new Promise((resolve, reject) => {
                db.run(
                    `INSERT INTO documents (filename, stored_filename, file_path, file_size, mime_type, department_id, uploaded_by)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        file.originalname,
                        file.filename,
                        file.path,
                        file.size,
                        file.mimetype,
                        departmentId,
                        req.user?.id || 1 // Default to admin if no user in request
                    ],
                    function (err) {
                        if (err) reject(err);
                        else resolve({ id: this.lastID });
                    }
                );
            });

            uploadedDocs.push({
                id: result.id,
                filename: file.originalname,
                size: file.size
            });
        }

        res.status(201).json({
            message: 'Documents uploaded successfully',
            documents: uploadedDocs
        });

    } catch (error) {
        console.error('Upload error:', error);

        // Clean up files on error
        if (req.files) {
            req.files.forEach(file => {
                try {
                    fs.unlinkSync(file.path);
                } catch (err) {
                    console.error('Error deleting file:', err);
                }
            });
        }

        res.status(500).json({ error: 'Failed to upload documents: ' + error.message });
    } finally {
        db.close();
    }
});

// GET /api/documents - List documents
router.get('/', async (req, res) => {
    const db = getDb();

    try {
        const departmentId = req.query.department || req.query.department_id;

        let query = `
            SELECT d.*, u.full_name as uploaded_by_name
            FROM documents d
            LEFT JOIN users u ON d.uploaded_by = u.id
        `;

        const params = [];

        if (departmentId) {
            query += ' WHERE d.department_id = ?';
            params.push(departmentId);
        }

        query += ' ORDER BY d.uploaded_at DESC';

        const documents = await new Promise((resolve, reject) => {
            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Map the fields for frontend compatibility
        const mappedDocs = documents.map(doc => ({
            ...doc,
            name: doc.filename,
            uploadedAt: doc.uploaded_at
        }));

        res.json(mappedDocs);

    } catch (error) {
        console.error('Fetch documents error:', error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    } finally {
        db.close();
    }
});

// DELETE /api/documents/:id - Delete document
router.delete('/:id', async (req, res) => {
    const db = getDb();

    try {
        const documentId = req.params.id;

        // Get document info first
        const doc = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM documents WHERE id = ?', [documentId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!doc) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Delete from database
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM documents WHERE id = ?', [documentId], function (err) {
                if (err) reject(err);
                else resolve();
            });
        });

        // Delete file from disk
        try {
            if (fs.existsSync(doc.file_path)) {
                fs.unlinkSync(doc.file_path);
            }
        } catch (err) {
            console.error('Error deleting file from disk:', err);
        }

        res.json({ message: 'Document deleted successfully' });

    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ error: 'Failed to delete document' });
    } finally {
        db.close();
    }
});

module.exports = router;
