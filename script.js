document.addEventListener('DOMContentLoaded', () => {
    let currentUser = null;
    let currentResumeId = null;

    // ---------- AUTH HELPERS ---------- //
    function showAuthForm(mode = 'login') {
        const authTitle = document.getElementById('authTitle');
        const authSubmitBtn = document.getElementById('authSubmitBtn');
        const emailInput = document.getElementById('email');
        const switchAuthMode = document.getElementById('switchAuthMode');

        if (!authTitle) return; // not on login page

        authTitle.textContent = mode === 'login' ? 'Login' : 'Register';
        authSubmitBtn.textContent = mode === 'login' ? 'Login' : 'Register';
        emailInput.style.display = mode === 'register' ? 'block' : 'none';
        switchAuthMode.textContent =
            mode === 'login' ? 'Need to register?' : 'Already have an account?';
    }

    async function checkSession() {
        try {
            const res = await fetch('/api/check-session');
            if (!res.ok) return null;
            const data = await res.json();
            return data.user;
        } catch {
            return null;
        }
    }

    async function initialAuth() {
        const resumeForm = document.getElementById('resumeForm');
        if (resumeForm) {
            // On resume page → must be logged in
            currentUser = await checkSession();
            if (!currentUser) {
                window.location.href = 'index.html';
            } else {
                document.getElementById('userInfo').textContent = `Welcome, ${currentUser.username}`;
            }
        } else {
            // On login page
            showAuthForm('login');
        }
    }

    async function logout() {
        try {
            await fetch('/api/logout', { method: 'POST' });
        } catch (err) {
            console.error('Logout error:', err);
        }
        currentUser = null;
        window.location.href = 'index.html';
    }

    // ---------- LOGIN / REGISTER EVENTS ---------- //
    const switchAuthModeBtn = document.getElementById('switchAuthMode');
    if (switchAuthModeBtn) {
        switchAuthModeBtn.addEventListener('click', () => {
            const isLogin = document.getElementById('authTitle').textContent === 'Login';
            showAuthForm(isLogin ? 'register' : 'login');
        });
    }

    const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
    if (forgotPasswordBtn) {
        forgotPasswordBtn.addEventListener('click', async () => {
            const email = prompt('Enter your registered email:');
            if (!email) return;
            try {
                const res = await fetch('/api/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await res.json();
                alert(data.message || 'If this email exists, a reset link has been sent.');
            } catch {
                alert('Failed to send reset link.');
            }
        });
    }

    const authForm = document.getElementById('authForm');
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const usernameOrEmail = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value.trim();
            const email = document.getElementById('email').value.trim();
            const isLogin = document.getElementById('authTitle').textContent === 'Login';

            if (!usernameOrEmail || !password || (!isLogin && !email)) {
                return alert('Please fill all required fields.');
            }

            const endpoint = isLogin ? '/api/login' : '/api/register';
            const body = isLogin
                ? { usernameOrEmail, password }
                : { username: usernameOrEmail, email, password };

            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const data = await res.json();
                if (!res.ok) {
                    alert(data.error || 'Authentication error');
                    return;
                }

                if (isLogin) {
                    currentUser = data.user;
                    if (window.Swal) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Login Successful!',
                            text: `Welcome, ${currentUser.username}`,
                            showConfirmButton: false,
                            timer: 1500
                        }).then(() => {
                            window.location.href =
                                currentUser.username === 'admin' ? 'admin.html' : 'resume.html';
                        });
                    } else {
                        alert(`Welcome, ${currentUser.username}`);
                        window.location.href =
                            currentUser.username === 'admin' ? 'admin.html' : 'resume.html';
                    }
                } else {
                    alert('Registration successful! Please login.');
                    showAuthForm('login');
                }
            } catch (err) {
                console.error('Auth error:', err);
                alert('Server error.');
            }
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // ---------- RESUME MATCHING (RESUME PAGE) ---------- //
    const resumeForm = document.getElementById('resumeForm');
    if (resumeForm) {
        // PDF.js worker setup
        if (window.pdfjsLib) {
            pdfjsLib.GlobalWorkerOptions.workerSrc =
                'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        }

        resumeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentUser) return alert('Please login first.');

            const candidateNameInput = document.getElementById('candidateName');
            const jobRoleInput = document.getElementById('jobRole');
            const fileInput = document.getElementById('resumeFile');
            const jobDescInput = document.getElementById('jobDescription');
            const loader = document.getElementById('loader');

            if (!candidateNameInput.value.trim()) return alert('Please enter your name.');
            if (!jobRoleInput.value.trim()) return alert('Please enter a job role.');
            if (!fileInput.files[0]) return alert('Please upload a PDF file.');
            if (!jobDescInput.value.trim()) return alert('Please enter a job description.');

            const candidateName = candidateNameInput.value.trim();
            const jobRole = jobRoleInput.value.trim();
            const file = fileInput.files[0];
            const jobDescription = jobDescInput.value.trim();

            try {
                if (loader) loader.style.display = 'block';

                // 1) Upload resume
                const formData = new FormData();
                formData.append('resume', file);

                const uploadRes = await fetch('/api/upload-resume', {
                    method: 'POST',
                    body: formData
                });
                if (!uploadRes.ok) throw new Error('Resume upload failed');
                const uploadData = await uploadRes.json();
                currentResumeId = uploadData.resumeId;

                // 2) Extract text from PDF
                const resumeText = await extractTextFromPDF(file);

                // 3) Call AI analyze-match API with candidate name
                const analyzeRes = await fetch('/api/analyze-match', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        resumeText,
                        jobDescription,
                        resumeId: currentResumeId,
                        jobRole: jobRole,
                        candidateName: candidateName  // Include candidate name
                    })
                });
                if (!analyzeRes.ok) throw new Error('AI analysis failed');
                const results = await analyzeRes.json();

                // 4) Display AI results
                displayAIResults(results);
            } catch (err) {
                console.error('Error analyzing resume:', err);
                alert('Error analyzing resume: ' + err.message);
            } finally {
                if (loader) loader.style.display = 'none';
            }
        });
    }

    // ---------- PDF TEXT EXTRACTION ---------- //
    async function extractTextFromPDF(file) {
        if (!window.pdfjsLib) throw new Error('PDF.js is not loaded');
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        let text = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map((item) => item.str).join(' ') + ' ';
        }

        return text;
    }

    // ---------- DISPLAY AI RESULTS ---------- //
    function displayAIResults(results) {
        const resultsDiv = document.getElementById('results');
        if (!resultsDiv) return;

        const bar = document.getElementById('similarityBar');
        const text = document.getElementById('similarityText');
        const statusBadge = document.getElementById('statusBadge');
        const matchedList = document.getElementById('matchedSkills');
        const missingList = document.getElementById('missingSkills');
        const strengthsList = document.getElementById('strengthsList');
        const weaknessesList = document.getElementById('weaknessesList');
        const recommendation = document.getElementById('recommendation');

        resultsDiv.style.display = 'block';

        // Progress Bar
        if (bar) {
            bar.style.width = `${results.similarityScore}%`;
            bar.textContent = `${results.similarityScore}%`;
            
            // Color based on score
            if (results.similarityScore >= 75) {
                bar.className = 'progress-bar h-100 bg-success';
            } else if (results.similarityScore >= 40) {
                bar.className = 'progress-bar h-100 bg-warning';
            } else {
                bar.className = 'progress-bar h-100 bg-danger';
            }
        }

        // Status Badge
        if (statusBadge) {
            let badgeClass = 'bg-secondary';
            let statusText = results.status;
            
            if (results.status === 'shortlisted') {
                badgeClass = 'bg-success';
                statusText = '🎉 Shortlisted';
            } else if (results.status === 'under review') {
                badgeClass = 'bg-warning';
                statusText = '⏳ Under Review';
            } else if (results.status === 'rejected') {
                badgeClass = 'bg-danger';
                statusText = '❌ Rejected';
            }
            
            statusBadge.className = `badge ${badgeClass} fs-6`;
            statusBadge.textContent = statusText;
        }

        // Similarity Text
        if (text) {
            text.textContent = `AI Match Score: ${results.similarityScore}%`;
            text.className = results.similarityScore >= 75 ? 'fw-bold text-success' : 
                            results.similarityScore >= 40 ? 'fw-bold text-warning' : 
                            'fw-bold text-danger';
        }

        // Skills Lists
        if (matchedList) {
            matchedList.innerHTML = results.matchedSkills && results.matchedSkills.length > 0
                ? results.matchedSkills.map((s) => `<li class="list-group-item text-success">✅ ${s}</li>`).join('')
                : '<li class="list-group-item">No specific skills matched</li>';
        }

        if (missingList) {
            missingList.innerHTML = results.missingSkills && results.missingSkills.length > 0
                ? results.missingSkills.map((s) => `<li class="list-group-item text-danger">❌ ${s}</li>`).join('')
                : '<li class="list-group-item text-success">No missing skills detected!</li>';
        }

        // Strengths & Weaknesses
        if (strengthsList) {
            strengthsList.innerHTML = results.strengths && results.strengths.length > 0
                ? results.strengths.map((s) => `<li class="list-group-item">👍 ${s}</li>`).join('')
                : '<li class="list-group-item">No specific strengths identified</li>';
        }

        if (weaknessesList) {
            weaknessesList.innerHTML = results.weaknesses && results.weaknesses.length > 0
                ? results.weaknesses.map((w) => `<li class="list-group-item">👎 ${w}</li>`).join('')
                : '<li class="list-group-item text-success">No major weaknesses identified</li>';
        }

        // Recommendation
        if (recommendation) {
            recommendation.textContent = results.recommendation || 'No specific recommendation provided.';
        }
    }

    // ---------- INIT ---------- //
    initialAuth();
});