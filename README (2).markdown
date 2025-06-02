# Job Portal

![Job Portal](https://img.shields.io/badge/Status-Active-brightgreen)\
A web-based platform for job recruitment, enabling employers to post jobs, applicants to browse opportunities, and administrators to manage the system. Built with **Node.js**, **Express**, **MySQL**, and **bcrypt**, it features a responsive UI with **Flexbox** and **Grid** layouts.

## Table of Contents

- Project Overview
- Features
- Technologies Used
- Database Schema
- Installation
- Usage
- API Endpoints
- Challenges and Solutions
- Future Improvements
- Contributing
- License

## Project Overview

The Job Portal is a secure, user-friendly application designed to streamline job recruitment by connecting employers, job seekers, and administrators. It addresses inefficiencies in traditional job markets by providing a centralized platform for posting, browsing, and managing job listings. The system supports role-based access (employers, applicants, admins) and a responsive interface, ensuring accessibility and ease of use.

## Features

- **Role-Based Authentication**: Secure login/registration for employers (e.g., `employee1@gmail.com`), applicants (e.g., `aplicant1@gmail.com`), and admins (e.g., `newadmin@example.com`) using `bcrypt`.
- **Job Posting**: Employers can create job listings with details like title, description, location, and salary.
- **Job Listings**: Dynamic display of jobs in a Grid-based employer dashboard.
- **Responsive UI**: Flexbox/Grid layouts for a modern, device-friendly interface.
- **Database Integrity**: MySQL with foreign key constraints ensures reliable data management.

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Security**: bcrypt for password hashing
- **Frontend**: HTML, CSS (Flexbox, Grid), JavaScript
- **Tools**: npm, MySQL Command Line Client, Windows Command Prompt

## Database Schema

The `job_portal` database includes four main tables:

- `users`: Stores user details (`user_id`, `name`, `email`, `password`, `user_type`).
- `employers`: Links employers to users (`employer_id`, `company_name`, `location`).
- `jobs`: Stores job listings (`job_id`, `employer_id`, `job_title`, `description`, `location`, `salary`, `posted_date`).
- `admins`: Manages admin accounts (`admin_id`, `email`, `password`).

**Relationships**:

- `employers.employer_id` → `users.user_id` (foreign key).
- `jobs.employer_id` → `employers.employer_id` (foreign key).

**Constraints**:

- Primary keys: `user_id`, `job_id`, `admin_id`.
- `NOT NULL` and `UNIQUE` for critical fields (e.g., `email`).
- `ENUM` for `user_type` (`applicant`, `employer`).

## Installation

1. **Clone the Repository**:

   ```bash
   git clone https://github.com/your-username/job-portal.git
   cd job-portal
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

3. **Set Up MySQL Database**:

   - Install MySQL and log in:

     ```bash
     mysql -u root -p
     ```
   - Create the database and tables:

     ```sql
     CREATE DATABASE job_portal;
     USE job_portal;
     
     CREATE TABLE users (
         user_id INT AUTO_INCREMENT PRIMARY KEY,
         name VARCHAR(255) NOT NULL,
         email VARCHAR(255) UNIQUE NOT NULL,
         password VARCHAR(255) NOT NULL,
         user_type ENUM('applicant', 'employer') NOT NULL
     );
     
     CREATE TABLE employers (
         employer_id INT PRIMARY KEY,
         company_name VARCHAR(255) NOT NULL,
         website VARCHAR(255),
         location VARCHAR(255) NOT NULL,
         FOREIGN KEY (employer_id) REFERENCES users(user_id)
     );
     
     CREATE TABLE jobs (
         job_id INT AUTO_INCREMENT PRIMARY KEY,
         employer_id INT NOT NULL,
         job_title VARCHAR(255) NOT NULL,
         description TEXT NOT NULL,
         location VARCHAR(255) NOT NULL,
         salary DECIMAL(10,2) NOT NULL,
         posted_date DATE DEFAULT CURRENT_DATE,
         FOREIGN KEY (employer_id) REFERENCES employers(employer_id)
     );
     
     CREATE TABLE admins (
         admin_id INT AUTO_INCREMENT PRIMARY KEY,
         email VARCHAR(255) UNIQUE NOT NULL,
         password VARCHAR(255) NOT NULL
     );
     ```

4. **Configure Environment**:

   - Create a `.env` file in the root directory:

     ```env
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=your_password
     DB_NAME=job_portal
     PORT=3000
     ```
   - Update `server.js` to use environment variables with `dotenv`.

5. **Start the Server**:

   ```bash
   npm start
   ```

   - Access the app at `http://localhost:3000`.

## Usage

1. **Register/Login**:

   - Register as an employer or applicant via the login form.
   - Log in with credentials (e.g., `employee1@gmail.com`, `employer`).
   - Admins use separate credentials (e.g., `newadmin@example.com`).

2. **Post a Job** (Employers):

   - Navigate to the employer dashboard.
   - Fill in job details (e.g., “Personal Assistant”, “Bangalore”, “$50,000”) and submit.

3. **Browse Jobs** (Applicants):

   - View available jobs in the applicant dashboard.

4. **Admin Oversight**:

   - Access the admin dashboard to manage users and jobs.

## API Endpoints

- **POST /api/login**: Authenticate users/admins.
  - Request: `{ "email": "employee1@gmail.com", "password": "pass", "userType": "employer" }`
- **POST /api/register**: Register new users.
- **POST /api/jobs**: Create a job listing.
  - Request: `{ "employer_id": 1, "job_title": "Personal Assistant", "description": "Skills required", "location": "Bangalore", "salary": 50000 }`
- **GET /api/employer/jobs?employer_id=X**: Retrieve jobs for an employer.

## Challenges and Solutions

- **Login Error (TypeError)**: Fixed by adding `login-error` element in `index.html` and robust error handling in `login()`.
- **Job Posting Failure (“All fields are required”)**: Resolved by ensuring form inputs and validating `currentUser.user_id` in `postJob()`.
- **Empty Job Listings**: Implemented `loadEmployerJobs()` and `/api/employer/jobs` with proper database queries.
- **Database Integrity**: Addressed foreign key violations by ensuring `employers` records existed.

## Future Improvements

- Add **multi-factor authentication** (MFA) for enhanced security.
- Implement **advanced search** with filters (e.g., location, salary).
- Develop a **job application system** with resume uploads.
- Enhance admin dashboard with **analytics** and moderation tools.
- Create a **mobile app** using React Native.

## Contributing

Contributions are welcome! To contribute:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature-name`).
3. Commit changes (`git commit -m 'Add feature'`).
4. Push to the branch (`git push origin feature-name`).
5. Open a pull request.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

---

Developed by \[Jyothiradithya.P\]. For issues or suggestions, open a GitHub issue or contact \[jyothiradithya.p005@gmail.com\].