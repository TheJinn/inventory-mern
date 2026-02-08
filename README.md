# MERN Inventory Management System

A full-stack Inventory and Sales Management System built using the **MERN stack (MongoDB, Express, React, Node.js)**.
The application provides inventory tracking, sales statistics, user authentication, and profile management with OTP-based verification.

---

## 🚀 Features

- User authentication (Login / Register)
- OTP-based verification (development-friendly)
- Inventory management (products & stock tracking)
- Sales & purchase statistics (weekly / monthly)
- Top products analytics
- User profile & password reset from Settings page
- Responsive UI (desktop & mobile)
- Mobile fixed top navbar with logout dropdown

---

## 🛠️ Tech Stack

### Frontend
- React (Vite)
- CSS Modules
- Responsive UI (Desktop & Mobile)

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)

---

## 🔐 OTP Verification (Important)

⚠️ **For development and testing purposes only**

- OTPs are **printed in the console**
- SMTP setup is optional for development
- This makes testing easier without configuring email immediately

### Example (server console)
```bash
OTP for user@example.com: 483921
```

👉 In production, configure SMTP to send OTPs via email.

---

## ⚙️ Environment Variables

Create a `.env` file inside the **server** directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

# Optional SMTP (for production use)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=Inventory App <your_email@gmail.com>
```

---

## ▶️ Running the Project Locally

### 1️⃣ Backend
```bash
cd server
npm install
npm run dev
```

### 2️⃣ Frontend
```bash
cd client
npm install
npm run dev
```

---

## 📱 Mobile Support

- Sidebar collapses on mobile view
- Logo appears at the **top-left**
- User name appears at the **top-right**
- Clicking the user name opens a **logout dropdown**
- Top bar remains **fixed while scrolling**

---

## 🧪 Testing Notes

- OTP is visible in the **server console**
- Email field is read-only in Settings
- Password reset uses **Password + Confirm Password**
- Both passwords must match to update successfully

---

## 📌 Future Enhancements

- Role-based access (Admin / Staff)
- OTP rate limiting & hashing
- Production email service (SendGrid / Amazon SES)
- Export reports (PDF / Excel)
- Dashboard performance optimizations

---

## 👨‍💻 Author

Built as a MERN stack project for learning, testing, and real-world scalability.
