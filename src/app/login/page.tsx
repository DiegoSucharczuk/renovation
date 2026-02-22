'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle, user } = useAuth();
  const router = useRouter();

  // Redirect to projects page if user is already logged in
  useEffect(() => {
    if (user) {
      router.push('/projects');
    }
  }, [user, router]);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
      router.push('/projects');
    } catch (err: any) {
      setError('שגיאה בהתחברות עם Google. אנא נסה שנית.');
      console.error('Google sign-in error:', err);
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <img 
            src="/login picture.png" 
            alt="Login" 
            style={{ 
              maxWidth: '200px', 
              width: '100%', 
              height: 'auto',
              borderRadius: '8px'
            }} 
          />
        </Box>
        
        <Typography variant="h4" component="h1" gutterBottom align="center">
          התחברות
        </Typography>

        <Typography variant="body2" align="center" sx={{ mt: 2, mb: 3, color: 'text.secondary' }}>
          התחבר באמצעות חשבון Google שלך כדי ליתן גישה ל-Google Drive ו-Gmail
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
            התחבר עם Google
          </Button>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Link href="/register" underline="hover">
              עדיין אין לך חשבון? הירשם כאן
            </Link>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
