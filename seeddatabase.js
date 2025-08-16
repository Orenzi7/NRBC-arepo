// scripts/seedDatabase.js - Seed database with initial data
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models (assuming they're in the same file as server.js)
// In a real app, you'd separate models into their own files

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['admin', 'pastor', 'staff', 'volunteer'], default: 'volunteer' },
  phone: { type: String, trim: true },
  department: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 1000 },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  location: { type: String, default: 'New Revival Baptist Church, Arepo' },
  category: { type: String, enum: ['worship', 'bible-study', 'youth', 'outreach', 'special', 'conference'], default: 'worship' },
  isRecurring: { type: Boolean, default: false },
  recurringType: { type: String, enum: ['weekly', 'monthly', 'yearly'], default: null },
  maxAttendees: { type: Number, default: null },
  registeredAttendees: [{ name: String, email: String, phone: String, registeredAt: { type: Date, default: Date.now } }],
  image: { type: String, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

const sermonSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  speaker: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  scripture: { type: String, trim: true },
  summary: { type: String, maxlength: 500 },
  audioUrl: { type: String },
  videoUrl: { type: String },
  notes: { type: String },
  series: { type: String, trim: true },
  tags: [{ type: String, trim: true }],
  viewCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Event = mongoose.model('Event', eventSchema);
const Sermon = mongoose.model('Sermon', sermonSchema);

async function seedDatabase() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nrbc_church');
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Event.deleteMany({});
    await Sermon.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    const adminUser = await User.create({
      name: 'Pastor Administrator',
      email: 'admin@nrbcarepo.org',
      password: hashedPassword,
      role: 'admin',
      phone: '+234-xxx-xxx-xxxx',
      department: 'Leadership'
    });

    // Create pastor user
    const pastorPassword = await bcrypt.hash('pastor123', 12);
    const pastorUser = await User.create({
      name: 'Pastor John Doe',
      email: 'pastor@nrbcarepo.org',
      password: pastorPassword,
      role: 'pastor',
      phone: '+234-xxx-xxx-xxxx',
      department: 'Pastoral Care'
    });

    console.log('👤 Created admin and pastor users');

    // Create sample events
    const events = [
      {
        title: 'Sunday Morning Worship Service',
        description: 'Join us for our weekly worship service with inspiring music, prayer, and biblical teaching.',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next Sunday
        time: '9:00 AM',
        category: 'worship',
        isRecurring: true,
        recurringType: 'weekly',
        maxAttendees: 200,
        createdBy: adminUser._id
      },
      {
        title: 'Wednesday Bible Study',
        description: 'Deep dive into God\'s Word with our midweek Bible study. All ages welcome!',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Next Wednesday
        time: '7:00 PM',
        category: 'bible-study',
        isRecurring: true,
        recurringType: 'weekly',
        maxAttendees: 100,
        createdBy: pastorUser._id
      },
      {
        title: 'Youth Fellowship Night',
        description: 'Fun games, worship, and fellowship for our young people aged 13-25.',
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // Next Friday
        time: '6:30 PM',
        category: 'youth',
        maxAttendees: 50,
        createdBy: adminUser._id
      },
      {
        title: 'Community Outreach Program',
        description: 'Join us as we serve our community with food distribution and health screenings.',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Two weeks from now
        time: '10:00 AM',
        category: 'outreach',
        maxAttendees: 30,
        createdBy: pastorUser._id
      },
      {
        title: 'Annual Revival Conference 2025',
        description: 'Three days of powerful worship, inspiring messages, and spiritual renewal with guest speakers.',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // One month from now
        time: '9:00 AM',
        category: 'conference',
        maxAttendees: 500,
        createdBy: adminUser._id
      },
      {
        title: 'Baptism Service',
        description: 'Celebrating new believers as they take the next step in their faith journey through baptism.',
        date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // Three weeks from now
        time: '11:00 AM',
        category: 'special',
        maxAttendees: 150,
        createdBy: pastorUser._id
      }
    ];

    await Event.insertMany(events);
    console.log('📅 Created sample events');

    // Create sample sermons
    const sermons = [
      {
        title: 'Walking in Faith During Difficult Times',
        speaker: 'Pastor John Doe',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last week
        scripture: 'Hebrews 11:1',
        summary: 'A powerful message about maintaining faith when facing life\'s challenges and trusting in God\'s perfect plan.',
        series: 'Faith That Overcomes',
        tags: ['faith', 'trials', 'trust', 'hope'],
        viewCount: 156
      },
      {
        title: 'The Power of Prayer',
        speaker: 'Pastor John Doe',
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // Two weeks ago
        scripture: 'Matthew 6:9-13',
        summary: 'Understanding the importance of prayer in our daily lives and how to develop a meaningful prayer life.',
        series: 'Foundations of Faith',
        tags: ['prayer', 'communication', 'relationship', 'god'],
        viewCount: 234
      },
      {
        title: 'Love Your Neighbor as Yourself',
        speaker: 'Guest Speaker Sarah Johnson',
        date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000), // Three weeks ago
        scripture: 'Mark 12:31',
        summary: 'Exploring what it means to truly love others as Christ loves us, with practical applications for daily life.',
        series: 'Christ\'s Greatest Commandments',
        tags: ['love', 'community', 'service', 'compassion'],
        viewCount: 189
      },
      {
        title: 'Finding Hope in God\'s Promises',
        speaker: 'Pastor John Doe',
        date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000), // Four weeks ago
        scripture: 'Romans 15:13',
        summary: 'Discovering the unshakeable hope we have in Christ and His faithful promises to His children.',
        series: 'Faith That Overcomes',
        tags: ['hope', 'promises', 'encouragement', 'faith'],
        viewCount: 278
      },
      {
        title: 'The Great Commission: Our Calling',
        speaker: 'Pastor John Doe',
        date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000), // Five weeks ago
        scripture: 'Matthew 28:19-20',
        summary: 'Understanding our responsibility as Christians to share the Gospel and make disciples of all nations.',
        series: 'Living on Mission',
        tags: ['evangelism', 'mission', 'discipleship', 'calling'],
        viewCount: 201
      }
    ];

    await Sermon.insertMany(sermons);
    console.log('📖 Created sample sermons');

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📋 Default Login Credentials:');
    console.log('   Admin: admin@nrbcarepo.org / admin123');
    console.log('   Pastor: pastor@nrbcarepo.org / pastor123');
    console.log('\n🔒 Please change these passwords in production!');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed function
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;