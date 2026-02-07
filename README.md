# ניהול שיפוצים - Renovation Management System

Full-stack Next.js 14 application for managing renovation projects in Hebrew (RTL).

## Features

- **Authentication**: Firebase Authentication with email/password
- **Project Management**: Create and manage multiple renovation projects
- **Role-Based Access Control**: 6 different roles (Owner, Admin, Family, Contractor, Designer, View-Only)
- **Budget Tracking**: Monitor planned vs. actual budget with overflow alerts
- **Task Management**: Track tasks with dependencies, categories, and statuses
- **Room Progress**: Track renovation progress by room
- **Vendor Management**: Manage contractors and vendors
- **Payment Tracking**: Track payments with multiple methods (cheque, bank transfer, cash, credit card)
- **Hebrew RTL UI**: Full right-to-left support using Material UI

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **UI Framework**: Material UI with RTL support
- **Backend**: Firebase (Authentication + Firestore)
- **Styling**: Emotion, RTL styling with stylis-plugin-rtl
- **Deployment**: Vercel (frontend) + Firebase (backend services)

## Prerequisites

- Node.js 18+ and npm
- Firebase account
- Git

## Setup Instructions

### 1. Clone the Repository

```bash
cd renovation-app
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable **Firebase Authentication**:
   - Go to Authentication > Sign-in method
   - Enable "Email/Password" provider
4. Enable **Firestore Database**:
   - Go to Firestore Database
   - Create database in production mode (or test mode for development)
   - Choose a location closest to your users
5. Get your Firebase configuration:
   - Go to Project Settings > General
   - Scroll down to "Your apps"
   - Click the web icon (</>) to add a web app
   - Copy the configuration object

### 3. Environment Variables

Create a `.env.local` file in the `renovation-app` directory and add your Firebase configuration:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 4. Firestore Security Rules

Add these security rules to your Firestore database (in Firebase Console > Firestore Database > Rules):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isSignedIn() {
      return request.auth != null;
    }
    
    // Helper function to check if user belongs to a project
    function isProjectMember(projectId) {
      return isSignedIn() && 
        exists(/databases/$(database)/documents/projectUsers/$(request.auth.uid + '_' + projectId));
    }
    
    // Users collection
    match /users/{userId} {
      allow read: if isSignedIn();
      allow write: if isSignedIn() && request.auth.uid == userId;
    }
    
    // Projects collection
    match /projects/{projectId} {
      allow read: if isProjectMember(projectId);
      allow create: if isSignedIn();
      allow update, delete: if isProjectMember(projectId);
    }
    
    // ProjectUsers collection
    match /projectUsers/{projectUserId} {
      allow read: if isSignedIn();
      allow write: if isSignedIn();
    }
    
    // Rooms, Tasks, Vendors, Payments, Contracts, NotificationSettings
    match /{collection}/{docId} {
      allow read, write: if isSignedIn() &&
        collection in ['rooms', 'tasks', 'vendors', 'payments', 'contracts', 'notificationSettings'];
    }
  }
}
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
renovation-app/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── dashboard/            # Project dashboard
│   │   │   └── [projectId]/      # Dynamic project pages
│   │   ├── login/                # Login page
│   │   ├── register/             # Registration page
│   │   ├── projects/             # Project selection & creation
│   │   ├── layout.tsx            # Root layout with providers
│   │   └── page.tsx              # Home page (redirects)
│   ├── components/               # Reusable components
│   │   ├── DashboardLayout.tsx   # Main layout with sidebar
│   │   └── ThemeRegistry.tsx     # MUI theme with RTL
│   ├── contexts/                 # React contexts
│   │   └── AuthContext.tsx       # Authentication context
│   ├── lib/                      # Utilities and config
│   │   ├── firebase.ts           # Firebase initialization
│   │   ├── labels.ts             # Hebrew labels
│   │   └── permissions.ts        # Role-based permissions
│   └── types/                    # TypeScript types
│       └── index.ts              # All type definitions
├── .env.local                    # Environment variables (not in git)
└── package.json
```

## Data Model

### Collections

1. **users**: User profiles
2. **projects**: Renovation projects
3. **projectUsers**: User-project relationships with roles
4. **rooms**: Rooms in projects
5. **tasks**: Tasks with dependencies
6. **vendors**: Contractors and service providers
7. **payments**: Payment tracking
8. **contracts**: Contract documents
9. **notificationSettings**: User notification preferences

### Roles and Permissions

| Role | Budget | Payments | Edit Tasks | Edit Rooms | Manage Users |
|------|--------|----------|------------|------------|--------------|
| OWNER | ✅ | ✅ | ✅ | ✅ | ✅ |
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |
| FAMILY | View | View | ✅ | ✅ | ❌ |
| CONTRACTOR | ❌ | ❌ | ✅ | ❌ | ❌ |
| DESIGNER | ❌ | ❌ | ✅ | ❌ | ❌ |
| VIEW_ONLY | ❌ | ❌ | ❌ | ❌ | ❌ |

## Usage

### First Time Setup

1. **Register an Account**: Go to `/register` and create a new account
2. **Create a Project**: After login, click "צור פרויקט חדש" (Create New Project)
3. **Fill Project Details**: Enter project name, address, and planned budget
4. **Access Dashboard**: Click on your project to view the dashboard

### Dashboard Features

- **Budget Summary**: View planned, used, and remaining budget
- **Task Progress**: See overall task completion percentage
- **Upcoming Payments**: Track payments that are due soon
- **Room Progress**: Monitor renovation progress by room
- **Alerts**: Get notified about blocked rooms and overdue payments

## Development

### Adding New Pages

Create new pages in `src/app/dashboard/[projectId]/` for project-specific pages.

### Adding New Features

1. Update types in `src/types/index.ts`
2. Add Firestore queries in your components
3. Update permissions in `src/lib/permissions.ts`
4. Add Hebrew labels in `src/lib/labels.ts`

### Testing

Currently using mock data. To use real data:

1. Replace mock data with Firestore queries
2. Use `collection()`, `query()`, `where()`, `getDocs()` from Firebase
3. Ensure proper authentication and permission checks

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

## Security Considerations

- Always verify user authentication on both client and server
- Check user project membership before showing data
- Hide financial data from CONTRACTOR and DESIGNER roles
- Use Firestore security rules to enforce server-side access control
- Never expose Firebase private keys or admin credentials

## Future Enhancements

- [ ] File upload for contracts and invoices
- [ ] Real-time notifications with Firebase Cloud Messaging
- [ ] WhatsApp integration for notifications
- [ ] Gantt chart for task timeline visualization
- [ ] Mobile app (React Native or Flutter)
- [ ] PDF reports generation
- [ ] Multi-currency support
- [ ] Integration with accounting software

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ using Next.js 14, Material UI, and Firebase
