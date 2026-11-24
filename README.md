# LinkShort — AI-Powered Link Management & Marketing Telemetry Platform

A modern, production-grade link management and marketing telemetry platform built with **Node.js, Express.js, MongoDB, Google Gemini AI, and EJS**. 

LinkShort elevates basic URL shortening into an enterprise attribution suite featuring **automated AI content classification, campaign UTM builders, device/referrer telemetry, JWT-based multi-tenancy, and 1-click executive CSV data reporting**.

**Live Demo:** [LinkShort on Render](https://linkshort-jlnb.onrender.com)  
**Source Code:** [GitHub Repository](https://github.com/apradhan47/LinkShort)

---

## 🌟 Key Product Features

### 1. 🤖 Google Gemini AI Content Intelligence
- **Automated URL Previews:** Every destination link is analyzed by Google's flagship **Gemini 3.5 Flash** model to generate a concise, 1-sentence TL;DR preview.
- **Smart Category & Tagging:** AI extracts core topics (#Technology, #SaaS, #Fintech, #Design) and tags links to enhance click-through confidence and safety transparency before clicking.

### 2. 🔐 Multi-Tenancy & Role-Based Workspaces
- **JWT & Encrypted Passwords:** Session cookie authentication backed by `jsonwebtoken` and `bcryptjs` with salted hash encryption.
- **Strict Data Isolation:** Regular users manage only their personal links and private metrics in dedicated workspaces.
- **Master Admin Portal:** Built-in administrative privilege tier (`Aayush 27`) with global system visibility, cross-user link oversight, and global telemetry export.
- **Robust Field Validation:** Enforces space-free unique usernames, RFC-compliant email verification, and a real-time password requirement checklist (Uppercase, Lowercase, Number, Special Character, 8+ characters).

### 3. 📊 Marketing Attribution & UTM Campaign Builder
- **Built-in UTM Builder:** Marketing teams can directly inject `utm_source`, `utm_medium`, and `utm_campaign` parameters with live URL previews.
- **Interactive Telemetry Modal:** Instant in-dashboard attribution breakdown showing:
  - 📱 **Device Distribution** (Mobile, Desktop, Tablet splits)
  - 🌐 **Top Referrers** (Direct, LinkedIn, Twitter, Google, etc.)
  - 🧭 **Browser Telemetry** (Chrome, Safari, Edge, Firefox)
- **1-Click Executive CSV Export:** Generates RFC 4180-compliant CSV reports with click statistics, AI summaries, and lifecycle timestamps for stakeholder presentations.

### 4. 🎨 Next-Gen Glassmorphic Dark UI
- Designed with an atmospheric obsidian aesthetic (`#090d16`), animated ambient radial glows, and frosted glass cards (`backdrop-filter: blur(20px)`).
- **Interactive Timed Hero Carousel:** Auto-advancing feature presentation with progress tracking bars, Oswald typography, and pause-on-hover controls.
- **Inline Action Controls:** Streamlined quick-action pills for instant link copying, status pausing, expiration management, and QR previews.

### 5. 🛡️ Reliability & Security
- **Dynamic QR Codes:** Real-time QR generation and high-resolution PNG download.
- **Scheduled Expiration:** Set link TTL (1, 7, 30, 90 days or custom calendar dates) with automatic traffic rerouting on expiration.
- **Brute-Force & Rate Limiting:** Endpoint protection via `express-rate-limit` to defend against abusive link generation and redirection storms.
- **83.4% Code Coverage:** **46 automated test suites** written with Jest and Supertest.

---

## 💻 Tech Stack

| Category | Technologies |
| :--- | :--- |
| **Artificial Intelligence** | Google Gemini API (`@google/genai` - Gemini 3.5 Flash) |
| **Backend Architecture** | Node.js (v22), Express.js 5.x |
| **Database & ODM** | MongoDB Atlas, Mongoose 8.x |
| **Authentication & Security** | JWT (`jsonwebtoken`), `bcryptjs`, `cookie-parser`, `express-rate-limit` |
| **Frontend & UI** | EJS Templating, Vanilla JavaScript, CSS Glassmorphism, Boxicons, Oswald/Inter fonts |
| **Data Visualizations** | Chart.js |
| **Utilities** | QRCode, ShortID, Dotenv |
| **Testing & QA** | Jest, Supertest, MongoDB Memory Server (**46 passing tests**) |
| **Hosting & CI/CD** | Render (Production Auto-Deploy via GitHub) |

---

## 🏛️ System Architecture

```text
[ Client Request ]
       │
       ▼
[ Express Router ] ── (Rate Limiting & JWT Auth Middleware)
       │
       ├─► [ Static Controller ] ── (Renders Glassmorphic Auth & Dark Dashboard)
       │
       ├─► [ URL Controller ]
       │        ├─► [ Google Gemini AI Service ] ── (Generates Summary & Tags)
       │        ├─► [ MongoDB Atlas (URL + User Models) ]
       │        └─► [ CSV Telemetry Pipeline ]
       │
       └─► [ Redirection Engine ] ── (Records User-Agent, Device, Country & Referrer)
```

---

## 📁 Project Structure

```text
LinkShort/
├── controllers/
│   ├── url.js             # Shortening, telemetry, CSV export, QR & editing
│   └── user.js            # User signup, login, validation, and admin auth
├── middlewares/
│   ├── auth.js            # JWT verification & multi-tenant route protection
│   └── rateLimiter.js     # IP rate limiters for creation & redirects
├── models/
│   ├── url.js             # URL schema with AI metadata & visit history
│   └── user.js            # User schema with hashed passwords & roles
├── routes/
│   ├── staticRouter.js    # Dashboard, auth gateway, and analytics views
│   ├── url.js             # API & form endpoints for URL operations
│   └── user.js            # Authentication routes (/login, /signup, /logout)
├── services/
│   ├── aiService.js       # Gemini 3.5 Flash integration & JSON parser
│   └── auth.js            # JWT signing & token decode logic
├── tests/
│   ├── rateLimiter.test.js # Security & rate-limiting test suites
│   └── url.test.js        # End-to-end integration tests (46 total)
├── views/
│   ├── analytics.ejs      # Deep-dive individual link analytics
│   ├── auth.ejs           # Timed carousel hero & segmented login/signup
│   ├── home.ejs           # Dark glassmorphic workspace dashboard
│   └── qrcode.ejs         # Standalone QR code view & download
├── app.js                 # Express application configuration
├── index.js               # Server bootstrap & MongoDB connection
└── package.json           # Project manifest & dependencies
```

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- Node.js (v18 or higher)
- MongoDB instance (Local or MongoDB Atlas connection string)
- Google Gemini API Key (Available free via [Google AI Studio](https://aistudio.google.com/))

### 2. Installation & Setup
```bash
# Clone the repository
git clone https://github.com/apradhan47/LinkShort.git
cd LinkShort

# Install dependencies
npm install

# Create environment configuration
cp .env.example .env
```

### 3. Environment Variables (`.env`)
```env
PORT=8000
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_google_gemini_api_key
JWT_SECRET=your_super_secret_jwt_key
BASE_URL=http://localhost:8000
```

### 4. Running the Application
```bash
# Start in production mode
npm start

# Or start with nodemon for development
npm run dev
```
Open **`http://localhost:8000`** in your browser.

---

## 🧪 Testing & Code Quality

The platform includes comprehensive test suites covering URL creation, expiration boundaries, rate limiting, and dashboard rendering.

```bash
# Run all test suites
npm test

# Run tests with detailed code coverage report
npm run test:coverage
```

**Test Results:**
- **Test Suites:** 3 passed, 3 total
- **Tests:** 63 passed, 63 total
- **Function Coverage:** 88.6%
- **Line Coverage:** 82.4%

---

## 👨‍💻 Author

**Aayush Pradhan**
- LinkedIn: [linkedin.com/in/aayushpradhan02](https://www.linkedin.com/in/aayushpradhan02/)
- Portfolio / GitHub: [github.com/apradhan47](https://github.com/apradhan47)
- Email: aayushreq02@gmail.com

---

## 📄 License
This project is open-source under the [ISC License](LICENSE).
