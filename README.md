# Job Portal System

A simple job portal with applicant, employer, and admin workflows. Applicants can browse and apply to jobs, employers can post jobs and review applicants, and admins can view all users and jobs.

## Features
- Applicant registration/login, job browsing, and applications
- Employer registration/login, job posting, and applicant review
- Admin login with global user/job visibility
- Modern UI/UX with search, filters, sorting, tags, and company logo initials

## Tech Stack
- Node.js + Express
- MySQL (mysql2)
- bcrypt for password hashing
- Vanilla HTML/CSS/JS frontend

## Getting Started

### 1) Install dependencies
```
npm install
```

### 2) Configure MySQL
Create the database and tables using [schema.sql](schema.sql).
```
mysql -u root -p < schema.sql
```

By default, the server connects with:
- host: localhost
- user: root
- password: adithya2005
- database: job_portal

You can update these in [server.js](server.js).

### 3) Run the server
```
npm start
```
Then open http://localhost:3000

## Notes
- Admin passwords are verified with bcrypt in the API. If you insert an admin manually, store a bcrypt hash in the admins table, not plain text.
- Job salary from `/api/jobs` is aliased as `j_salary` in [server.js](server.js). The UI reads `salary`, so adjust the query or UI if salaries do not appear.

## Project Structure
- [server.js](server.js) - Express API and MySQL queries
- [schema.sql](schema.sql) - Database schema
- [public/index.html](public/index.html) - UI markup
- [public/style.css](public/style.css) - UI styles
- [public/app.js](public/app.js) - UI behavior

## Scripts
- `npm start` - Run the server
