const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'adithya2005',
    database: 'job_portal',
    multipleStatements: true
});


db.connect(err => {
    if (err) throw err;
    console.log('MySQL Connected');
});

// Database Schema
const createTables = `
    CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        user_type ENUM('applicant', 'employer', 'admin') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS employers (
        employer_id INT PRIMARY KEY,
        company_name VARCHAR(255) NOT NULL,
        website VARCHAR(255),
        location VARCHAR(255),
        FOREIGN KEY (employer_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS applicants (
        applicant_id INT PRIMARY KEY,
        resume_link VARCHAR(255),
        skills TEXT,
        FOREIGN KEY (applicant_id) REFERENCES users(user_id)
    );

    CREATE TABLE IF NOT EXISTS jobs (
        job_id INT AUTO_INCREMENT PRIMARY KEY,
        employer_id INT NOT NULL,
        job_title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        location VARCHAR(255) NOT NULL,
        salary DECIMAL(10,2) NOT NULL,
        posted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employer_id) REFERENCES employers(employer_id)
    );

    CREATE TABLE IF NOT EXISTS applications (
        application_id INT AUTO_INCREMENT PRIMARY KEY,
        job_id INT NOT NULL,
        applicant_id INT NOT NULL,
        application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('applied', 'reviewed', 'rejected', 'accepted') DEFAULT 'applied',
        FOREIGN KEY (job_id) REFERENCES jobs(job_id),
        FOREIGN KEY (applicant_id) REFERENCES applicants(applicant_id)
    );

    CREATE TABLE IF NOT EXISTS admins (
        admin_id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL
    );
`;

db.query(createTables, err => {
    if (err) throw err;
    console.log('Tables created');
});

// Register
app.post('/api/register', async (req, res) => {
    const { name, email, password, userType, ...extraData } = req.body;
    console.log('Register attempt:', { name, email, userType });
    try {
        if (!password) {
            console.error('No password provided');
            return res.status(400).json({ error: 'Password is required' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Generated hash:', hashedPassword);
        const userResult = await db.promise().query(
            'INSERT INTO users (name, email, password, user_type) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, userType]
        );
        const userId = userResult[0].insertId;
        if (userType === 'applicant') {
            await db.promise().query(
                'INSERT INTO applicants (applicant_id, resume_link, skills) VALUES (?, ?, ?)',
                [userId, extraData.resume_link, extraData.skills]
            );
        } else if (userType === 'employer') {
            await db.promise().query(
                'INSERT INTO employers (employer_id, company_name, website, location) VALUES (?, ?, ?, ?)',
                [userId, extraData.company_name, extraData.website, extraData.location]
            );
        }
        res.json({ message: 'Registered successfully' });
    } catch (err) {
        console.error('Register error:', err);
        res.status(400).json({ error: 'Email already exists or invalid data' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    const { email, password, userType } = req.body;
    console.log('Login attempt:', { email, userType });
    try {
        if (userType === 'admin') {
            console.log('Querying admins table for:', email);
            const [adminRows] = await db.promise().query('SELECT * FROM admins WHERE email = ?', [email]);
            const admin = adminRows[0];
            console.log('Admin query result:', admin);
            if (!admin) {
                console.log('No admin found for:', email);
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            if (!admin.password) {
                console.log('Admin password is null or empty for:', email);
                return res.status(500).json({ error: 'Invalid password configuration' });
            }
            console.log('Comparing password for:', email);
            const passwordMatch = await bcrypt.compare(password, admin.password);
            console.log('Password match:', passwordMatch);
            if (!passwordMatch) {
                console.log('Invalid password for admin:', email);
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            console.log('Admin login successful:', email);
            return res.json({ user: { admin_id: admin.admin_id, email: admin.email } });
        } else {
            console.log('Querying users table for:', email, userType);
            const [userRows] = await db.promise().query('SELECT * FROM users WHERE email = ? AND user_type = ?', [email, userType]);
            const user = userRows[0];
            console.log('User query result:', user);
            if (!user) {
                console.log('No user found for:', email, userType);
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            if (!user.password) {
                console.log('User password is null or empty for:', email);
                return res.status(500).json({ error: 'Invalid password configuration' });
            }
            console.log('Comparing password for:', email);
            const passwordMatch = await bcrypt.compare(password, user.password);
            console.log('Password match:', passwordMatch);
            if (!passwordMatch) {
                console.log('Invalid password for user:', email);
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            console.log('User login successful:', email);
            return res.json({ user: { user_id: user.user_id, name: user.name, email: user.email } });
        }
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});
// Get all jobs
app.get('/api/jobs', async (req, res) => {
    try {
        const [jobs] = await db.promise().query(`
            SELECT j.*, e.company_name 
            FROM jobs j 
            JOIN employers e ON j.employer_id = e.employer_id
        `);
        res.json(jobs);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Post a job
app.post('/api/jobs', async (req, res) => {
    const { employer_id, job_title, description, location, salary } = req.body;
    console.log('Job post attempt:', { employer_id, job_title, description, location, salary });
    try {
        if (!employer_id || !job_title || !description || !location || !salary) {
            console.log('Missing required fields');
            return res.status(400).json({ error: 'All fields are required' });
        }
        const [employerCheck] = await db.promise().query(
            'SELECT employer_id FROM employers WHERE employer_id = ?',
            [employer_id]
        );
        if (employerCheck.length === 0) {
            console.log('Invalid employer_id:', employer_id);
            return res.status(400).json({ error: 'Invalid employer' });
        }
        const salaryValue = parseFloat(salary);
        if (isNaN(salaryValue)) {
            console.log('Invalid salary format:', salary);
            return res.status(400).json({ error: 'Salary must be a valid number' });
        }
        const [result] = await db.promise().query(
            'INSERT INTO jobs (employer_id, job_title, description, location, salary) VALUES (?, ?, ?, ?, ?)',
            [employer_id, job_title, description, location, salaryValue]
        );
        console.log('Job posted successfully:', result.insertId);
        return res.status(201).json({ job_id: result.insertId, message: 'Job posted successfully' });
    } catch (err) {
        console.error('Job post error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// Get employer jobs
app.get('/api/employer/:id/jobs', async (req, res) => {
    try {
        const [jobs] = await db.promise().query('SELECT * FROM jobs WHERE employer_id = ?', [req.params.id]);
        res.json(jobs);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Apply for a job
app.post('/api/applications', async (req, res) => {
    const { job_id, applicant_id } = req.body;
    try {
        const [existing] = await db.promise().query(
            'SELECT * FROM applications WHERE job_id = ? AND applicant_id = ?',
            [job_id, applicant_id]
        );
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Already applied' });
        }
        await db.promise().query(
            'INSERT INTO applications (job_id, applicant_id) VALUES (?, ?)',
            [job_id, applicant_id]
        );
        res.json({ message: 'Application submitted' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get job applications
app.get('/api/jobs/:id/applications', async (req, res) => {
    try {
        const [applications] = await db.promise().query(`
            SELECT a.*, u.name, ap.resume_link, ap.skills 
            FROM applications a 
            JOIN applicants ap ON a.applicant_id = ap.applicant_id
            JOIN users u ON ap.applicant_id = u.user_id
            WHERE a.job_id = ?
        `, [req.params.id]);
        res.json(applications);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Update application status
app.put('/api/applications/:id', async (req, res) => {
    const { status } = req.body;
    try {
        await db.promise().query(
            'UPDATE applications SET status = ? WHERE application_id = ?',
            [status, req.params.id]
        );
        res.json({ message: 'Status updated' });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all users (admin)
app.get('/api/users', async (req, res) => {
    try {
        const [users] = await db.promise().query('SELECT user_id, name, email, user_type FROM users');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.listen(3000, () => console.log('Server running on port 3000'));