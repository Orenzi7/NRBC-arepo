this // server.js - Main Backend Server for New Revival Baptist Church Website
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nrbc_church', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('✅ Connected to MongoDB Database');
});

// =============================================================================
// DATABASE SCHEMAS
// =============================================================================

// Prayer Request Schema
const prayerRequestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  prayerRequest: {
    type: String,
    required: true,
    maxlength: 1000
  },
  isAnswered: {
    type: Boolean,
    default: false
  },
  isPrivate: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  answeredAt: {
    type: Date
  }
});

// Event Schema
const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: 'New Revival Baptist Church, Arepo'
  },
  category: {
    type: String,
    enum: ['worship', 'bible-study', 'youth', 'outreach', 'special', 'conference'],
    default: 'worship'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringType: {
    type: String,
    enum: ['weekly', 'monthly', 'yearly'],
    default: null
  },
  maxAttendees: {
    type: Number,
    default: null
  },
  registeredAttendees: [{
    name: String,
    email: String,
    phone: String,
    registeredAt: { type: Date, default: Date.now }
  }],
  image: {
    type: String,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Contact Message Schema
const contactMessageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000
  },
  isRead: {
    type: Boolean,
    default: false
  },
  respondedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// User Schema (for admin/staff management)
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'pastor', 'staff', 'volunteer'],
    default: 'volunteer'
  },
  phone: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Sermon Schema
const sermonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  speaker: {
    type: String,
    required: true,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  scripture: {
    type: String,
    trim: true
  },
  summary: {
    type: String,
    maxlength: 500
  },
  audioUrl: {
    type: String
  },
  videoUrl: {
    type: String
  },
  notes: {
    type: String
  },
  series: {
    type: String,
    trim: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  viewCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Newsletter Subscription Schema
const newsletterSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  unsubscribedAt: {
    type: Date
  }
});

// Create Models
const PrayerRequest = mongoose.model('PrayerRequest', prayerRequestSchema);
const Event = mongoose.model('Event', eventSchema);
const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);
const User = mongoose.model('User', userSchema);
const Sermon = mongoose.model('Sermon', sermonSchema);
const Newsletter = mongoose.model('Newsletter', newsletterSchema);

// =============================================================================
// EMAIL CONFIGURATION
// =============================================================================

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'pastor') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// =============================================================================
// FILE UPLOAD CONFIGURATION
// =============================================================================

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|mp3|mp4|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, audio, video, and PDF files are allowed'));
    }
  }
});

// =============================================================================
// API ROUTES
// =============================================================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'NRBC Church API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// =============================================================================
// PRAYER REQUESTS ROUTES
// =============================================================================

// Submit Prayer Request
app.post('/api/prayer-requests', async (req, res) => {
  try {
    const { name, email, prayerRequest, isPrivate } = req.body;

    if (!name || !prayerRequest) {
      return res.status(400).json({ error: 'Name and prayer request are required' });
    }

    const newPrayerRequest = new PrayerRequest({
      name,
      email,
      prayerRequest,
      isPrivate: isPrivate !== false
    });

    await newPrayerRequest.save();

    // Send email notification to church staff
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.PRAYER_EMAIL,
      subject: 'New Prayer Request - NRBC Arepo',
      html: `
        <h2>New Prayer Request Submitted</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email || 'Not provided'}</p>
        <p><strong>Request:</strong></p>
        <p>${prayerRequest}</p>
        <p><strong>Privacy:</strong> ${isPrivate ? 'Private' : 'Can be shared'}</p>
        <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({
      message: 'Prayer request submitted successfully',
      id: newPrayerRequest._id
    });

  } catch (error) {
    console.error('Prayer request error:', error);
    res.status(500).json({ error: 'Failed to submit prayer request' });
  }
});

// Get Prayer Requests (Admin only)
app.get('/api/prayer-requests', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const prayerRequests = await PrayerRequest.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await PrayerRequest.countDocuments();

    res.json({
      prayerRequests,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total
    });

  } catch (error) {
    console.error('Get prayer requests error:', error);
    res.status(500).json({ error: 'Failed to fetch prayer requests' });
  }
});

// Update Prayer Request Status
app.patch('/api/prayer-requests/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { isAnswered } = req.body;
    
    const prayerRequest = await PrayerRequest.findByIdAndUpdate(
      req.params.id,
      { 
        isAnswered,
        answeredAt: isAnswered ? new Date() : null
      },
      { new: true }
    );

    if (!prayerRequest) {
      return res.status(404).json({ error: 'Prayer request not found' });
    }

    res.json(prayerRequest);

  } catch (error) {
    console.error('Update prayer request error:', error);
    res.status(500).json({ error: 'Failed to update prayer request' });
  }
});

// =============================================================================
// EVENTS ROUTES
// =============================================================================

// Get Events (Public)
app.get('/api/events', async (req, res) => {
  try {
    const { upcoming, category, limit } = req.query;
    let query = {};

    if (upcoming === 'true') {
      query.date = { $gte: new Date() };
    }

    if (category) {
      query.category = category;
    }

    const events = await Event.find(query)
      .sort({ date: 1 })
      .limit(parseInt(limit) || 50)
      .populate('createdBy', 'name');

    res.json(events);

  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Create Event (Admin only)
app.post('/api/events', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      time,
      location,
      category,
      isRecurring,
      recurringType,
      maxAttendees
    } = req.body;

    if (!title || !description || !date || !time) {
      return res.status(400).json({ error: 'Title, description, date, and time are required' });
    }

    const newEvent = new Event({
      title,
      description,
      date: new Date(date),
      time,
      location,
      category,
      isRecurring: isRecurring === 'true',
      recurringType,
      maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
      image: req.file ? `/uploads/${req.file.filename}` : null,
      createdBy: req.user.id
    });

    await newEvent.save();

    res.status(201).json(newEvent);

  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Register for Event
app.post('/api/events/:id/register', async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if already registered
    const alreadyRegistered = event.registeredAttendees.some(
      attendee => attendee.email === email
    );

    if (alreadyRegistered) {
      return res.status(400).json({ error: 'Already registered for this event' });
    }

    // Check capacity
    if (event.maxAttendees && event.registeredAttendees.length >= event.maxAttendees) {
      return res.status(400).json({ error: 'Event is at full capacity' });
    }

    event.registeredAttendees.push({ name, email, phone });
    await event.save();

    // Send confirmation email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Event Registration Confirmed - ${event.title}`,
      html: `
        <h2>Registration Confirmed</h2>
        <p>Dear ${name},</p>
        <p>Thank you for registering for <strong>${event.title}</strong></p>
        <p><strong>Date:</strong> ${event.date.toDateString()}</p>
        <p><strong>Time:</strong> ${event.time}</p>
        <p><strong>Location:</strong> ${event.location}</p>
        <p>We look forward to seeing you there!</p>
        <p>Blessings,<br>New Revival Baptist Church</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: 'Successfully registered for event' });

  } catch (error) {
    console.error('Event registration error:', error);
    res.status(500).json({ error: 'Failed to register for event' });
  }
});

// =============================================================================
// CONTACT MESSAGES ROUTES
// =============================================================================

// Submit Contact Message
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields except phone are required' });
    }

    const newMessage = new ContactMessage({
      name,
      email,
      phone,
      subject,
      message
    });

    await newMessage.save();

    // Send notification email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.CONTACT_EMAIL,
      subject: `New Contact Message - ${subject}`,
      html: `
        <h2>New Contact Message</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
        <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: 'Message sent successfully' });

  } catch (error) {
    console.error('Contact message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// =============================================================================
// NEWSLETTER ROUTES
// =============================================================================

// Subscribe to Newsletter
app.post('/api/newsletter/subscribe', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const existingSubscription = await Newsletter.findOne({ email });

    if (existingSubscription) {
      if (existingSubscription.isActive) {
        return res.status(400).json({ error: 'Already subscribed to newsletter' });
      } else {
        // Reactivate subscription
        existingSubscription.isActive = true;
        existingSubscription.subscribedAt = new Date();
        existingSubscription.unsubscribedAt = null;
        await existingSubscription.save();
        return res.json({ message: 'Newsletter subscription reactivated' });
      }
    }

    const newSubscription = new Newsletter({ email, name });
    await newSubscription.save();

    // Send welcome email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to NRBC Newsletter!',
      html: `
        <h2>Welcome to New Revival Baptist Church Newsletter!</h2>
        <p>Dear ${name || 'Friend'},</p>
        <p>Thank you for subscribing to our newsletter. You'll receive updates about:</p>
        <ul>
          <li>Upcoming events and services</li>
          <li>Prayer requests and testimonies</li>
          <li>Community outreach programs</li>
          <li>Spiritual encouragement and Bible teachings</li>
        </ul>
        <p>God bless you!</p>
        <p>New Revival Baptist Church, Arepo</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: 'Successfully subscribed to newsletter' });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({ error: 'Failed to subscribe to newsletter' });
  }
});

// =============================================================================
// SERMONS ROUTES
// =============================================================================

// Get Sermons (Public)
app.get('/api/sermons', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const sermons = await Sermon.find()
      .sort({ date: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Sermon.countDocuments();

    res.json({
      sermons,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total
    });

  } catch (error) {
    console.error('Get sermons error:', error);
    res.status(500).json({ error: 'Failed to fetch sermons' });
  }
});

// =============================================================================
// AUTHENTICATION ROUTES
// =============================================================================

// User Registration (Admin only)
app.post('/api/auth/register', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, role, phone, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      phone,
      department
    });

    await newUser.save();

    res.status(201).json({ message: 'User created successfully', id: newUser._id });

  } catch (error) {
    console.error('User registration error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// User Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// =============================================================================
// DASHBOARD STATS (Admin only)
// =============================================================================

app.get('/api/dashboard/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [
      totalPrayerRequests,
      answeredPrayers,
      upcomingEvents,
      totalMessages,
      newsletterSubscribers,
      totalSermons
    ] = await Promise.all([
      PrayerRequest.countDocuments(),
      PrayerRequest.countDocuments({ isAnswered: true }),
      Event.countDocuments({ date: { $gte: new Date() } }),
      ContactMessage.countDocuments(),
      Newsletter.countDocuments({ isActive: true }),
      Sermon.countDocuments()
    ]);

    const recentPrayerRequests = await PrayerRequest.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name prayerRequest createdAt');

    const recentMessages = await ContactMessage.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name subject createdAt isRead');

    res.json({
      stats: {
        totalPrayerRequests,
        answeredPrayers,
        upcomingEvents,
        totalMessages,
        newsletterSubscribers,
        totalSermons
      },
      recentPrayerRequests,
      recentMessages
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// =============================================================================
// START SERVER
// =============================================================================

app.listen(PORT, () => {
  console.log(`🚀 NRBC Church API Server running on port ${PORT}`);
  console.log(`🌐 Server: http://localhost:${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/api/health`);
});

module.exports = app;