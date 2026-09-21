require("dotenv").config();

const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const mongoose = require('mongoose');
const { OpenAI } = require('openai');

// Models
const User = require('./models/User');
const Resume = require('./models/Resume');
const Match = require('./models/Match');
const LoginLog = require('./models/LoginLog');

const app = express();
const PORT = process.env.PORT || 4000;

// ------------------ OPENAI SETUP ------------------ //
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ------------------ MONGO CONNECTION ------------------ //
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI not found in .env');
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection failed:', err));

// ------------------ SESSION STORE ------------------ //
const sessionStore = MongoStore.create({
  mongoUrl: process.env.MONGO_URI,
  collectionName: 'sessions',
  ttl: 14 * 24 * 60 * 60, // 14 days
});

// ------------------ MIDDLEWARE ------------------ //
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'REPLACE_THIS_SECRET',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { maxAge: 14 * 24 * 60 * 60 * 1000 }, // 14 days
  })
);

// Serve static files (index.html, resume.html, admin.html, script.js, etc.)
app.use(express.static(path.join(__dirname)));

// ------------------ FILE UPLOAD ------------------ //
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
  }),
});
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// ------------------ AI RESUME ANALYSIS ------------------ //
async function analyzeResumeWithAI(resumeText, jobDescription, jobRole, candidateName) {
  try {
    const prompt = `
    Analyze this resume against the job description and provide a detailed assessment.

    CANDIDATE NAME: ${candidateName}
    RESUME TEXT:
    ${resumeText.substring(0, 4000)}

    JOB ROLE: ${jobRole}
    JOB DESCRIPTION:
    ${jobDescription}

    Please provide analysis in this EXACT JSON format:
    {
      "similarityScore": 85,
      "status": "shortlisted",
      "candidateDetails": {
        "name": "${candidateName}",
        "email": "john@example.com",
        "phone": "+1234567890",
        "skills": ["JavaScript", "React", "Node.js"]
      },
      "matchedSkills": ["JavaScript", "React", "Node.js"],
      "missingSkills": ["TypeScript", "AWS"],
      "strengths": ["Strong React experience", "Good communication skills"],
      "weaknesses": ["Lacking cloud experience", "No TypeScript knowledge"],
      "recommendation": "Strong candidate with relevant experience"
    }

    IMPORTANT: 
    - Use the provided candidate name: ${candidateName}
    - Extract email and phone from the resume text if available
    - Extract key technical skills from the resume
    - Focus on skills matching between resume and job description

    Scoring criteria:
    - 75-100%: "shortlisted" (Excellent match)
    - 40-74%: "under review" (Good potential)
    - 0-39%: "rejected" (Poor match)

    Be strict but fair in your assessment.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert HR recruiter. Analyze resumes against job descriptions and provide structured JSON output. Use the provided candidate name and extract contact information and skills from the resume."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    });

    const analysis = JSON.parse(completion.choices[0].message.content);
    
    // Validate and add candidate name
    analysis.candidateDetails.name = candidateName;
    analysis.candidateDetails = validateCandidateDetails(analysis.candidateDetails, resumeText);
    
    return analysis;
  } catch (error) {
    console.error('AI Analysis error:', error);
    // Fallback to basic analysis
    return getBasicAnalysis(resumeText, jobDescription, jobRole, candidateName);
  }
}

function validateCandidateDetails(details, resumeText) {
  const validated = { ...details };
  
  // Enhanced email extraction
  if (!details.email || details.email === 'Not specified' || details.email === 'Not available') {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi;
    const emailMatches = resumeText.match(emailRegex);
    if (emailMatches && emailMatches.length > 0) {
      validated.email = emailMatches[0];
    }
  }
  
  // Enhanced phone extraction
  if (!details.phone || details.phone === 'Not specified' || details.phone === 'Not available') {
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const phoneMatches = resumeText.match(phoneRegex);
    if (phoneMatches && phoneMatches.length > 0) {
      validated.phone = phoneMatches[0];
    }
  }
  
  return validated;
}

function getBasicAnalysis(resumeText, jobDescription, jobRole, candidateName) {
  const resumeTextLower = resumeText.toLowerCase();
  const jobDescriptionLower = jobDescription.toLowerCase();
  
  const resumeWords = resumeTextLower.match(/\b\w+\b/g) || [];
  const jobWords = jobDescriptionLower.match(/\b\w+\b/g) || [];
  
  const commonSkills = ['javascript', 'python', 'java', 'react', 'node', 'sql', 'aws', 'docker', 'typescript', 'html', 'css'];
  const matched = commonSkills.filter(skill => 
    resumeWords.includes(skill) && jobWords.includes(skill)
  );
  const missing = commonSkills.filter(skill => 
    !resumeWords.includes(skill) && jobWords.includes(skill)
  );
  
  const score = Math.min(100, Math.round((matched.length / (matched.length + missing.length || 1)) * 100));
  
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi;
  const emailMatches = resumeText.match(emailRegex);
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phoneMatches = resumeText.match(phoneRegex);
  
  return {
    similarityScore: score || 0,
    status: score >= 75 ? 'shortlisted' : score >= 40 ? 'under review' : 'rejected',
    candidateDetails: {
      name: candidateName,
      email: emailMatches && emailMatches.length > 0 ? emailMatches[0] : 'Not specified',
      phone: phoneMatches && phoneMatches.length > 0 ? phoneMatches[0] : 'Not specified',
      skills: matched
    },
    matchedSkills: matched,
    missingSkills: missing,
    strengths: matched.length > 0 ? ['Relevant technical skills'] : ['Basic qualification match'],
    weaknesses: missing.length > 0 ? ['Missing some required skills'] : [],
    recommendation: score >= 75 ? 'Consider for interview' : 'Needs review'
  };
}

// -------------------------------------------------------- //
//                      AUTH & SESSION
// -------------------------------------------------------- //

// REGISTER
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Username already exists' });

    const hashed = await bcrypt.hash(password, 10);
    await User.create({ username, email, password: hashed });
    res.json({ message: 'Registration successful' });
  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// LOGIN (username or email)
app.post('/api/login', async (req, res) => {
  const { usernameOrEmail, password } = req.body;
  const ip = req.ip;
  const userAgent = req.get('User-Agent');

  try {
    const user = await User.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });

    if (!user) {
      await LoginLog.create({ username: usernameOrEmail, success: false, ip, userAgent });
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      await LoginLog.create({ user: user._id, username: user.username, success: false, ip, userAgent });
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    await LoginLog.create({ user: user._id, username: user.username, success: true, ip, userAgent });

    req.session.userId = user._id;
    req.session.username = user.username;

    res.json({
      message: 'Login successful',
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// FORGOT PASSWORD (simulated)
app.post('/api/forgot-password', (req, res) => {
  const { email } = req.body;
  res.json({ message: `If ${email} exists, a reset link has been sent (simulated).` });
});

// LOGOUT
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out successfully' });
  });
});

// CHECK SESSION
app.get('/api/check-session', (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  res.json({
    user: { id: req.session.userId, username: req.session.username }
  });
});

// -------------------------------------------------------- //
//                RESUME & MATCH ROUTES
// -------------------------------------------------------- //

// UPLOAD RESUME
app.post('/api/upload-resume', upload.single('resume'), async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    const resume = await Resume.create({
      user: req.session.userId,
      filename: req.file.filename,
      filepath: req.file.path
    });
    res.json({ message: 'Resume uploaded', resumeId: resume._id });
  } catch (err) {
    console.error('❌ Resume upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// AI ANALYZE MATCH
app.post('/api/analyze-match', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });

  const { resumeText, jobDescription, resumeId, jobRole, candidateName } = req.body;
  if (!resumeText || !jobDescription || !resumeId || !jobRole || !candidateName) {
    return res.status(400).json({ error: 'Missing data for analysis' });
  }

  try {
    console.log('Starting AI analysis for candidate:', candidateName);
    const aiAnalysis = await analyzeResumeWithAI(resumeText, jobDescription, jobRole, candidateName);

    const match = await Match.create({
      user: req.session.userId,
      resume: resumeId,
      jobRole,
      jobDescription,
      similarityScore: aiAnalysis.similarityScore,
      status: aiAnalysis.status,
      candidateDetails: aiAnalysis.candidateDetails,
      matchedSkills: aiAnalysis.matchedSkills,
      missingSkills: aiAnalysis.missingSkills,
      strengths: aiAnalysis.strengths,
      weaknesses: aiAnalysis.weaknesses,
      recommendation: aiAnalysis.recommendation
    });

    const populatedMatch = await Match.findById(match._id)
      .populate('user', 'username email')
      .populate('resume', 'filename uploadedAt');

    res.json(populatedMatch);
  } catch (err) {
    console.error('❌ AI Analysis error:', err);
    res.status(500).json({ error: 'AI analysis failed: ' + err.message });
  }
});

// MATCH HISTORY
app.get('/api/matches', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const matches = await Match.find({ user: req.session.userId })
      .populate('resume', 'filename uploadedAt')
      .sort({ createdAt: -1 })
      .lean();
    res.json(matches);
  } catch (err) {
    console.error('❌ Fetch matches error:', err);
    res.status(500).json({ error: 'Unable to fetch history' });
  }
});

// -------------------------------------------------------- //
//                       ADMIN ROUTES
// -------------------------------------------------------- //
function requireAdmin(req, res) {
  if (req.session.username !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  return true;
}

app.get('/api/admin/users', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json(await User.find({}, 'username email createdAt').lean());
});

app.get('/api/admin/resumes', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json(
    await Resume.find()
      .populate('user', 'username')
      .sort({ uploadedAt: -1 })
      .lean()
  );
});

// GET ALL MATCHES WITH JOB ROLES (for admin)
app.get('/api/admin/matches', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const matches = await Match.find()
      .populate('user', 'username email')
      .populate('resume', 'filename uploadedAt')
      .sort({ createdAt: -1 })
      .lean();
    res.json(matches);
  } catch (err) {
    console.error('❌ Fetch admin matches error:', err);
    res.status(500).json({ error: 'Unable to fetch matches' });
  }
});

// GET SHORTLISTED RESUMES FOR EXPORT
app.get('/api/admin/shortlisted', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const shortlisted = await Match.find({ status: 'shortlisted' })
      .populate('user', 'username email')
      .populate('resume', 'filename uploadedAt')
      .sort({ createdAt: -1 })
      .lean();
    res.json(shortlisted);
  } catch (err) {
    console.error('❌ Fetch shortlisted error:', err);
    res.status(500).json({ error: 'Unable to fetch shortlisted data' });
  }
});

// ADMIN STATS
app.get('/api/admin/stats', async (req, res) => {
  if (!requireAdmin(req, res)) return;

  try {
    const totalUsers = await User.countDocuments();
    const totalResumes = await Resume.countDocuments();
    const shortlistedCount = await Match.countDocuments({ status: 'shortlisted' });
    const underReviewCount = await Match.countDocuments({ status: 'under review' });
    const rejectedCount = await Match.countDocuments({ status: 'rejected' });

    res.json({ 
      totalUsers, 
      totalResumes, 
      shortlistedCount,
      underReviewCount,
      rejectedCount
    });
  } catch (err) {
    console.error('❌ Stats error:', err);
    res.status(500).json({ error: 'Unable to fetch stats' });
  }
});

app.get('/api/admin/login-logs', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json(
    await LoginLog.find()
      .populate('user', 'username')
      .sort({ timestamp: -1 })
      .lean()
  );
});

// -------------------------------------------------------- //
//                     START SERVER
// -------------------------------------------------------- //
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});