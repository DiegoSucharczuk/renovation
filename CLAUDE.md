# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Hebrew RTL renovation management system built with Next.js 16, Firebase, and Material UI. Users manage renovation projects with rooms, tasks, vendors, payments, and budgets. The app includes Google Drive integration for file storage and Gmail integration for sending meeting summaries.

## Commands

```bash
npm run dev           # Start development server on port 3000
npm run dev:clean     # Clean cache and start dev server
npm run build         # Build for production
npm start             # Start production server
npm run lint          # Run ESLint
```

## Architecture

### Tech Stack
- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **UI**: Material UI with RTL (right-to-left) support, Emotion styling
- **Backend**: Firebase Authentication, Firestore, Firebase Storage
- **File Storage**: Google Drive API (user's personal Drive)
- **Email**: Gmail API (via Google OAuth)

### Path Aliases
- `@/*` maps to `./src/*` (configured in tsconfig.json)

### Environment Variables
Required in `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Key Concepts

### Authentication & Authorization
- **Authentication**: Firebase Auth with email/password or Google OAuth
- **Google OAuth Scopes**: Requires `drive` and `gmail.send` scopes
- **Token Management**: Access tokens cached in-memory with 50-minute TTL, auto-refreshed on expiry
- **Authorization**: Role-based access control with 6 roles defined in `src/lib/permissions.ts`

### Roles & Permissions
Six project roles with different permissions (defined in `src/types/index.ts` and `src/lib/permissions.ts`):
1. **OWNER** - Full access (budget, payments, tasks, rooms, user management)
2. **ADMIN** - Full access (same as OWNER)
3. **FAMILY** - View budget/payments, edit tasks/rooms, no user management
4. **CONTRACTOR** - Edit tasks only, no financial data
5. **DESIGNER** - Edit tasks only, no financial data
6. **VIEW_ONLY** - Read-only access, no financial data

Use `useProjectRole` hook to check user permissions in components.

### Data Model (Firestore Collections)
- `users` - User profiles
- `projects` - Renovation projects
- `projectUsers` - User-project relationships with roles
- `rooms` - Rooms in projects (status: NOT_STARTED, IN_PROGRESS, BLOCKED, DONE)
- `tasks` - Tasks with dependencies, categories, and vendor assignments
- `vendors` - Contractors and service providers
- `payments` - Payment tracking (status: PLANNED, DUE, PAID, OVERDUE)
- `contracts` - Contract documents stored in Google Drive
- `notificationSettings` - User notification preferences
- `budgetItems` - Budget planning items by category

### Google Drive Integration
Files are uploaded to the user's personal Google Drive folder (שיפוץ-קבצים) and shared with project members. Key functions in `src/lib/googleDrive.ts`:
- `uploadToDrive(file, folder, userEmails)` - Upload and share file
- `deleteFromDrive(fileId)` - Delete file
- `fetchFileAsBlob(fileId)` - Fetch file for display
- Token auto-refresh: If API call fails with 401/expired token, `refreshAccessToken()` attempts silent re-auth

### Hebrew UI & RTL
- All user-facing text uses Hebrew labels from `src/lib/labels.ts`
- Material UI configured for RTL in `src/components/ThemeRegistry.tsx`
- Use `hebrewLabels` object for consistent UI text
- Direction is right-to-left throughout the app

## Important Files

### Core Configuration
- `src/lib/firebase.ts` - Firebase initialization (lazy loading, client-side only)
- `src/lib/permissions.ts` - Role permission definitions and helpers
- `src/lib/googleDrive.ts` - Google Drive API operations with token management
- `src/types/index.ts` - All TypeScript type definitions

### Context & Hooks
- `src/contexts/AuthContext.tsx` - Authentication context with Google OAuth
- `src/hooks/useProjectRole.ts` - Hook for checking user's project role and permissions

### Layout & UI
- `src/components/DashboardLayout.tsx` - Main dashboard layout with sidebar navigation
- `src/components/ThemeRegistry.tsx` - MUI theme provider with RTL configuration
- `src/components/NavigationDrawer.tsx` - Right-to-left navigation drawer

### Dashboard Pages
All project-specific pages follow pattern: `src/app/dashboard/[projectId]/[feature]/page.tsx`
- `/dashboard/[projectId]` - Dashboard overview
- `/dashboard/[projectId]/rooms` - Room management
- `/dashboard/[projectId]/tasks` - Task management
- `/dashboard/[projectId]/vendors` - Vendor management
- `/dashboard/[projectId]/payments` - Payment tracking
- `/dashboard/[projectId]/budget` - Budget planning
- `/dashboard/[projectId]/meetings` - Meeting summaries with action items
- `/dashboard/[projectId]/settings` - Project settings (users, owners, project details)

## Development Patterns

### Adding New Features
1. Update types in `src/types/index.ts` if adding new data models
2. Add Hebrew labels to `src/lib/labels.ts` for UI text
3. Check permissions using `useProjectRole` hook before rendering/editing
4. Use Firestore getters from `src/lib/firebase.ts`: `getFirebaseDb()`, `getFirebaseAuth()`, `getFirebaseStorage()`

### Permission Checks
```typescript
import { useProjectRole } from '@/hooks/useProjectRole';

const { permissions, role, isOwner, loading } = useProjectRole(projectId, userId);

if (permissions?.canEditBudget) {
  // Render edit controls
}
```

### Google Drive File Upload
```typescript
import { uploadToDrive } from '@/lib/googleDrive';

// Upload and share with project members
const result = await uploadToDrive(file, 'שיפוץ-קבצים', userEmails);
// result contains: { id, webViewLink, webContentLink }
```

### Firestore Queries
```typescript
import { collection, query, where, getDocs } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';

const db = getFirebaseDb();
const q = query(collection(db, 'tasks'), where('projectId', '==', projectId));
const snapshot = await getDocs(q);
```

## Security Considerations

- Firebase initialization only happens client-side (check `typeof window !== 'undefined'`)
- Google OAuth tokens stored in-memory only (not localStorage) for security
- Always verify user has project membership before showing data
- Hide financial data (budget, payments) from CONTRACTOR and DESIGNER roles
- Use Firestore security rules to enforce server-side access control
- File permissions: Contract files shared with project member emails via Google Drive API

## Next.js Configuration

- Custom headers in `next.config.ts` for Google OAuth popups (`Cross-Origin-Opener-Policy: same-origin-allow-popups`)
- Client-side rendering for Firebase (use `'use client'` directive)
- App Router with dynamic routes: `[projectId]` for project-specific pages

## Common Tasks

### Working with Hebrew RTL
- Always add new labels to `src/lib/labels.ts`
- Text direction is automatically RTL in Material UI components
- Use `dir="rtl"` on custom HTML elements if needed

### Adding a New Role Permission
1. Update `RolePermissions` interface in `src/types/index.ts`
2. Add permission logic in `getRolePermissions()` in `src/lib/permissions.ts`
3. Use in components via `useProjectRole` hook

### Adding a New Firestore Collection
1. Define TypeScript interface in `src/types/index.ts`
2. Update Firestore security rules in Firebase Console
3. Use collection helper: `collection(getFirebaseDb(), 'collectionName')`
