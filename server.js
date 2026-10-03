require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// إعداد الاتصال بقاعدة البيانات
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// التصنيفات المسموحة
const ALLOWED_CATEGORIES = ['Food', 'Transport', 'Bills', 'Entertainment', 'Other'];

// 1. GET /api/expenses (جلب جميع المصاريف)
app.get('/api/expenses', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, title, amount::float8, category, to_char(date, 'YYYY-MM-DD') AS date 
            FROM expenses 
            ORDER BY id ASC
        `);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching expenses:', err.message);
        res.status(500).json({ message: 'خطأ في قاعدة البيانات' });
    }
});

// 2. GET /api/expenses/:id (جلب مصروف واحد برقم الـ ID)
app.get('/api/expenses/:id', async (req, res) => {
    const { id } = req.params;

    if (isNaN(id)) {
        return res.status(404).json({ message: 'المصروف غير موجود' });
    }

    try {
        const result = await pool.query(`
            SELECT id, title, amount::float8, category, to_char(date, 'YYYY-MM-DD') AS date 
            FROM expenses 
            WHERE id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'المصروف غير موجود' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching expense:', err.message);
        res.status(500).json({ message: 'خطأ في قاعدة البيانات' });
    }
});

// 3. POST /api/expenses (إضافة مصروف جديد مع Validation)
app.post('/api/expenses', async (req, res) => {
    const { title, amount, category, date } = req.body;

    // Validation Check
    if (!title || typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ message: 'العنوان مطلوب ويجب أن يكون نص غير فارغ' });
    }

    if (amount === undefined || isNaN(amount) || Number(amount) <= 0) {
        return res.status(400).json({ message: 'المبلغ مطلوب ويجب أن يكون رقماً أكبر من صفر' });
    }

    if (!category || !ALLOWED_CATEGORIES.includes(category)) {
        return res.status(400).json({ message: 'التصنيف غير مسموح' });
    }

    if (!date) {
        return res.status(400).json({ message: 'التاريخ مطلوب' });
    }

    try {
        const queryText = `
            INSERT INTO expenses (title, amount, category, date)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, amount::float8, category, to_char(date, 'YYYY-MM-DD') AS date
        `;
        const result = await pool.query(queryText, [title.trim(), amount, category, date]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding expense:', err.message);
        res.status(500).json({ message: 'خطأ في قاعدة البيانات' });
    }
});

// 4. PUT /api/expenses/:id (تعديل مصروف كامل)
app.put('/api/expenses/:id', async (req, res) => {
    const { id } = req.params;
    const { title, amount, category, date } = req.body;

    if (isNaN(id)) {
        return res.status(404).json({ message: 'المصروف غير موجود' });
    }

    // Validation Check
    if (!title || typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({ message: 'العنوان مطلوب ويجب أن يكون نص غير فارغ' });
    }

    if (amount === undefined || isNaN(amount) || Number(amount) <= 0) {
        return res.status(400).json({ message: 'المبلغ مطلوب ويجب أن يكون رقماً أكبر من صفر' });
    }

    if (!category || !ALLOWED_CATEGORIES.includes(category)) {
        return res.status(400).json({ message: 'التصنيف غير مسموح' });
    }

    if (!date) {
        return res.status(400).json({ message: 'التاريخ مطلوب' });
    }

    try {
        const queryText = `
            UPDATE expenses
            SET title = $1, amount = $2, category = $3, date = $4
            WHERE id = $5
            RETURNING id, title, amount::float8, category, to_char(date, 'YYYY-MM-DD') AS date
        `;
        const result = await pool.query(queryText, [title.trim(), amount, category, date, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'المصروف غير موجود' });
        }

        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error('Error updating expense:', err.message);
        res.status(500).json({ message: 'خطأ في قاعدة البيانات' });
    }
});

// 5. DELETE /api/expenses/:id (حذف مصروف)
app.delete('/api/expenses/:id', async (req, res) => {
    const { id } = req.params;

    if (isNaN(id)) {
        return res.status(404).json({ message: 'المصروف غير موجود' });
    }

    try {
        const result = await pool.query(`
            DELETE FROM expenses 
            WHERE id = $1 
            RETURNING id, title, amount::float8, category, to_char(date, 'YYYY-MM-DD') AS date
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'المصروف غير موجود' });
        }

        res.status(200).json({ message: 'تم حذف المصروف بنجاح', deletedExpense: result.rows[0] });
    } catch (err) {
        console.error('Error deleting expense:', err.message);
        res.status(500).json({ message: 'خطأ في قاعدة البيانات' });
    }
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});