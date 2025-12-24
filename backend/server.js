
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import crypto from 'crypto';
import pkg from 'pg';
import { createClient } from '@supabase/supabase-js';

const { Pool } = pkg;
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

/* ------------------------------------------------------------------
   SUPABASE STORAGE SETUP
------------------------------------------------------------------ */
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseBucket = process.env.SUPABASE_BUCKET || 'uploads';
const supabase = createClient(supabaseUrl, supabaseKey);

const SIGNED_URL_EXPIRY = 3600; // 1 hour

/* ------------------------------------------------------------------
   DATABASE CONNECTION
------------------------------------------------------------------ */
const pool = new Pool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 5432,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function query(sql, params = []) {
    const client = await pool.connect();
    try {
        const result = await client.query(sql, params);
        return result.rows;
    } finally {
        client.release();
    }
}

/**
 * Automatically syncs the ID sequence to prevent duplicate key errors.
 */
async function syncUserSequence() {
    console.log("[DB] Synchronizing users_react_id_seq...");
    try {
        await query(`
            SELECT setval(
                pg_get_serial_sequence('users_react', 'id'), 
                COALESCE((SELECT MAX(id) FROM users_react), 0) + 1, 
                false
            );
        `);
        console.log("[DB] Sequence synchronized successfully.");
    } catch (err) {
        console.error("[DB] Failed to sync sequence:", err.message);
    }
}

// Sync on startup
syncUserSequence();

function hashPassword(password) {
    return crypto.createHash('sha256').update(password || '').digest('hex');
}

/* ------------------------------------------------------------------
   EMAIL SETUP
------------------------------------------------------------------ */
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: { rejectUnauthorized: false }
});

// Verify SMTP connection on startup
transporter.verify((error, success) => {
    if (error) {
        console.warn("[SMTP] Email service not configured or failing:", error.message);
    } else {
        console.log("[SMTP] Email server is ready to send reset links.");
    }
});

/* ------------------------------------------------------------------
   USER MANAGEMENT
------------------------------------------------------------------ */

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const users = await query(`SELECT id, username, email, role, password_hash, name FROM users_react WHERE username = $1`, [username]);
        if (!users.length) return res.status(401).json({ error: 'Invalid credentials' });
        
        const user = users[0];
        const hash = hashPassword(password);
        
        if (user.password_hash !== hash && user.password_hash !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        delete user.password_hash;
        res.json(user);
    } catch (err) { 
        console.error("Login error:", err);
        res.status(500).json({ error: err.message }); 
    }
});

app.post('/api/users/add', async (req, res) => {
    const { username, password, email, name, role } = req.body;
    console.log(`[API] Attempting to add user: ${username}`);
    
    try {
        await query(
            `INSERT INTO users_react (username, password_hash, email, name, role) 
             VALUES ($1, $2, $3, $4, $5)`,
            [username, hashPassword(password), email, name, role || 'user']
        );
        console.log(`[API] User ${username} added successfully.`);
        res.json({ success: true, message: "User created successfully" });
    } catch (err) {
        if (err.message.includes('unique constraint') && err.message.includes('pkey')) {
            console.warn("[API] Primary key collision detected. Repairing sequence and retrying...");
            await syncUserSequence();
            try {
                await query(
                    `INSERT INTO users_react (username, password_hash, email, name, role) 
                     VALUES ($1, $2, $3, $4, $5)`,
                    [username, hashPassword(password), email, name, role || 'user']
                );
                return res.json({ success: true, message: "User created successfully after sequence repair." });
            } catch (retryErr) {
                return res.status(500).json({ error: `Database Error after repair: ${retryErr.message}` });
            }
        }
        console.error("[API] Add User Database Error:", err.message);
        res.status(500).json({ error: `Database Error: ${err.message}` });
    }
});

app.post('/api/users/update-password', async (req, res) => {
    const { userId, newPassword } = req.body;
    try {
        await query(`UPDATE users_react SET password_hash = $1 WHERE id = $2`, [hashPassword(newPassword), userId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/forgot-password', async (req, res) => {
    const { identifier } = req.body;
    console.log(`[API] Password reset request for: ${identifier}`);
    try {
        const users = await query(`SELECT id, email, name FROM users_react WHERE username = $1 OR email = $1`, [identifier]);
        
        // We always return a positive message to prevent user enumeration
        if (!users.length) {
            console.log(`[API] Reset requested for non-existent user: ${identifier}`);
            return res.json({ success: true, message: "If an account with that email or username exists, a reset link has been sent." });
        }

        const user = users[0];
        const token = crypto.randomBytes(32).toString('hex');
        
        // Store token with 1 hour expiration
        await query(`
            UPDATE users_react 
            SET reset_token = $1, 
                reset_expires = NOW() + INTERVAL '1 hour' 
            WHERE id = $2
        `, [token, user.id]);

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetLink = `${frontendUrl}/#/reset-password/${token}`;

        console.log(`[API] Sending reset link to ${user.email}`);

        if (process.env.SMTP_USER) {
            await transporter.sendMail({
                to: user.email,
                subject: 'Reset Your CIDCO Records Password',
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                        <div style="background-color: #4f46e5; padding: 24px; text-align: center; color: white;">
                            <h1 style="margin: 0; font-size: 24px;">CIDCO Records</h1>
                        </div>
                        <div style="padding: 32px; background-color: white; color: #1e293b;">
                            <p style="font-size: 16px;">Hello ${user.name || user.username},</p>
                            <p style="line-height: 1.6;">You requested to reset your password for the CIDCO Records Management System. Click the button below to set a new password. This link is valid for 1 hour.</p>
                            <div style="text-align: center; margin: 32px 0;">
                                <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">Reset Password</a>
                            </div>
                            <p style="font-size: 12px; color: #64748b; line-height: 1.6;">If you didn't request this, you can safely ignore this email. Your password will not be changed until you click the link above and create a new one.</p>
                        </div>
                        <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
                            &copy; ${new Date().getFullYear()} PFEPL / CIDCO Records
                        </div>
                    </div>
                `
            });
        } else {
            console.warn("[API] SMTP_USER not configured. Link (for dev only):", resetLink);
        }

        res.json({ success: true, message: "If an account with that email or username exists, a reset link has been sent." });
    } catch (err) {
        console.error("[API] Forgot password error:", err);
        res.status(500).json({ error: "Internal server error while processing request." });
    }
});

app.post('/api/reset-password', async (req, res) => {
    const { token, password } = req.body;
    console.log(`[API] Attempting password reset with token.`);
    try {
        const users = await query(`
            SELECT id 
            FROM users_react 
            WHERE reset_token = $1 
              AND reset_expires > NOW()
        `, [token]);

        if (!users.length) {
            return res.status(400).json({ error: "The reset link is invalid or has expired." });
        }

        await query(`
            UPDATE users_react 
            SET password_hash = $1, 
                reset_token = NULL, 
                reset_expires = NULL 
            WHERE id = $2
        `, [hashPassword(password), users[0].id]);

        console.log(`[API] Password updated successfully for user ID: ${users[0].id}`);
        res.json({ success: true, message: "Your password has been successfully updated." });
    } catch (err) {
        console.error("[API] Reset password error:", err);
        res.status(500).json({ error: err.message });
    }
});

/* ------------------------------------------------------------------
   SUMMARY CALCULATION
------------------------------------------------------------------ */
async function getSummary(req, groupByColumn) {
    const { region, node, sector } = req.query;

    let sql = `
        SELECT 
            COALESCE(NULLIF(CAST(${groupByColumn} AS TEXT), ''), 'Not Specified') as category,
            SUM(
                CASE 
                    WHEN "PLOT_AREA_FOR_INVOICE"::TEXT ~ '^[0-9.]+$' THEN "PLOT_AREA_FOR_INVOICE"::DECIMAL
                    ELSE COALESCE(NULLIF(REGEXP_REPLACE("PLOT_AREA_FOR_INVOICE"::TEXT, '[^0-9.]', '', 'g'), ''), '0')::DECIMAL
                END
            ) as area,
            SUM(COALESCE("Additional_Plot_Count", 0)) as additional_count,
            SUM(COALESCE("Base_Plot_Count", 0)) as base_count
        FROM all_data
        WHERE 1=1
    `;

    const params = [];
    if (region) sql += ` AND "REGION" = $${params.push(region)}`;
    if (node)   sql += ` AND "NAME_OF_NODE" = $${params.push(node)}`;
    if (sector) sql += ` AND "SECTOR_NO_" = $${params.push(sector)}`;

    sql += ` GROUP BY category ORDER BY area DESC`;

    try {
        const rows = await query(sql, params);
        const totalArea = rows.reduce((acc, curr) => acc + Number(curr.area || 0), 0);

        return rows.map(r => ({
            category: r.category,
            area: Number(r.area || 0),
            additionalCount: Number(r.additional_count || 0),
            basePlotCount: Number(r.base_count || 0),
            percent: totalArea > 0 ? +((Number(r.area || 0) / totalArea) * 100).toFixed(2) : 0
        }));
    } catch (err) {
        console.error(`Summary SQL Error (${groupByColumn}):`, err.message);
        return [];
    }
}

app.get('/api/summary', async (req, res) => res.json(await getSummary(req, '"PLOT_USE_FOR_INVOICE"')));
app.get('/api/summary/department', async (req, res) => res.json(await getSummary(req, '"Department_Remark"')));

/* ------------------------------------------------------------------
   FILTERS & SEARCH
------------------------------------------------------------------ */
app.get('/api/regions', async (req, res) => {
    try {
        const rows = await query(`SELECT DISTINCT "REGION" FROM all_data WHERE "REGION" IS NOT NULL ORDER BY "REGION"`);
        res.json(rows.map(r => r.REGION));
    } catch (err) { res.json([]); }
});

app.get('/api/nodes', async (req, res) => {
    const { region } = req.query;
    let sql = `SELECT DISTINCT "NAME_OF_NODE" FROM all_data WHERE "NAME_OF_NODE" IS NOT NULL`;
    const params = [];
    if (region) { sql += ` AND "REGION" = $1`; params.push(region); }
    sql += ` ORDER BY "NAME_OF_NODE"`;
    try {
        const rows = await query(sql, params);
        res.json(rows.map(r => r.NAME_OF_NODE));
    } catch (err) { res.json([]); }
});

app.get('/api/sectors', async (req, res) => {
    const { node, region } = req.query;
    let sql = `SELECT DISTINCT "SECTOR_NO_" FROM all_data WHERE "SECTOR_NO_" IS NOT NULL`;
    const params = [];
    if (node) { sql += ` AND "NAME_OF_NODE" = $${params.push(node)}`; }
    if (region) { sql += ` AND "REGION" = $${params.push(region)}`; }
    sql += ` ORDER BY "SECTOR_NO_"`;
    try {
        const rows = await query(sql, params);
        res.json(rows.map(r => r.SECTOR_NO_));
    } catch (err) { res.json([]); }
});

app.get('/api/blocks', async (req, res) => {
    const { node, sector, region } = req.query;
    let sql = `SELECT DISTINCT "BLOCK_ROAD_NAME" FROM all_data WHERE "BLOCK_ROAD_NAME" IS NOT NULL`;
    const params = [];
    if (node) sql += ` AND "NAME_OF_NODE" = $${params.push(node)}`;
    if (sector) sql += ` AND "SECTOR_NO_" = $${params.push(sector)}`;
    if (region) sql += ` AND "REGION" = $${params.push(region)}`;
    sql += ` ORDER BY "BLOCK_ROAD_NAME"`;
    try {
        const rows = await query(sql, params);
        res.json(rows.map(r => r.BLOCK_ROAD_NAME));
    } catch (err) { res.json([]); }
});

app.get('/api/plots', async (req, res) => {
    const { node, sector, block, region } = req.query;
    let sql = `SELECT DISTINCT "PLOT_NO_" FROM all_data WHERE "PLOT_NO_" IS NOT NULL`;
    const params = [];
    if (node) sql += ` AND "NAME_OF_NODE" = $${params.push(node)}`;
    if (sector) sql += ` AND "SECTOR_NO_" = $${params.push(sector)}`;
    if (block) sql += ` AND "BLOCK_ROAD_NAME" = $${params.push(block)}`;
    if (region) sql += ` AND "REGION" = $${params.push(region)}`;
    sql += ` ORDER BY "PLOT_NO_"`;
    try {
        const rows = await query(sql, params);
        res.json(rows.map(r => r.PLOT_NO_));
    } catch (err) { res.json([]); }
});

app.post('/api/search', async (req, res) => {
    const { node, sector, block, plot, region } = req.body;
    let sql = `SELECT "ID", "NAME_OF_NODE", "SECTOR_NO_", "BLOCK_ROAD_NAME", "PLOT_NO_", "PLOT_NO_AFTER_SURVEY" FROM all_data WHERE 1=1`;
    const params = [];
    if (node) sql += ` AND "NAME_OF_NODE" = $${params.push(node)}`;
    if (sector) sql += ` AND "SECTOR_NO_" = $${params.push(sector)}`;
    if (block)  sql += ` AND "BLOCK_ROAD_NAME" = $${params.push(block)}`;
    if (plot)   sql += ` AND "PLOT_NO_" = $${params.push(plot)}`;
    if (region) sql += ` AND "REGION" = $${params.push(region)}`;
    try {
        const rows = await query(sql, params);
        res.json(rows);
    } catch (err) { res.json([]); }
});

/* ------------------------------------------------------------------
   RECORD DETAILS (SUPABASE STORAGE SIGNED URLS)
------------------------------------------------------------------ */
app.get('/api/record/:id', async (req, id_res) => {
    const { id } = req.params;
    try {
        const rows = await query(`SELECT * FROM all_data WHERE "ID" = $1`, [id]);
        if (!rows.length) return id_res.status(404).json({ error: "Record not found" });
        
        const record = rows[0];
        delete record.pdf_url;
        delete record.map_url;

        const { data: imageList, error: imageError } = await supabase
            .storage
            .from(supabaseBucket)
            .list(`images/${id}`);

        let images = [];
        if (!imageError && imageList && imageList.length > 0) {
            const imagePaths = imageList
                .filter(file => /\.(jpg|png|jpeg|webp)$/i.test(file.name))
                .map(file => `images/${id}/${file.name}`);

            if (imagePaths.length > 0) {
                const { data: signedUrls } = await supabase
                    .storage
                    .from(supabaseBucket)
                    .createSignedUrls(imagePaths, SIGNED_URL_EXPIRY);
                if (signedUrls) images = signedUrls.map(item => item.signedUrl);
            }
        }

        let pdf_url = null;
        let has_pdf = false;
        let signResult = await supabase.storage.from(supabaseBucket).createSignedUrl(`pdfs/${id}.pdf`, SIGNED_URL_EXPIRY);
        if (signResult.data?.signedUrl) {
            pdf_url = signResult.data.signedUrl;
            has_pdf = true;
        } else {
            signResult = await supabase.storage.from(supabaseBucket).createSignedUrl(`pdfs/${id}.PDF`, SIGNED_URL_EXPIRY);
            if (signResult.data?.signedUrl) {
                pdf_url = signResult.data.signedUrl;
                has_pdf = true;
            }
        }

        let map_url = null;
        let has_map = false;
        signResult = await supabase.storage.from(supabaseBucket).createSignedUrl(`maps/${id}.pdf`, SIGNED_URL_EXPIRY);
        if (signResult.data?.signedUrl) {
            map_url = signResult.data.signedUrl;
            has_map = true;
        } else {
            signResult = await supabase.storage.from(supabaseBucket).createSignedUrl(`maps/${id}.PDF`, SIGNED_URL_EXPIRY);
            if (signResult.data?.signedUrl) {
                map_url = signResult.data.signedUrl;
                has_map = true;
            }
        }

        id_res.json({
            ...record,
            images,
            has_pdf,
            has_map,
            pdf_url,
            map_url
        });
    } catch (err) {
        console.error("Fetch Record Details Error:", err.message);
        id_res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post('/api/record/update', async (req, res) => {
    const { ID, ...updates } = req.body;
    const keys = Object.keys(updates).filter(k => !['images', 'has_pdf', 'has_map', 'pdf_url', 'map_url'].includes(k));
    if (!ID || !keys.length) return res.json({ message: "No changes" });

    const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const values = keys.map(k => updates[k] === '' || updates[k] === undefined ? null : updates[k]);
    values.push(ID);

    try {
        await query(`UPDATE all_data SET ${setClause} WHERE "ID" = $${values.length}`, values);
        res.json({ message: "Record updated successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// const PORT = 8083;
// app.listen(PORT, () => {
//     console.log(`🚀 Server running on http://localhost:${PORT}`);
// });

const PORT = process.env.PORT;

app.get('/', (req, res) => {
    res.send('CIDCO Backend is running 🚀');
});


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});


