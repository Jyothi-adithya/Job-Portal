let currentUser = null;
let registerListenerBound = false;
let jobsCache = [];

function setStatus(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) {
        return;
    }
    el.textContent = message || '';
}

function setButtonLoading(buttonId, isLoading, loadingLabel) {
    const button = typeof buttonId === 'string' ? document.getElementById(buttonId) : buttonId;
    if (!button) {
        return;
    }
    button.disabled = isLoading;
    if (isLoading && loadingLabel) {
        button.dataset.originalLabel = button.textContent;
        button.textContent = loadingLabel;
    } else if (!isLoading && button.dataset.originalLabel) {
        button.textContent = button.dataset.originalLabel;
        delete button.dataset.originalLabel;
    }
}

function showToast(message, variant = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) {
        return;
    }
    const toast = document.createElement('div');
    toast.className = `toast toast--${variant}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3500);
}

function setRole(role, name) {
    const roleLabel = document.getElementById('role-label');
    const userName = document.getElementById('user-name');
    if (roleLabel) {
        roleLabel.textContent = role || 'Guest';
    }
    if (userName) {
        userName.textContent = name || 'Sign in to continue';
    }
}

function setLoggedInState(isLoggedIn) {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.classList.toggle('hidden', !isLoggedIn);
    }
}

function setKpiValue(id, value) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = value;
    }
}

function normalizeText(value) {
    return String(value || '').toLowerCase();
}

function parseSalary(value) {
    const parsed = Number(String(value || '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
}

function formatSalary(value) {
    const salary = parseSalary(value);
    if (!salary) {
        return 'Salary not listed';
    }
    return `$${salary.toLocaleString()}`;
}

function formatDate(value) {
    if (!value) {
        return 'Date not listed';
    }
    return new Date(value).toLocaleDateString();
}

function getCompanyInitials(name) {
    const cleaned = String(name || '').trim();
    if (!cleaned) {
        return 'CO';
    }
    const parts = cleaned.split(' ').filter(Boolean);
    const initials = parts.slice(0, 2).map(part => part[0].toUpperCase()).join('');
    return initials || cleaned.slice(0, 2).toUpperCase();
}

function getJobTags(job) {
    const location = normalizeText(job.location);
    const title = normalizeText(job.job_title);
    const description = normalizeText(job.description);
    const tags = [];

    if (location.includes('remote')) {
        tags.push('Remote');
    }

    if (title.includes('senior') || description.includes('senior') || title.includes('lead')) {
        tags.push('Senior');
    } else if (title.includes('junior') || description.includes('junior')) {
        tags.push('Junior');
    } else if (title.includes('intern') || description.includes('intern')) {
        tags.push('Intern');
    }

    if (title.includes('contract') || description.includes('contract')) {
        tags.push('Contract');
    } else if (title.includes('part time') || title.includes('part-time') || description.includes('part time') || description.includes('part-time')) {
        tags.push('Part-time');
    } else if (title.includes('full time') || title.includes('full-time') || description.includes('full time') || description.includes('full-time')) {
        tags.push('Full-time');
    }

    if (tags.length === 0) {
        tags.push('Full-time');
    }

    return tags.slice(0, 4);
}

function renderJobCards(jobs, targetId, options = {}) {
    const list = document.getElementById(targetId);
    if (!list) {
        return;
    }
    list.innerHTML = '';
    if (!jobs.length) {
        list.innerHTML = `<p>${options.emptyMessage || 'No jobs available.'}</p>`;
        return;
    }
    jobs.forEach(job => {
        const jobItem = document.createElement('div');
        jobItem.className = 'job-item job-card';
        const companyName = job.company_name || 'Company';
        const description = job.description || 'No description provided.';
        const location = job.location || 'Location not listed';
        const tagHtml = getJobTags(job).map(tag => `<span class="tag">${tag}</span>`).join('');
        const actions = options.actionBuilder ? options.actionBuilder(job) : '';
        jobItem.innerHTML = `
            <div class="job-card__header">
                <div class="company-avatar">${getCompanyInitials(companyName)}</div>
                <div>
                    <h4>${job.job_title}</h4>
                    <div class="company-name">${companyName}</div>
                </div>
                <span class="job-salary">${formatSalary(job.salary)}</span>
            </div>
            <p class="job-description">${description}</p>
            <div class="job-meta">
                <span>${location}</span>
                <span>Posted ${formatDate(job.posted_date)}</span>
            </div>
            <div class="tag-row">${tagHtml}</div>
            ${actions}
        `;
        list.appendChild(jobItem);
    });
}

function applyJobFilters() {
    const search = normalizeText(document.getElementById('job-search')?.value);
    const location = normalizeText(document.getElementById('job-location-filter')?.value);
    const role = normalizeText(document.getElementById('job-role-filter')?.value);
    const minSalary = parseSalary(document.getElementById('job-salary-min')?.value);
    const maxSalary = parseSalary(document.getElementById('job-salary-max')?.value);
    const sort = document.getElementById('job-sort')?.value || 'newest';

    let filtered = jobsCache.filter(job => {
        const title = normalizeText(job.job_title);
        const company = normalizeText(job.company_name);
        const description = normalizeText(job.description);
        const jobLocation = normalizeText(job.location);
        const salary = parseSalary(job.salary);

        if (search && !title.includes(search) && !company.includes(search) && !description.includes(search)) {
            return false;
        }
        if (location && !jobLocation.includes(location)) {
            return false;
        }
        if (role && !title.includes(role)) {
            return false;
        }
        if (minSalary && salary < minSalary) {
            return false;
        }
        if (maxSalary && salary > maxSalary) {
            return false;
        }
        return true;
    });

    if (sort === 'salary-desc') {
        filtered.sort((a, b) => parseSalary(b.salary) - parseSalary(a.salary));
    } else if (sort === 'salary-asc') {
        filtered.sort((a, b) => parseSalary(a.salary) - parseSalary(b.salary));
    } else if (sort === 'company-asc') {
        filtered.sort((a, b) => normalizeText(a.company_name).localeCompare(normalizeText(b.company_name)));
    } else {
        filtered.sort((a, b) => new Date(b.posted_date) - new Date(a.posted_date));
    }

    const countLabel = document.getElementById('job-count');
    if (countLabel) {
        countLabel.textContent = `${filtered.length} roles`;
    }
    setKpiValue('applicant-kpi-jobs', filtered.length);
    renderJobCards(filtered, 'job-list', {
        emptyMessage: jobsCache.length ? 'No jobs match these filters.' : 'No jobs available.',
        actionBuilder: job => `<button class="btn btn-primary" data-job-id="${job.job_id}">Apply</button>`
    });
    document.querySelectorAll('#job-list [data-job-id]').forEach(button => {
        button.addEventListener('click', async () => {
            const jobId = parseInt(button.getAttribute('data-job-id'));
            await applyForJob(jobId);
        });
    });
}

        function showLogin() {
            document.getElementById('auth-section')?.classList.remove('hidden');
            document.getElementById('login-form')?.classList.remove('hidden');
            document.getElementById('register-form')?.classList.add('hidden');
            document.getElementById('applicant-dashboard')?.classList.add('hidden');
            document.getElementById('employer-dashboard')?.classList.add('hidden');
            document.getElementById('admin-dashboard')?.classList.add('hidden');
            setRole('Guest', 'Sign in to continue');
            setLoggedInState(false);
            setStatus('login-error', '');
        }

        function showRegister() {
            document.getElementById('login-form')?.classList.add('hidden');
            document.getElementById('register-form')?.classList.remove('hidden');
            const type = document.getElementById('reg-user-type')?.value;
            document.getElementById('applicant-fields')?.classList.toggle('hidden', type !== 'applicant');
            document.getElementById('employer-fields')?.classList.toggle('hidden', type !== 'employer');
            setStatus('reg-error', '');
        }

        function logout() {
            currentUser = null;
            showLogin();
            showToast('Logged out', 'info');
        }

        async function login() {
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const userType = document.getElementById('login-user-type').value;
            setStatus('login-error', '');
            setButtonLoading('login-submit', true, 'Signing in...');
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, userType })
                });
                const data = await response.json();
                if (data.error) {
                    setStatus('login-error', data.error);
                    return;
                }
                currentUser = data.user;
                setRole(userType, currentUser.name || 'User');
                setLoggedInState(true);
                document.getElementById('auth-section')?.classList.add('hidden');
                if (userType === 'applicant') {
                    document.getElementById('applicant-name').textContent = currentUser.name || 'Applicant';
                    document.getElementById('applicant-dashboard').classList.remove('hidden');
                    loadJobs();
                    loadApplications();
                } else if (userType === 'employer') {
                    document.getElementById('employer-name').textContent = currentUser.name || 'Employer';
                    document.getElementById('employer-dashboard').classList.remove('hidden');
                    loadEmployerJobs();
                } else {
                    document.getElementById('admin-dashboard').classList.remove('hidden');
                    loadAdminData();
                }
                showToast('Welcome back', 'success');
            } catch (err) {
                setStatus('login-error', 'Server error');
            } finally {
                setButtonLoading('login-submit', false);
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

            setStatus('reg-error', '');
            setButtonLoading('register-submit', true, 'Creating...');
            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, userType, ...extraData })
                });
                const data = await response.json();
                if (data.error) {
                    setStatus('reg-error', data.error);
                    return;
                }
                showLogin();
                showToast('Account created. Please log in.', 'success');
            } catch (err) {
                setStatus('reg-error', 'Server error');
            } finally {
                setButtonLoading('register-submit', false);
            }
        }

        async function loadJobs() {
            try {
                const response = await fetch('/api/jobs');
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }   
                const jobs = await response.json();
                jobsCache = Array.isArray(jobs) ? jobs : [];
                applyJobFilters();
            } catch (err) {
                renderJobCards([], 'job-list', { emptyMessage: 'Error loading jobs.' });
            }
        }

        async function applyForJob(jobId) {
            try {
                const response = await fetch('/api/applications', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ job_id: jobId, applicant_id: currentUser.user_id })
                });
                if (!response.ok) {  
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
                }
                await response.json();
                showToast('Application submitted successfully!', 'success');
                loadApplications();
            } catch (err) {
                  showToast(`Failed to apply: ${err.message}`, 'error');
            }
        }            


            
        async function postJob() {
            const errorElement = document.getElementById('job-post-error');
            if (!currentUser || !currentUser.user_id) {
                setStatus('job-post-error', 'Please log in as an employer');
                return;
            }
            const employer_id = currentUser.user_id;
            const job_title = document.getElementById('job-title')?.value?.trim();
            const description = document.getElementById('job-description')?.value?.trim();
            const location = document.getElementById('job-location')?.value?.trim();
            const salary = document.getElementById('job-salary')?.value;
            const missingFields = [];
            if (!employer_id) missingFields.push('employer_id');
            if (!job_title) missingFields.push('job_title');
            if (!description) missingFields.push('description');
            if (!location) missingFields.push('location');
            if (!salary) missingFields.push('salary');
            if (missingFields.length > 0) {
                setStatus('job-post-error', `Please fill: ${missingFields.join(', ')}`);
                return;
            }
            setStatus('job-post-error', '');
            setButtonLoading('post-job-btn', true, 'Posting...');
            try {
                const response = await fetch('/api/jobs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ employer_id, job_title, description, location, salary })
                });
                const data = await response.json();
                
                if (data.error) {
                    setStatus('job-post-error', data.error);
                    return;
                }
                setStatus('job-post-error', 'Job posted successfully');
                showToast('Job posted successfully', 'success');
                document.getElementById('job-title').value = '';
                document.getElementById('job-description').value = '';
                document.getElementById('job-location').value = '';
                document.getElementById('job-salary').value = '';
                loadEmployerJobs();
            } catch (err) {
                setStatus('job-post-error', 'Failed to connect to server');
            } finally {
                setButtonLoading('post-job-btn', false);
            }
        }

        

        async function loadEmployerJobs() {
            if (!currentUser || !currentUser.user_id) {
                return;
            }    
            try {
                const response = await fetch(`/api/employer/jobs?employer_id=${currentUser.user_id}`);
                const jobs = await response.json();
                const safeJobs = Array.isArray(jobs) ? jobs : [];
                setKpiValue('employer-kpi-jobs', safeJobs.length);
                renderJobCards(safeJobs, 'employer-jobs-list', {
                    emptyMessage: 'No jobs posted yet.',
                    actionBuilder: job => `
                        <button class="btn btn-ghost" data-job-id="${job.job_id}">View Applicants</button>
                        <div class="applicants-list" id="applicants-${job.job_id}"></div>
                    `
                });
                document.querySelectorAll('#employer-jobs-list [data-job-id]').forEach(button => {
                    button.addEventListener('click', async () => {
                        const jobId = button.getAttribute('data-job-id');
                        await loadApplicants(jobId);
                    });
                });

            } catch (err) {      
                renderJobCards([], 'employer-jobs-list', { emptyMessage: 'Error loading jobs.' });
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
            const errorElement = document.getElementById('admin-error');
            if (!errorElement) {
                return;
            }    
            try {
                const usersResponse = await fetch('/api/admin/users');
                if (!usersResponse.ok) {
                        throw new Error(`HTTP error! Status: ${usersResponse.status}`);
                }
                const users = await usersResponse.json();
                const usersList = document.getElementById('admin-users-list');
                if (!usersList) {
                    setStatus('admin-error', 'UI error: missing admin-users-list element');
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
                setKpiValue('admin-kpi-users', users.length);
                
                const jobsResponse = await fetch('/api/admin/jobs');
                if (!jobsResponse.ok) {
                        throw new Error(`HTTP error! Status: ${jobsResponse.status}`);
                }
                const jobs = await jobsResponse.json();
                const safeJobs = Array.isArray(jobs) ? jobs : [];
                renderJobCards(safeJobs, 'admin-jobs-list', { emptyMessage: 'No jobs posted yet.' });
                setKpiValue('admin-kpi-jobs', safeJobs.length);
            } catch (err) {
                setStatus('admin-error', 'Failed to load data');  
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
       try {
           const response = await fetch(`/api/employer/application/${applicationId}/status`, {
               method: 'PATCH',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ status, employer_id: currentUser.user_id })
           });
           if (!response.ok) {
               const errorData = await response.json();
               throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
           }
           await response.json();
           showToast(`Application ${status} successfully!`, 'success');
           if (jobId) {
               loadApplicants(jobId);
           }
       } catch (err) {
           showToast(`Failed to update status: ${err.message}`, 'error');
       }
   }

async function loadApplications() {
       try {
           const response = await fetch(`/api/applicant/applications?applicant_id=${currentUser.user_id}`);
           if (!response.ok) {
               throw new Error(`HTTP error! Status: ${response.status}`);
           }
           const applications = await response.json();
           const applicationList = document.getElementById('application-list');
           if (!applicationList) {
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
           setKpiValue('applicant-kpi-apps', applications.length);
       } catch (err) {
           const applicationList = document.getElementById('application-list');
           if (applicationList) {
               applicationList.innerHTML = `<p>Error loading applications: ${err.message}</p>`;
           }
       }
   }

   function showApplicantDashboard() {
       document.querySelectorAll('.dashboard').forEach(d => d.classList.add('hidden'));
       const dashboard = document.getElementById('applicant-dashboard');
       if (dashboard) {
           dashboard.classList.remove('hidden');
           loadJobs();
           loadApplications();
       }
   }

   function initUI() {
       if (!registerListenerBound) {
           const select = document.getElementById('reg-user-type');
           if (select) {
               select.addEventListener('change', (e) => {
                   const type = e.target.value;
                   document.getElementById('applicant-fields')?.classList.toggle('hidden', type !== 'applicant');
                   document.getElementById('employer-fields')?.classList.toggle('hidden', type !== 'employer');
               });
               registerListenerBound = true;
           }
       }
        const filterInputs = [
            'job-search',
            'job-location-filter',
            'job-role-filter',
            'job-salary-min',
            'job-salary-max'
        ];
        filterInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', applyJobFilters);
            }
        });
        const sortSelect = document.getElementById('job-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', applyJobFilters);
        }
        const clearBtn = document.getElementById('clear-job-filters');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                filterInputs.forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.value = '';
                    }
                });
                if (sortSelect) {
                    sortSelect.value = 'newest';
                }
                applyJobFilters();
            });
        }
       setLoggedInState(false);
   }

   document.addEventListener('DOMContentLoaded', initUI);
    
          


 


