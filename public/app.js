let currentUser = null;

        function showLogin() {
            document.getElementById('login-form').classList.remove('hidden');
            document.getElementById('register-form').classList.add('hidden');
            document.getElementById('applicant-dashboard').classList.add('hidden');
            document.getElementById('employer-dashboard').classList.add('hidden');
            document.getElementById('admin-dashboard').classList.add('hidden');
        }

        function showRegister() {
            document.getElementById('login-form').classList.add('hidden');
            document.getElementById('register-form').classList.remove('hidden');
            document.getElementById('reg-user-type').addEventListener('change', (e) => {
                const type = e.target.value;
                document.getElementById('applicant-fields').classList.toggle('hidden', type !== 'applicant');
                document.getElementById('employer-fields').classList.toggle('hidden', type !== 'employer');
            });
        }

        async function login() {
            console.log('Login button clicked');
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const userType = document.getElementById('login-user-type').value;
            console.log('Sending:', JSON.stringify({ email, password, userType }, null, 2));
            const errorElement = document.getElementById('login-error');
            if (!errorElement) {
                console.error('login-error element not found in DOM');
                alert('Login failed: UI error (missing login-error element)');
                return;
            }
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, userType })
                });
                console.log('Response status:', response.status);
                const data = await response.json();
                console.log('Response data:', JSON.stringify(data, null, 2));
                if (data.error) {
                    console.log('Server returned error:', data.error);
                    document.getElementById('login-error').textContent = data.error;
                    return;
                }
                currentUser = data.user;
                console.log('Current user set:', JSON.stringify(currentUser, null, 2));
                if (userType === 'applicant') {
                    console.log('Navigating to applicant dashboard');
                    document.getElementById('applicant-name').textContent = currentUser.name || 'Applicant';
                    document.getElementById('applicant-dashboard').classList.remove('hidden');
                    document.getElementById('login-form').classList.add('hidden');
                    loadJobs();
                } else if (userType === 'employer') {
                    console.log('Navigating to employer dashboard');
                    document.getElementById('employer-name').textContent = currentUser.name || 'Employer';
                    document.getElementById('employer-dashboard').classList.remove('hidden');
                    document.getElementById('login-form').classList.add('hidden');
                    loadEmployerJobs();
                } else {
                    console.log('Navigating to admin dashboard');
                    document.getElementById('admin-dashboard').classList.remove('hidden');
                    document.getElementById('login-form').classList.add('hidden');
                    loadAdminData();
                }
            } catch (err) {
                console.error('Fetch error:', err);
                document.getElementById('login-error').textContent = 'Server error';
            }
        }
        
        async function register() {
            const name = document.getElementById('reg-name').value;
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            const userType = document.getElementById('reg-user-type').value;
            const extraData = userType === 'applicant' ? {
                resume_link: document.getElementById('reg-resume').value,
                skills: document.getElementById('reg-skills').value
            } : {
                company_name: document.getElementById('reg-company').value,
                website: document.getElementById('reg-website').value,
                location: document.getElementById('reg-location').value
            };

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, userType, ...extraData })
                });
                const data = await response.json();
                if (data.error) {
                    document.getElementById('reg-error').textContent = data.error;
                    return;
                }
                showLogin();
            } catch (err) {
                document.getElementById('reg-error').textContent = 'Server error';
            }
        }

        async function loadJobs() {
            console.log('loadJobs called');
            try {
                const response = await fetch('/api/jobs');
                console.log('Jobs response status:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }   
                const jobs = await response.json();
                console.log('Jobs data:', jobs);
                const jobList = document.getElementById('job-list');
                if (!jobList) {
                    console.error('job-list element not found');
                    alert('UI error: missing job-list element');
                    return;  
                }    

                jobList.innerHTML = '';
                if (jobs.length === 0) {
                    jobList.innerHTML = '<p>No jobs available.</p>';
                    return;
                }    
                jobs.forEach(job => {
                    const jobItem = document.createElement('div');
                    jobItem.className = 'job-item';
                    jobItem.innerHTML = `
                        <h4>${job.job_title}</h4>
                        <p>${job.description}</p>
                        <p>Location: ${job.location}</p>
                        <p>Salary: $${job.salary}</p>
                        <p>Posted: ${new Date(job.posted_date).toLocaleDateString()}</p>
                        <p>Company: ${job.company_name}</p>
                        <button class="apply-btn" data-job-id="${job.job_id}">Apply</button>
                    `;
                    jobList.appendChild(jobItem);
                });
                document.querySelectorAll('.apply-btn').forEach(button => {
                    button.addEventListener('click', async () => {
                       const jobId = parseInt(button.getAttribute('data-job-id'));
                       await applyForJob(jobId);
                    });
                });        
            } catch (err) {
                console.error('loadJobs error:', err);
                jobList.innerHTML = '<p>Error loading jobs.</p>';
            }
        }

        async function applyForJob(jobId) {
            console.log(`Applying for job_id: ${jobId}, applicant_id: ${currentUser.user_id}`);
            try {
                const response = await fetch('/api/applications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ job_id: jobId, applicant_id: currentUser.user_id })
                });
                console.log('Apply response status:', response.status);
                if (!response.ok) {  
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
                }
                const data = await response.json();
                console.log('Apply response:', data);
                alert('Application submitted successfully!');
                // Optionally refresh job list or update UI  
            } catch (err) {
                  console.error('Apply for job error:', err);
                  alert(`Failed to apply: ${err.message}`);  
            }
        }            


            
        async function postJob() {
            console.log('Post job button clicked');
            const errorElement = document.getElementById('job-post-error');
            if (!errorElement) {
                    console.error('job-post-error element not found');
                    alert('UI error: missing job-post-error element');
                    return;
                }
            if (!currentUser || !currentUser.user_id) {
                console.error('No logged-in employer found');
                document.getElementById('job-post-error').textContent = 'Please log in as an employer';
                alert('Please log in as an employer');
                return;
            }
            const employer_id = currentUser.user_id;
            const job_title = document.getElementById('job-title')?.value?.trim();
            const description = document.getElementById('job-description')?.value?.trim();
            const location = document.getElementById('job-location')?.value?.trim();
            const salary = document.getElementById('job-salary')?.value;
            console.log('Form values:', { employer_id, job_title, description, location, salary });
            const missingFields = [];
            if (!employer_id) missingFields.push('employer_id');
            if (!job_title) missingFields.push('job_title');
            if (!description) missingFields.push('description');
            if (!location) missingFields.push('location');
            if (!salary) missingFields.push('salary');
            if (missingFields.length > 0) {
                console.error('Missing required fields:', missingFields);
                document.getElementById('job-post-error').textContent = `Please fill: ${missingFields.join(', ')}`;
                alert(`Please fill: ${missingFields.join(', ')}`);
                return;
            }
            try {
                const response = await fetch('/api/jobs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ employer_id, job_title, description, location, salary })
                });
                console.log('Response status:', response.status);
                const data = await response.json();
                console.log('Response data:', JSON.stringify(data, null, 2));
                const errorElement = document.getElementById('job-post-error');
                
                if (data.error) {
                    console.log('Server returned error:', data.error);
                    errorElement.textContent = data.error;
                    return;
                }
                errorElement.textContent = 'Job posted successfully';
                document.getElementById('job-title').value = '';
                document.getElementById('job-description').value = '';
                document.getElementById('job-location').value = '';
                document.getElementById('job-salary').value = '';
                loadEmployerJobs();
            } catch (err) {
                console.error('Fetch error:', err);
                errorElement.textContent = 'Failed to connect to server';
            }
        }

        

        async function loadEmployerJobs() {
            console.log('loadEmployerJobs called');
            if (!currentUser || !currentUser.user_id) {
                console.error('No logged-in employer found');
                return;
            }    
            try {
                const response = await fetch(`/api/employer/jobs?employer_id=${currentUser.user_id}`);
                console.log('Response status:', response.status);
                const jobs = await response.json();
                console.log('Jobs data:', JSON.stringify(jobs, null, 2));
                const jobList = document.getElementById('employer-jobs-list');
                if (!jobList) {
                    console.error('employer-jobs-list element not found');
                    alert('UI error: missing employer-jobs-list element');
                    return;
                }
                jobList.innerHTML = '';
                if (jobs.length === 0) {
                        jobList.innerHTML = '<p>No jobs posted yet.</p>';
                        return;
                }
                jobs.forEach(job => {     
                const jobItem = document.createElement('div');
                jobItem.className = 'job-item';
                jobItem.innerHTML = `
                    <h3>${job.job_title}</h3>
                    <p>${job.description}</p>
                    <p>Location: ${job.location}</p>
                    <p>Salary: $${job.salary}</p>
                    <p>Posted: ${new Date(job.posted_date).toLocaleDateString()}</p>
                    <button class="view-applicants-btn" data-job-id="${job.job_id}">View Applicants</button>
                    <div class="applicants-list" id="applicants-${job.job_id}"></div>
                `; 
                jobList.appendChild(jobItem);
                }); 
                document.querySelectorAll('.view-applicants-btn').forEach(button => {
                    button.addEventListener('click', async () => {
                        const jobId = button.getAttribute('data-job-id');
                        await loadApplicants(jobId);
                    });
                });        

            } catch (err) {      
                console.error('loadEmployerJobs error:', err);
                const jobList = document.getElementById('employer-jobs-list');
                if (jobList) {
                    jobList.innerHTML = '<p>Error loading jobs.</p>';
                }    
            }
        }    
        async function viewApplications(jobId) {
            try {
                const response = await fetch(`/api/jobs/${jobId}/applications`);
                const applications = await response.json();
                const jobListings = document.getElementById('employer-jobs');
                jobListings.innerHTML = '<h3>Applications</h3>';
                applications.forEach(app => {
                    const div = document.createElement('div');
                    div.className = 'job-listing';
                    div.innerHTML = `
                        <p>Applicant: ${app.name}</p>
                        <p>Resume: <a href="${app.resume_link}" target="_blank">View</a></p>
                        <p>Skills: ${app.skills}</p>
                        <p>Status: ${app.status}</p>
                        <select onchange="updateApplicationStatus(${app.application_id}, this.value)">
                            <option value="applied" ${app.status === 'applied' ? 'selected' : ''}>Applied</option>
                            <option value="reviewed" ${app.status === 'reviewed' ? 'selected' : ''}>Reviewed</option>
                            <option value="rejected" ${app.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                            <option value="accepted" ${app.status === 'accepted' ? 'selected' : ''}>Accepted</option>
                        </select>
                    `;
                    jobListings.appendChild(div);
                });
            } catch (err) {
                console.error(err);
            }
        }

        async function updateApplicationStatus(applicationId, status) {
            try {
                const response = await fetch(`/api/applications/${applicationId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                });
                const data = await response.json();
                if (data.error) {
                    alert(data.error);
                    return;
                }
                alert('Status updated!');
            } catch (err) {
                alert('Server error');
            }
        }

        async function loadAdminData() {
            console.log('loadAdminData called');
            const errorElement = document.getElementById('admin-error');
            if (!errorElement) {
                console.error('admin-error element not found');
                alert('UI error: missing admin-error element');
                return;
            }    
            try {
                const usersResponse = await fetch('/api/admin/users');
                console.log('Users response status:', usersResponse.status);
                if (!usersResponse.ok) {
                        throw new Error(`HTTP error! Status: ${usersResponse.status}`);
                }
                const users = await usersResponse.json();
                console.log('Users data:', JSON.stringify(users, null, 2));
                const usersList = document.getElementById('admin-users-list');
                if (!usersList) {
                    console.error('admin-users-list element not found');
                    errorElement.textContent = 'UI error: missing admin-users-list element';
                    return;
                }
                usersList.innerHTML = '';
                if (users.length === 0) {
                       usersList.innerHTML = '<p>No users registered.</p>';
                } else {
                      users.forEach(user => {
                          const userItem = document.createElement('div');
                          userItem.className = 'user-item';
                          userItem.innerHTML = ` 
                            <p>ID: ${user.user_id}</p>
                            <p>Name: ${user.name}</p>
                            <p>Email: ${user.email}</p>
                            <p>Type: ${user.user_type}</p>
                        `;
                        usersList.appendChild(userItem);
                    });
                }
                
                const jobsResponse = await fetch('/api/admin/jobs');
                console.log('Jobs response status:', jobsResponse.status);
                if (!jobsResponse.ok) {
                        throw new Error(`HTTP error! Status: ${jobsResponse.status}`);
                }
                const jobs = await jobsResponse.json();
                console.log('Jobs data:', JSON.stringify(jobs, null, 2));
                const jobsList = document.getElementById('admin-jobs-list');
                if (!jobsList) {
                    console.error('admin-jobs-list element not found');
                    errorElement.textContent = 'UI error: missing admin-jobs-list element';
                    return;
                }
                jobsList.innerHTML = '';
                if (jobs.length === 0) {
                      jobsList.innerHTML = '<p>No jobs posted yet.</p>';
                } else {
                    jobs.forEach(job => {
                        const jobItem = document.createElement('div');
                        jobItem.className = 'job-item';
                        jobItem.innerHTML = `
                        <h3>${job.job_title}</h3>
                        <p>${job.description}</p>
                        <p>Location: ${job.location}</p>
                        <p>Salary: $${job.salary}</p>
                        <p>Posted: ${new Date(job.posted_date).toLocaleDateString()}</p>
                        `;
                        jobsList.appendChild(jobItem);
                    });   
                }
            } catch (err) {
                console.error('loadAdminData error:', err);
                errorElement.textContent = 'Failed to load data';  
            }  
        }  
       async function loadApplicants(jobId) {
       console.log(`loadApplicants called for job_id: ${jobId}`);
       try {
           const response = await fetch(`/api/employer/job/${jobId}/applicants?employer_id=${currentUser.user_id}`);
           console.log('Applicants response status:', response.status);
           if (!response.ok) {
               throw new Error(`HTTP error! Status: ${response.status}`);
           }
           const applicants = await response.json();
           console.log('Applicants data:', JSON.stringify(applicants, null, 2));
           const applicantsList = document.getElementById(`applicants-${jobId}`);
           if (!applicantsList) {
               console.error(`applicants-${jobId} element not found`);
               return;
           }
           applicantsList.innerHTML = '';
           if (applicants.length === 0) {
               applicantsList.innerHTML = '<p>No applicants yet.</p>';
           } else {
               applicants.forEach(applicant => {
                   const applicantItem = document.createElement('div');
                   applicantItem.className = 'applicant-item';
                   applicantItem.innerHTML = `
                       <p>Name: ${applicant.name}</p>
                       <p>Email: ${applicant.email}</p>
                       <p>Applied: ${new Date(applicant.application_date).toLocaleDateString()}</p>
                       <p>Status: ${applicant.status}</p>
                       ${applicant.status === 'applied' ? `
                           <button class="accept-btn" data-application-id="${applicant.application_id}">Accept</button>
                           <button class="reject-btn" data-application-id="${applicant.application_id}">Reject</button>
                       ` : ''}
                   `;
                   applicantsList.appendChild(applicantItem);
               });
           }
           // Add event listeners for status buttons
           document.querySelectorAll('.accept-btn').forEach(button => {
               button.addEventListener('click', async () => {
                   const applicationId = button.getAttribute('data-application-id');
                   await updateApplicationStatus(applicationId, 'accepted', jobId);
               });
           });
           document.querySelectorAll('.reject-btn').forEach(button => {
               button.addEventListener('click', async () => {
                   const applicationId = button.getAttribute('data-application-id');
                   await updateApplicationStatus(applicationId, 'rejected', jobId);
               });
           });
       } catch (err) {
           console.error('loadApplicants error:', err);
           const applicantsList = document.getElementById(`applicants-${jobId}`);
           if (applicantsList) {
               applicantsList.innerHTML = `<p>Error loading applicants: ${err.message}</p>`;
           }
       }
   }
   
        async function updateApplicationStatus(applicationId, status, jobId) {
       console.log(`Updating application_id: ${applicationId} to status: ${status}`);
       try {
           const response = await fetch(`/api/employer/application/${applicationId}/status`, {
               method: 'PATCH',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ status, employer_id: currentUser.user_id })
           });
           console.log('Update status response status:', response.status);
           if (!response.ok) {
               const errorData = await response.json();
               throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
           }
           const data = await response.json();
           console.log('Update status response:', data);
           alert(`Application ${status} successfully!`);
           loadApplicants(jobId); // Refresh applicants list
       } catch (err) {
           console.error('Update application status error:', err);
           alert(`Failed to update status: ${err.message}`);
       }
   }

async function loadApplications() {
       console.log('loadApplications called');
       try {
           const response = await fetch(`/api/applicant/applications?applicant_id=${currentUser.user_id}`);
           console.log('Applications response status:', response.status);
           if (!response.ok) {
               throw new Error(`HTTP error! Status: ${response.status}`);
           }
           const applications = await response.json();
           console.log('Applications data:', JSON.stringify(applications, null, 2));
           const applicationList = document.getElementById('application-list');
           if (!applicationList) {
               console.error('application-list element not found');
               alert('UI error: Could not load applications');
               return;
           }
           applicationList.innerHTML = '';
           if (applications.length === 0) {
               applicationList.innerHTML = '<p>No applications submitted.</p>';
           } else {
               applications.forEach(app => {
                   const appItem = document.createElement('div');
                   appItem.className = 'application-item';
                   appItem.innerHTML = `
                       <h4>${app.job_title}</h4>
                       <p>Company: ${app.company_name}</p>
                       <p>Applied: ${new Date(app.application_date).toLocaleDateString()}</p>
                       <p>Status: ${app.status}</p>
                   `;
                   applicationList.appendChild(appItem);
               });
           }
       } catch (err) {
           console.error('loadApplications error:', err);
           applicationList.innerHTML = `<p>Error loading applications: ${err.message}</p>`;
       }
   }

   function showApplicantDashboard() {
       console.log('Showing applicant dashboard');
       document.querySelectorAll('.dashboard').forEach(d => d.classList.add('hidden'));
       const dashboard = document.getElementById('applicant-dashboard');
       if (dashboard) {
           dashboard.classList.remove('hidden');
           loadJobs();
           loadApplications(); // Load applications when showing dashboard
       } else {
           console.error('applicant-dashboard element not found');
       }
   }
    
          


 


