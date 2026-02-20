'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';
import { User } from '@/types';
import { setDriveAccessToken } from '@/lib/googleDrive';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<any>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const firebaseAuth = getFirebaseAuth();
    const firebaseDb = getFirebaseDb();
    
    if (!firebaseAuth) return;
    
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(firebaseDb, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({
            id: firebaseUser.uid,
            name: userData.name,
            email: userData.email,
            createdAt: userData.createdAt?.toDate() || new Date(),
          });
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    const firebaseAuth = getFirebaseAuth();
    const firebaseDb = getFirebaseDb();
    const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    // Update lastLoginAt
    await updateDoc(doc(firebaseDb, 'users', userCredential.user.uid), {
      lastLoginAt: new Date(),
    });
  };

  const signUp = async (email: string, password: string, name: string) => {
    const firebaseAuth = getFirebaseAuth();
    const firebaseDb = getFirebaseDb();
    const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    const user = userCredential.user;

    // Create user document in Firestore
    await setDoc(doc(firebaseDb, 'users', user.uid), {
      name,
      email,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    });
  };

  const signInWithGoogle = async () => {
    const firebaseAuth = getFirebaseAuth();
    const firebaseDb = getFirebaseDb();
    const provider = new GoogleAuthProvider();
    
    // Add Google Drive scope
    provider.addScope('https://www.googleapis.com/auth/drive');
    
    // Add Gmail scope for sending emails
    provider.addScope('https://www.googleapis.com/auth/gmail.send');
    
    // Force consent screen to ensure scopes are granted
    provider.setCustomParameters({
      prompt: 'consent',
      access_type: 'offline'
    });
    
    const userCredential = await signInWithPopup(firebaseAuth, provider);
    const user = userCredential.user;

    console.log('🔐 Sign In Debug - Attempting to get access token...');

    // Method 1: Try standard Firebase method
    let accessToken: string | null = null;
    const credential = GoogleAuthProvider.credentialFromResult(userCredential);
    
    if (credential?.accessToken) {
      accessToken = credential.accessToken;
      console.log('✅ Got access token from credential');
    }
    
    // Method 2: Try from _tokenResponse (Firebase internal)
    if (!accessToken && (userCredential as any)._tokenResponse?.access_token) {
      accessToken = (userCredential as any)._tokenResponse.access_token;
      console.log('✅ Got access token from _tokenResponse');
    }
    
    // Method 3: Try from tokenManager (some Firebase versions)
    if (!accessToken && (user as any).stsTokenManager?.accessToken) {
      accessToken = (user as any).stsTokenManager.accessToken;
      console.log('✅ Got access token from stsTokenManager');
    }
    
    console.log('🔐 Access Token Result:', {
      hasToken: !!accessToken,
      tokenPreview: accessToken ? accessToken.substring(0, 30) + '...' : 'NONE',
      credentialKeys: credential ? Object.keys(credential) : [],
      userCredentialKeys: Object.keys(userCredential),
    });
    
    if (accessToken) {
      // Store the access token for Drive API calls
      setDriveAccessToken(accessToken);
      // Also store in sessionStorage for Gmail API
      sessionStorage.setItem('google_access_token', accessToken);
      console.log('✅ Access tokens stored (Drive & Gmail)');
      console.log('📧 Gmail access token stored:', accessToken.substring(0, 20) + '...');
    } else {
      console.error('❌ CRITICAL: No access token found using any method!');
      console.error('   This means Gmail will not work');
    }

    // Check if user document exists, if not create it
    const userDoc = await getDoc(doc(firebaseDb, 'users', user.uid));
    if (!userDoc.exists()) {
      await setDoc(doc(firebaseDb, 'users', user.uid), {
        name: user.displayName || 'Google User',
        email: user.email || '',
        createdAt: new Date(),
        lastLoginAt: new Date(),
      });
    } else {
      // Update lastLoginAt for existing users
      await updateDoc(doc(firebaseDb, 'users', user.uid), {
        lastLoginAt: new Date(),
      });
    }
    
    // Return the user credential to confirm success
    return userCredential;
  };

  const signOut = async () => {
    const firebaseAuth = getFirebaseAuth();
    await firebaseSignOut(firebaseAuth);
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
