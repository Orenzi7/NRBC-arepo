# New Revival Baptist Church - API Documentation

## 🚀 Backend Overview

A comprehensive REST API built with Node.js, Express, and MongoDB for the New Revival Baptist Church website. Features include prayer requests, event management, contact forms, user authentication, and more.

## 📋 Quick Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Database Setup**
   ```bash
   npm run seed  # Initialize with sample data
   ```

4. **Start Server**
   ```bash
   npm run dev   # Development mode
   npm start     # Production mode
   ```

## 🔗 API Endpoints

### 🏥 Health Check
```
GET /api/health
```
**Response:**
```json
{
  "status": "OK",
  "message": "NRBC Church API is running",
  "timestamp": "2025-08-16T10:00:00.000Z",
  "version": "1.0.0"
}
```

---

### 🙏 Prayer Requests

#### Submit Prayer Request
```
POST /api/prayer-requests
```
**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "prayerRequest": "Please pray for my family's health",
  "isPrivate": true
}
```

#### Get Prayer Requests (Admin Only)
```
GET /api/prayer-requests?page=1&limit=20
Authorization: Bearer <token>
```

#### Update Prayer Request Status (Admin Only)
```
PATCH /api/prayer-requests/:id
Authorization: Bearer <token>
```
**Body:**
```json
{
  "isAnswered": true
}
```

---

### 📅 Events Management

#### Get Events (Public)
```
GET /api/events?upcoming=true&category=worship&limit=10
```

#### Create Event (Admin Only)
```
POST /api/events
Authorization: Bearer <token>
Content-Type: multipart/form-data
```
**Form Data:**
- `title`: Event title
- `description`: Event description
- `date`: Event date (YYYY-MM-DD)
- `time`: Event time
- `category`: worship|bible-study|youth|outreach|special|conference
- `image`: Event image file (optional)

#### Register for Event
```
POST /api/events/:id/register
```
**Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+234-xxx-xxx-xxxx"
}
```

---

### ✉️ Contact Messages

#### Submit Contact Message
```
POST /api/contact
```
**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+234-xxx-xxx-xxxx",
  "subject": "Question about services",
  "message": "I would like to know more about your Bible study program."
}
```

---

### 📰 Newsletter

#### Subscribe to Newsletter
```
POST /api/newsletter/subscribe
```
**Body:**
```json
{
  "email": "subscriber@example.com",
  "name": "Subscriber Name"
}
```

---

### 📖 Sermons

#### Get Sermons (Public)
```
GET /api/sermons?page=1&limit=10
```
**Response:**
```json
{
  "sermons": [
    {
      "_id": "...",
      "title": "Walking in Faith During Difficult Times",
      "speaker": "Pastor John Doe",
      "date": "2025-08-09T00:00:00.000Z",
      "scripture": "Hebrews 11:1",
      "summary": "A powerful message about maintaining faith...",
      "series": "Faith That Overcomes",
      "tags": ["faith", "trials", "trust", "hope"],
      "viewCount": 156
    }
  ],
  "currentPage": 1,
  "totalPages": 3,
  "total": 25
}
```

---

### 🔐 Authentication

#### User Login
```
POST /api/auth/login
```
**Body:**
```json
{
  "email": "admin@nrbcarepo.org",
  "password": "admin123"
}
```
**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "name": "Pastor Administrator",
    "email": "admin@nrbcarepo.org",
    "role": "admin"
  }
}
```

#### Register User (Admin Only)
```
POST /api/auth/register
Authorization: Bearer <token>
```
**Body:**
```json
{
  "name": "New Staff Member",
  "email": "staff@nrbcarepo.org",
  "password": "secure_password",
  "role": "staff",
  "phone": "+234-xxx-xxx-xxxx",
  "department": "Youth Ministry"
}
```

---

### 📊 Dashboard Stats (Admin Only)

#### Get Dashboard Statistics
```
GET /api/dashboard/stats
Authorization: Bearer <token>
```
**Response:**
```json
{
  "stats": {
    "totalPrayerRequests": 45,
    "answeredPrayers": 32,
    "upcomingEvents": 8,
    "totalMessages": 23,
    "newsletterSubscribers": 156,
    "totalSermons": 25
  },
  "recentPrayerRequests": [...],
  "recentMessages": [...]
}
```

---

## 🔒 Authentication & Authorization

### JWT Token Usage
Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### User Roles
- **admin**: Full access to all endpoints
- **pastor**: Access to most endpoints except user management
- **staff**: Limited access to specific features
- **volunteer**: Basic access

---

## 📧 Email Notifications

The system automatically sends email notifications for:
- New prayer requests → Church prayer team
- New contact messages → Church admin
- Event registrations → Registrants
- Newsletter subscriptions → Welcome email

---

## 🔧 Environment Variables

Key environment variables needed:

```bash
# Database
MONGODB_URI=mongodb://localhost:27017/nrbc_church

# Authentication
JWT_SECRET=your_super_secure_secret_key

# Email Configuration
EMAIL_USER=your-church-email@gmail.com
EMAIL_PASS=your-app-specific-password
PRAYER_EMAIL=prayers@nrbcarepo.org
CONTACT_EMAIL=info@nrbcarepo.org

# Church Information
CHURCH_NAME=New Revival Baptist Church
CHURCH_LOCATION=Arepo, Ogun State, Nigeria
```

---

## 🛡️ Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Helmet.js**: Security headers protection
- **Input Validation**: All inputs validated and sanitized
- **Password Hashing**: bcryptjs with 12 rounds
- **JWT Authentication**: Secure token-based auth
- **CORS Protection**: Configured for specific origins
- **File Upload Security**: Type and size restrictions

---

## 📱 Integration with Frontend

The frontend can integrate with this API by:

1. **Making AJAX calls** to the API endpoints
2. **Handling authentication** by storing JWT tokens
3. **Managing forms** for prayer requests, contact, etc.
4. **Displaying dynamic content** from events and sermons
5. **Admin dashboard** for church management

Example frontend integration:
```javascript
// Submit prayer request
async function submitPrayerRequest(data) {
  const response = await fetch('/api/prayer-requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

// Get upcoming events
async function getUpcomingEvents() {
  const response = await fetch('/api/events?upcoming=true');
  return response.json();
}
```

---

## 🚀 Deployment

### Production Checklist
- [ ] Change default passwords
- [ ] Set strong JWT secret
- [ ] Configure email settings
- [ ] Set up MongoDB Atlas
- [ ] Configure CORS for production domain
- [ ] Enable HTTPS
- [ ] Set up domain and SSL certificate
- [ ] Configure backup strategy

### Recommended Hosting
- **Backend**: Heroku, DigitalOcean, AWS EC2
- **Database**: MongoDB Atlas
- **File Storage**: AWS S3, Cloudinary
- **Email**: Gmail SMTP, SendGrid, Mailgun

---

## 🤝 Support

For technical support or questions about the API:
- **Email**: tech@nrbcarepo.org
- **Documentation**: [API Docs](https://api.nrbcarepo.org/docs)
- **GitHub**: [Repository](https://github.com/nrbc-arepo/website-backend)

---

*Built with ❤️ for New Revival Baptist Church, Arepo* 🙏