# Resume Matcher

Resume Matcher is a **Node.js/Express + MongoDB application** that analyzes a candidate's resume against a job description using **OpenAI**. It provides matched skills, missing skills, strengths, weaknesses, a recommendation, and an overall matching status.

If the OpenAI API is unavailable, the application automatically falls back to a **basic keyword-matching system**, ensuring the core functionality remains available.

---

## **Overview**

A logged-in user can:

* Upload a **PDF resume**
* Paste a **job description**
* Analyze the resume against the job description
* Receive an **AI-generated structured analysis**
* View previous matching results
* Track resume-matching history

The system uses OpenAI to generate a structured JSON response containing:

* **Matched Skills**
* **Missing Skills**
* **Strengths**
* **Weaknesses**
* **Recommendation**
* **Matching Status**

The matching status is categorized as:

| Match Score | Status       |
| ----------- | ------------ |
| **75–100%** | Shortlisted  |
| **40–74%**  | Under Review |
| **0–39%**   | Rejected     |

If the OpenAI request fails or an API key is not configured, the system automatically performs **keyword-based matching** instead.

---

## **Features**

### **Authentication**

* User registration and login using **username or email**
* Passwords securely hashed using **bcrypt**
* MongoDB-backed sessions using:

  * `express-session`
  * `connect-mongo`
* **14-day session cookies**
* Secure logout functionality

### **Resume Upload**

* Upload resumes in **PDF format**
* Resume files are handled using **Multer**
* Uploaded files are stored in the `uploads/` directory
* PDF text can be extracted using **PDF.js**

### **AI-Powered Resume Matching**

The application sends the extracted resume text and job description to **OpenAI** using a structured prompt.

The AI generates:

* **Matched skills**
* **Missing skills**
* **Strengths**
* **Weaknesses**
* **Recommendation**
* **Match percentage**
* **Shortlisted / Under Review / Rejected status**

The application also includes a **fallback keyword-matching mechanism** when the OpenAI API is unavailable.

### **Match History**

* Every resume analysis is stored in MongoDB
* Results are associated with the corresponding user
* Users can retrieve their previous matching results
* Matching history is maintained through the `Match` model

### **Login Audit Log**

Every login attempt is recorded, including:

* Successful login attempts
* Failed login attempts
* IP address
* User-agent information
* Timestamp

Login information is stored using the `LoginLog` model.

### **Admin Dashboard**

A dedicated admin dashboard provides access to:

* Total registered users
* Uploaded resumes
* Resume matches
* Login activity
* User information
* Resume information
* Match results
* Login logs

The current implementation uses a **hardcoded admin account** for dashboard access.

### **Forgot Password**

A password-reset page is included:

`reset_password.html`

The frontend flow currently exists as a **simulation**. Real email-based password recovery is planned as a future enhancement.

---

## **Tech Stack**

### **Backend**

* **Node.js**
* **Express.js 4**
* **MongoDB**
* **Mongoose**
* **express-session**
* **connect-mongo**
* **bcryptjs**
* **Multer**
* **OpenAI Node SDK**
* **CORS**
* **dotenv**

### **Frontend**

* **HTML5**
* **CSS3**
* **Vanilla JavaScript**
* **PDF.js**

---

## **Project Structure**

```text
resume-matcher/
│
├── server.js                    # Express app, routes, authentication and OpenAI logic
│
├── models/
│   ├── User.js                  # User schema
│   ├── Resume.js                # Resume schema
│   ├── Match.js                 # Resume matching results
│   └── LoginLog.js              # Login audit logs
│
├── index.html                   # Login / registration page
├── resume.html                  # Resume upload and matching page
├── admin.html                   # Admin dashboard
├── reset_password.html          # Password reset page
│
├── script.js                    # Frontend logic
├── admin.js                     # Admin dashboard logic
├── styles.css                   # Application styles
│
├── package.json
├── package-lock.json
├── .env.example                 # Environment variable template
├── .gitignore
└── TODO.md
```

---

## **Installation**

### **1. Clone the Repository**

```bash
git clone https://github.com/mrinaladepu/resume-matcher.git
cd resume-matcher
```

### **2. Install Dependencies**

```bash
npm install
```

### **3. Configure Environment Variables**

Copy the example environment file:

```bash
cp .env.example .env
```

Then update `.env` with your actual configuration:

```env
MONGO_URI=your_mongodb_connection_string
SESSION_SECRET=some_long_random_string
PORT=4000

EMAIL_USER=your_email_address
EMAIL_PASS=your_email_app_password

OPENAI_API_KEY=your_openai_api_key
```

> **Note:** `EMAIL_USER` and `EMAIL_PASS` are currently reserved for the planned email-based password-reset functionality.

The `OPENAI_API_KEY` is required for **AI-powered resume matching**. If it is not configured or the API request fails, the application automatically falls back to **keyword-based matching**.

---

## **Running the Application**

### **Start the Application**

```bash
npm start
```

### **Development Mode**

For automatic server restart when files are modified:

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:4000
```

If you configured a different `PORT` in `.env`, use that port instead.

---

## **Usage**

### **Regular User**

1. Open the application.
2. Register a new account or log in.
3. Navigate to the resume matching page.
4. Upload a **PDF resume**.
5. Paste the **job description**.
6. Run the resume analysis.
7. Review the generated matching results.
8. Access previous results through the match history.

### **Admin**

Log in using the configured admin account.

The admin is redirected to:

```text
/admin.html
```

The dashboard provides access to users, resumes, matching results, statistics, and login logs.

---

## **Applications**

### **Candidate Self-Screening**

Job seekers can compare their resume against a specific job description before applying.

The system highlights:

* Relevant skills
* Missing skills
* Strengths
* Weaknesses
* Overall matching percentage
* Recommendation

### **Lightweight ATS-Style Pre-Screening**

The application can also be used as a lightweight **Applicant Tracking System (ATS)-style pre-screening tool**.

Recruiters can use the admin dashboard to review:

* Candidate resumes
* Matching results
* AI-generated recommendations
* Login activity

> The AI-generated result is intended as a preliminary screening aid and should not replace human evaluation.

### **Portfolio / Learning Project**

This project demonstrates an end-to-end web application incorporating:

* User authentication
* Password hashing
* Session management
* PDF file uploads
* PDF text extraction
* MongoDB data modeling
* OpenAI API integration
* AI-generated structured analysis
* Fallback processing
* Admin dashboard
* Login auditing

---

## **Future Enhancements**

### **1. Real Password Reset**

Replace the simulated password-reset flow with:

* Real email delivery
* Secure reset tokens
* Expiring reset links
* One-time password-reset tokens

### **2. Role-Based Authorization**

Replace the current hardcoded:

```javascript
username === "admin"
```

check with a proper **role-based access control (RBAC)** system.

For example:

```text
User
Recruiter
Admin
```

### **3. Server-Side Resume Validation**

Add server-side validation of the submitted resume text to prevent users from manipulating or spoofing resume content from the browser.

### **4. Automated Testing**

Add automated tests for:

* Authentication
* Resume uploads
* Resume matching
* API failures
* Database operations
* Authorization

### **5. Input Validation and Rate Limiting**

Implement:

* Request validation
* Authentication rate limiting
* File-size restrictions
* File-type validation
* API request limits

### **6. Admin Dashboard Pagination**

Add pagination and filtering to the admin dashboard as the number of users, resumes, and matches increases.

---

## **Project Workflow**

```text
                    ┌───────────────────┐
                    │   User Registers  │
                    │     / Logs In     │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Upload PDF Resume │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Extract Resume    │
                    │      Text         │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Paste Job         │
                    │ Description       │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ OpenAI Analysis   │
                    └─────────┬─────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
             ┌──────────────┐    ┌──────────────┐
             │ API Success  │    │ API Failure  │
             └──────┬───────┘    └──────┬───────┘
                    │                   │
                    ▼                   ▼
             ┌──────────────┐    ┌──────────────┐
             │ AI Matching  │    │   Keyword    │
             │   Analysis   │    │   Matching   │
             └──────┬───────┘    └──────┬───────┘
                    │                   │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Save Match Result │
                    │    in MongoDB     │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Display Analysis  │
                    │ to the User       │
                    └───────────────────┘
```

---

## **Database Models**

The application uses four main MongoDB models:

| Model        | Purpose                                     |
| ------------ | ------------------------------------------- |
| **User**     | Stores registered user information          |
| **Resume**   | Stores uploaded resume information          |
| **Match**    | Stores resume-job matching results          |
| **LoginLog** | Stores login attempts and audit information |

---

## **Matching Status**

The application categorizes candidates based on their calculated match percentage:

```text
75–100%  →  Shortlisted
40–74%   →  Under Review
0–39%    →  Rejected
```

The score is intended to provide a **preliminary comparison between the resume and job description** rather than a definitive hiring decision.

---

## **Security Considerations**

The application currently implements:

* **bcrypt password hashing**
* **MongoDB-backed sessions**
* **Session cookies**
* **Environment variables for secrets**
* **Login auditing**
* **Admin access control**

For production deployment, additional security measures should be implemented, including:

* Secure cookie configuration
* HTTPS
* CSRF protection
* Rate limiting
* Stronger authorization
* File validation
* Input sanitization
* Secure password-reset tokens
* Removal of hardcoded admin credentials

---

## **License**

This project is intended for **educational, portfolio, and learning purposes**.
