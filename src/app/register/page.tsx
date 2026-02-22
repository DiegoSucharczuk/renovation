'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Container,
  Paper,
  Button,
  Typography,
  Box,
  Link,
  Alert,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, getDocsFromServer, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function RegisterForm() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [invitationInfo, setInvitationInfo] = useState<any>(null);
  const [invitationHandled, setInvitationHandled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { signInWithGoogle, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get('invitation');

  // Track if component is mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load invitation details if token exists
  useEffect(() => {
    const loadInvitation = async () => {
      if (!invitationToken) return;

      try {
        const invitationsQuery = query(
          collection(db, 'pendingInvitations'),
          where('token', '==', invitationToken)
        );
        const invitationsSnapshot = await getDocsFromServer(invitationsQuery);

        if (!invitationsSnapshot.empty) {
          const invitationData = invitationsSnapshot.docs[0].data();
          const invitation = {
            id: invitationsSnapshot.docs[0].id,
            email: invitationData.email || '',
            projectId: invitationData.projectId || '',
            projectName: invitationData.projectName || '',
            roleInProject: invitationData.roleInProject || 'VIEW_ONLY',
            invitedByName: invitationData.invitedByName || '',
          };
          setInvitationInfo(invitation);
        }
      } catch (err) {
        console.error('Error loading invitation:', err);
      }
    };

    loadInvitation();
  }, [invitationToken]);

  // פונקציה משותפת לטיפול בהזמנה אחרי הרשמה
  const handlePostRegistration = async (userEmail: string, maxRetries = 5) => {
    console.log('handlePostRegistration called with email:', userEmail);
    console.log('invitationInfo:', invitationInfo);
    
    if (!invitationInfo) {
      console.log('No invitation, redirecting to /projects');
      router.push('/projects');
      return;
    }

    // נסה למצוא את המשתמש עד 5 פעמים עם המתנה ביניהם
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${maxRetries}: Querying users collection for email:`, userEmail);
        const usersQuery = query(
          collection(db, 'users'),
          where('email', '==', userEmail.toLowerCase())
        );
        const usersSnapshot = await getDocsFromServer(usersQuery);
        
        if (!usersSnapshot.empty) {
          const userId = usersSnapshot.docs[0].id;
          console.log('User found, userId:', userId);
          
          // הוספה לפרויקט
          console.log('Adding user to projectUsers...');
          await addDoc(collection(db, 'projectUsers'), {
            projectId: invitationInfo.projectId,
            userId: userId,
            roleInProject: invitationInfo.roleInProject,
            addedAt: new Date(),
          });
          console.log('User added to project successfully');

          // מחיקת ההזמנה
          console.log('Deleting invitation...');
          await deleteDoc(doc(db, 'pendingInvitations', invitationInfo.id));
          console.log('Invitation deleted');
          
          // סימון שטיפלנו בהזמנה
          setInvitationHandled(true);
          
          // ניווט לפרויקט - משתמשים ב-window.location.href לעשות full page navigation
          console.log('Redirecting to project:', invitationInfo.projectId);
          // השתמש ב-setTimeout כדי לוודא שהכל הסתיים לפני ה-redirect
          setTimeout(() => {
            window.location.href = `/dashboard/${invitationInfo.projectId}`;
          }, 100);
          return;
        } else {
          console.log(`Attempt ${attempt}: User not found yet, waiting...`);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } catch (err) {
        console.error(`Error on attempt ${attempt}:`, err);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    console.log('Max retries reached, fallback: redirecting to /projects');
    window.location.href = '/projects';
  };

  // Redirect to projects page if user is already logged in (but not if we have an invitation)
  useEffect(() => {
    if (!isMounted) return; // וודא שרץ רק אחרי mount
    
    // אם יש invitation token, לא עושים כלום - handlePostRegistration ידאג לזה
    if (invitationToken) {
      console.log('Invitation token exists, skipping auto-redirect');
      return;
    }
    
    if (user) {
      console.log('User logged in and no invitation, redirecting to /projects');
      router.push('/projects');
    }
  }, [isMounted, user, router, invitationToken]);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await signInWithGoogle();
      
      // המתן יותר זמן לפופאפ להיסגר לגמרי
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // קבל את האימייל של המשתמש מ-Google
      if (result?.user?.email) {
        await handlePostRegistration(result.user.email);
      } else {
        router.push('/projects');
      }
    } catch (err: any) {
      setError('שגיאה בהרשמה עם Google. אנא נסה שנית.');
      console.error('Google sign-in error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          הירשם
        </Typography>

        <Typography variant="body2" align="center" sx={{ mt: 2, mb: 3, color: 'text.secondary' }}>
          הירשם עם חשבון Google שלך כדי ליתן גישה ל-Google Drive ו-Gmail
        </Typography>
        
        {invitationInfo && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              🎉 הוזמנת להצטרף לפרויקט!
            </Typography>
            <Typography variant="body2">
              <strong>{invitationInfo.invitedByName}</strong> הזמין אותך להצטרף לפרויקט{' '}
              <strong>{invitationInfo.projectName}</strong>
            </Typography>
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              השלם את ההרשמה כדי להצטרף לפרויקט
            </Typography>
          </Alert>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 3 }}>
          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleSignIn}
            disabled={loading}
            sx={{ 
              backgroundColor: '#1976d2',
              '&:hover': { backgroundColor: '#1565c0' }
            }}
          >
            הירשם עם Google
          </Button>

          <Box sx={{ textAlign: 'center' }}>
            <Link href="/login" underline="hover">
              כבר יש לך חשבון? התחבר כאן
            </Link>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>טוען...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
