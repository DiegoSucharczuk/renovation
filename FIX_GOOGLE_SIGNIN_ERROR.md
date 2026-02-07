# 🔧 Fix: Google Sign-In "redirect_uri_mismatch" Error

## The Problem
Error 400: redirect_uri_mismatch - Firebase needs to authorize localhost as a valid domain.

## ✅ Quick Fix (2 minutes)

### Step 1: Add Authorized Domain in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **renovation-management**
3. Go to **Authentication** → **Settings** tab
4. Scroll down to **Authorized domains** section
5. You should see:
   - `localhost` ✅ (should already be there)
   - `renovation-management.firebaseapp.com` ✅
   
6. **If `localhost` is missing:**
   - Click **Add domain**
   - Type: `localhost`
   - Click **Add**

### Step 2: Verify Google Provider Settings

1. Still in **Authentication** → **Sign-in method** tab
2. Click on **Google** provider
3. Make sure it's **Enabled** ✅
4. Check that your **support email** is selected
5. Click **Save**

### Step 3: Clear Browser Cache & Retry

1. Close all browser tabs with your app
2. Clear browser cache (or use Incognito/Private mode)
3. Go to **http://localhost:3000/login**
4. Click "התחבר עם Google" again

## 🔍 Additional Check (if still not working)

### Verify Firebase Config

Make sure your `.env.local` has the correct Firebase config:

```bash
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=renovation-management.firebaseapp.com
```

**NOT** `yrenovation-management.firebaseapp.com` (notice the typo in your current config)

### Fix the Typo:

Your current `.env.local` has:
```
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=yrenovation-management.firebaseapp.com
```

Should be:
```
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=renovation-management.firebaseapp.com
```

Remove the "y" at the beginning!

## 🎯 After Fixing

1. Restart your dev server:
   ```bash
   # Press Ctrl+C to stop the server
   npm run dev
   ```

2. Try Google Sign-In again
3. Should work perfectly! ✅

## ℹ️ Why This Happens

Firebase Google Sign-In requires:
- ✅ The redirect URI must be in the authorized domains list
- ✅ For development: `localhost` must be authorized
- ✅ For production: Your domain must be added

The error occurs when:
- ❌ `localhost` is not in the authorized domains
- ❌ There's a typo in the auth domain
- ❌ Google provider is not properly configured

---

**Quick Summary:**
1. Check for typo: `yrenovation` → `renovation` in `.env.local`
2. Verify `localhost` is in Firebase authorized domains
3. Restart dev server
4. Try again

This should fix the issue! 🚀
