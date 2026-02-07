# Quick Start Guide

## Get Started in 5 Minutes

### 1. Install Dependencies
```bash
cd renovation-app
npm install
```

### 2. Set Up Firebase

1. Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password)
3. Enable Firestore Database
4. Copy your Firebase config

### 3. Configure Environment

Create `.env.local` in the `renovation-app` directory:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Create Your First Account

1. Click "הרשמה" (Register)
2. Fill in your details
3. Create a new project
4. Start managing your renovation!

## What's Included

✅ Authentication (Login/Register)
✅ Project Management
✅ Dashboard with Mock Data
✅ Hebrew RTL Interface
✅ Material UI Components
✅ Firebase Integration
✅ Role-Based Permissions

## Next Steps

- Replace mock data with real Firestore queries
- Add more pages (Rooms, Tasks, Vendors, Payments)
- Implement file uploads for contracts
- Add real-time notifications
- Deploy to Vercel

## Need Help?

Check the [README.md](README.md) for detailed documentation.
