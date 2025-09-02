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
    console.log('Fetching all jobs');
    try {
        const [jobs] = await db.promise().query(
            `SELECT j.job_id, j.job_title, j.description, j.location, j.salary as j_salary, j.posted_date,
                   e.company_name
            FROM jobs j
            JOIN employers e ON j.employer_id = e.employer_id`
        );
        console.log('Jobs fetched:', jobs.length);
        res.json(jobs);
    } catch (err) {
        console.error('Error fetching jobs:', err.message, err.stack);
        res.status(500).json({ error: 'Server error', details: err.message });
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
app.get('/api/employer/jobs', async (req, res) => {
    const { employer_id } = req.query;
    console.log('Fetch jobs for employer:', employer_id);
    try {
        if (!employer_id) {
            console.log('Missing employer_id');
            return res.status(400).json({ error: 'Employer ID required' });
        }
        const [jobs] = await db.promise().query(
            'SELECT job_id, job_title, description, location, salary, posted_date FROM jobs WHERE employer_id = ?',
            [employer_id]
        );
        console.log('Jobs fetched:', jobs.length);
        res.json(jobs);
    } catch (err) {
        console.error('Fetch jobs error:', err);
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
app.post('/api/applications', async (req, res) => {
    const { job_id, applicant_id } = req.body;
    console.log(`Applying for job_id: ${job_id}, applicant_id: ${applicant_id}`);
    try {
        // Validate input
        if (!job_id || !applicant_id) {
            console.log('Missing job_id or applicant_id');
            return res.status(400).json({ error: 'Missing job_id or applicant_id' });
        }

        // Verify job exists
        const [jobCheck] = await db.promise().query(
            'SELECT job_id FROM jobs WHERE job_id = ?',
            [job_id]
        );
        if (jobCheck.length === 0) {
            console.log(`Job not found: job_id ${job_id}`);
            return res.status(404).json({ error: 'Job not found' });
        }

        // Verify applicant exists and is an applicant
        const [userCheck] = await db.promise().query(
            'SELECT user_id FROM users WHERE user_id = ? AND user_type = "applicant"',
            [applicant_id]
        );
        if (userCheck.length === 0) {
            console.log(`Invalid applicant: applicant_id ${applicant_id}`);
            return res.status(403).json({ error: 'Invalid applicant' });
        }

        // Check if application already exists
        const [existingApplication] = await db.promise().query(
            'SELECT application_id FROM applications WHERE job_id = ? AND applicant_id = ?',
            [job_id, applicant_id]
        );
        if (existingApplication.length > 0) {
            console.log(`Application already exists: job_id ${job_id}, applicant_id ${applicant_id}`);
            return res.status(409).json({ error: 'Application already submitted' });
        }

        // Insert application
        const [result] = await db.promise().query(
            'INSERT INTO applications (job_id, applicant_id, status) VALUES (?, ?, ?)',
            [job_id, applicant_id, 'applied']
        );
        console.log('Application created:', result.insertId);
        res.status(201).json({ message: 'Application submitted', application_id: result.insertId });
    } catch (err) {
        console.error('Apply for job error:', err.message, err.stack);
        res.status(500).json({ error: 'Server error', details: err.message });
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

app.get('/api/admin/users', async (req, res) => {
    console.log('Fetch all users for admin');
    try {
        const [users] = await db.promise().query(
            'SELECT user_id, name, email, user_type FROM users'
        );
        console.log('Users fetched:', users.length);
        res.json(users);
    } catch (err) {
        console.error('Fetch users error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/admin/jobs', async (req, res) => {
    console.log('Fetch all jobs for admin');
    try {
        const [jobs] = await db.promise().query(
            'SELECT job_id, job_title, description, location, salary, posted_date FROM jobs'
        );
        console.log('Jobs fetched:', jobs.length);
        res.json(jobs);
    } catch (err) {
        console.error('Fetch jobs error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/employer/job/:jobId/applicants', async (req, res) => {
    const jobId = parseInt(req.params.jobId);
    const employerId = parseInt(req.query.employer_id);
    console.log(`Fetching applicants for job_id: ${jobId}, employer_id: ${employerId}`);
    try {
        if (isNaN(jobId) || isNaN(employerId)) {
            return res.status(400).json({ error: 'Invalid job_id or employer_id' });
        }
        const [jobCheck] = await db.promise().query(
            'SELECT job_id, employer_id FROM jobs WHERE job_id = ? AND employer_id = ?',
            [jobId, employerId]
        );
        if (jobCheck.length === 0) {
            return res.status(403).json({ error: 'Unauthorized or job not found' });
        }
        const [applicants] = await db.promise().query(
            `SELECT a.application_id, a.job_id, a.applicant_id, a.application_date, a.status,
                    u.name, u.email
             FROM applications a
             LEFT JOIN users u ON a.applicant_id = u.user_id
             WHERE a.job_id = ? AND (u.user_type = 'applicant' OR u.user_type IS NULL)`,
            [jobId]
        );
        console.log('Applicants fetched:', applicants.length);
        res.json(applicants);
    } catch (err) {
        console.error('Fetch applicants error:', err.message, err.stack);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

const nodemailer = require('nodemailer');

   // Configure Nodemailer with valid credentials
   const transporter = nodemailer.createTransport({
       service: 'gmail',
       auth: {
           user: 'jyothiradithya.p005@gmail.com', // Replace with your Gmail address
           pass: 'ltvt jhew tvjy ejrs'     // Replace with the App Password
       }
   });

   app.patch('/api/employer/application/:applicationId/status', async (req, res) => {
       const { applicationId } = req.params;
       const { status, employer_id } = req.body;
       console.log(`Updating status for application_id: ${applicationId}, status: ${status}, employer_id: ${employer_id}`);
       try {
           if (!['accepted', 'rejected'].includes(status)) {
               console.log('Invalid status:', status);
               return res.status(400).json({ error: 'Invalid status' });
           }
           if (!employer_id) {
               console.log('Missing employer_id');
               return res.status(400).json({ error: 'Missing employer_id' });
           }

           // Verify application exists and job belongs to employer
           console.log('Executing application check query');
           const [applicationCheck] = await db.promise().query(
               `SELECT a.application_id, a.job_id, a.applicant_id, j.employer_id, u.name, u.email, 
                       u.email_notifications
                FROM applications a
                JOIN jobs j ON a.job_id = j.job_id
                JOIN users u ON a.applicant_id = u.user_id
                WHERE a.application_id = ? AND j.employer_id = ?`,
               [parseInt(applicationId), parseInt(employer_id)]
           );
           console.log('Application check result:', JSON.stringify(applicationCheck, null, 2));
           if (applicationCheck.length === 0) {
               console.log(`Application not found or unauthorized: application_id ${applicationId}, employer_id ${employer_id}`);
               return res.status(403).json({ error: 'Application not found or unauthorized' });
           }

           // Update application status
           console.log('Updating application status');
           await db.promise().query(
               'UPDATE applications SET status = ? WHERE application_id = ?',
               [status, parseInt(applicationId)]
           );
           console.log(`Application ${applicationId} updated to status: ${status}`);

           // Send email notification if enabled
           const { name, email, email_notifications } = applicationCheck[0];
           console.log(`Email notifications for ${email}: ${email_notifications}`);
           if (email_notifications == 1) {
               const mailOptions = {
                   from: 'your-actual-email@gmail.com',
                   to: email,
                   subject: `Application Status Update for Job ID ${applicationCheck[0].job_id}`,
                   text: `Dear ${name},\n\nYour application for Job ID ${applicationCheck[0].job_id} has been ${status}.\n\nThank you,\nJob Portal Team`
               };
               try {
                   console.log(`Sending email to ${email}`);
                   await transporter.sendMail(mailOptions);
                   console.log(`Email sent to ${email} for application_id ${applicationId}`);
               } catch (emailErr) {
                   console.error('Email sending error:', emailErr.message, emailErr.stack);
                   // Continue despite email failure
               }
           } else {
               console.log(`Email notifications disabled for user ${email}`);
           }

           res.json({ message: 'Application status updated' });
       } catch (err) {
           console.error('Update application status error:', err.message, err.stack);
           res.status(500).json({ error: 'Server error', details: err.message });
       }
   });

   
app.get('/api/applicant/applications', async (req, res) => {
       const applicantId = parseInt(req.query.applicant_id);
       console.log(`Fetching applications for applicant_id: ${applicantId}`);
       try {
           if (isNaN(applicantId)) {
               console.log('Invalid applicant_id:', req.query.applicant_id);
               return res.status(400).json({ error: 'Invalid applicant_id' });
           }

           const [applications] = await db.promise().query(
               `SELECT a.application_id, a.job_id, a.application_date, a.status,
                       j.job_title, e.company_name
                FROM applications a
                JOIN jobs j ON a.job_id = j.job_id
                JOIN employers e ON j.employer_id = e.employer_id
                WHERE a.applicant_id = ?`,
               [applicantId]
           );
           console.log('Applications fetched:', applications.length);
           res.json(applications);
       } catch (err) {
           console.error('Fetch applications error:', err.message, err.stack);
           res.status(500).json({ error: 'Server error', details: err.message });
       }
   }); 
   
app.get('/api/test-email', async (req, res) => {
    try {
        await transporter.sendMail({
            from: 'rvit23bis119.rvitm@rvei.edu.in',
            to: 'jyothiradithya.p005@gmail.com',
            subject: 'Test Email',
            text: 'This is a test email.'
        });
        res.json({ message: 'Email sent' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});   


const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.listen(3000, () => console.log('Server running on port 3000'));