'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Link,
  Alert,
  Divider,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '@/contexts/AuthContext';
import { hebrewLabels } from '@/lib/labels';
import { collection, query, where, getDocs, getDocsFromServer, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [invitationInfo, setInvitationInfo] = useState<any>(null);
  const [invitationHandled, setInvitationHandled] = useState(false);
  const { signUp, signInWithGoogle, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationToken = searchParams.get('invitation');

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
          setEmail(invitation.email); // מילוי אוטומטי של האימייל
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
          
          // ניווט לפרויקט
          console.log('Redirecting to project:', invitationInfo.projectId);
          router.push(`/dashboard/${invitationInfo.projectId}`);
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
    router.push('/projects');
  };

  // Redirect to projects page if user is already logged in (but not if we have an invitation or already handled it)
  useEffect(() => {
    if (user && !invitationToken && !invitationHandled) {
      router.push('/projects');
    }
  }, [user, router, invitationToken, invitationHandled]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }

    if (password.length < 6) {
      setError('הסיסמה חייבת להיות לפחות 6 תווים');
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password, name);
      
      // טיפול בהזמנה אחרי הרשמה
      await handlePostRegistration(email);
    } catch (err: any) {
      setError('שגיאה בהרשמה. אנא נסה שנית.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
          {hebrewLabels.register}
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

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label={hebrewLabels.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            margin="normal"
          />

          <TextField
            fullWidth
            label={hebrewLabels.email}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            margin="normal"
            autoComplete="email"
            disabled={!!invitationInfo}
            helperText={invitationInfo ? "אימייל מוגדר מראש מההזמנה" : ""}
          />
          
          <TextField
            fullWidth
            label={hebrewLabels.password}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            margin="normal"
            autoComplete="new-password"
          />

          <TextField
            fullWidth
            label="אישור סיסמה"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            margin="normal"
            autoComplete="new-password"
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {hebrewLabels.signUp}
          </Button>

          <Divider sx={{ my: 2 }}>או</Divider>

          <Button
            fullWidth
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleSignIn}
            disabled={loading}
            sx={{ mb: 2 }}
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
