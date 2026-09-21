Overview

Resume Matcher is a Node.js/Express + MongoDB application. A logged-in user uploads a PDF resume and pastes a job description; the server sends both to OpenAI (gpt-3.5-turbo) with a structured prompt asking for a JSON analysis — matched skills, missing skills, strengths, weaknesses, a recommendation, and a status of shortlisted (75–100%), under review (40–74%), or rejected (0–39%). If the OpenAI call fails, the app falls back to a basic keyword-matching analysis so the feature still works without an active API key. Every result is saved per user, and a hardcoded admin account can view all registered users, resumes, matches, and login logs from a dashboard.

Features
Authentication — register/login by username or email, bcrypt-hashed passwords, MongoDB-backed sessions (express-session + connect-mongo), 14-day session cookies, logout.
Resume upload — PDF upload via Multer, stored in uploads/.
AI-powered matching — sends resume text + job description to OpenAI for structured analysis (matched/missing skills, strengths, weaknesses, recommendation, status), with an automatic fallback to keyword matching if the API call fails.
Match history — every analysis is saved (Match model) and retrievable per user.
Login audit log — every login attempt (success or failure), with IP and user-agent, recorded (LoginLog model).
Admin dashboard — a hardcoded admin account unlocks stats, full user/resume/match lists, and login logs.
Forgot password — page exists (reset_password.html); backend flow is simulated pending real email delivery.
Tech Stack

Backend

Node.js, Express 4
MongoDB with Mongoose
express-session + connect-mongo (session storage)
bcryptjs (password hashing)
Multer (file uploads)
OpenAI Node SDK (gpt-3.5-turbo for resume analysis)
CORS, dotenv

Frontend

Static HTML/CSS/vanilla JavaScript
PDF.js (client-side PDF text extraction)
Project Structure
resume-matcher/
├── server.js               # Express app, routes, auth, OpenAI matching logic
├── models/
│   ├── User.js
│   ├── Resume.js
│   ├── Match.js
│   └── LoginLog.js
├── index.html               # Login / register page
├── resume.html               # Logged-in user: upload resume + run match
├── admin.html                 # Admin dashboard
├── reset_password.html         # Password reset page (frontend only)
├── script.js                    # Frontend logic for index/resume pages
├── admin.js                      # Frontend logic for admin dashboard
├── styles.css
├── package.json / package-lock.json
├── .env.example                   # Variable names only — copy to .env and fill in real values
├── .gitignore
└── TODO.md
Installation
Clone the repo
bash
   git clone https://github.com/mrinaladepu/resume-matcher.git
   cd resume-matcher
Install dependencies
bash
   npm install
Set up your environment
bash
   cp .env.example .env

Then fill in .env with real values:

env
   MONGO_URI=your_mongodb_connection_string
   SESSION_SECRET=some_long_random_string
   PORT=4000
   EMAIL_USER=your_email_address        # currently unused by the app
   EMAIL_PASS=your_email_app_password   # currently unused by the app
   OPENAI_API_KEY=your_openai_api_key   # required for AI-based matching; app falls back to keyword matching without it
Running
bash
npm start

or, for auto-restart on changes:

bash
npm run dev

Visit http://localhost:4000 (or your configured PORT).

Register or log in at / → regular users land on resume.html to upload a resume and run a match.
Log in with username admin → redirected to admin.html for the dashboard.
Applications
Candidate self-screening — job seekers can check how their resume stacks up against a specific job posting before applying.
Lightweight ATS-style pre-filter — recruiters could use the admin view and AI-generated verdicts as a rough first pass over incoming resumes.
Portfolio / learning project — demonstrates full auth flow, file upload handling, LLM API integration with a graceful fallback, and MongoDB modeling end to end.
Future Enhancements
Replace the simulated forgot-password flow with real email delivery via EMAIL_USER/EMAIL_PASS and a proper expiring reset token.
Move the hardcoded username === 'admin' check to a proper role-based check.
Add server-side validation of client-submitted resume text so results can't be spoofed from the browser.
Add automated tests and input validation/rate limiting on auth endpoints.
Add pagination to the admin tables as data grows.
