'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithGoogle, user } = useAuth();
  const router = useRouter();

  // Redirect to projects page if user is already logged in
  useEffect(() => {
    if (user) {
      router.push('/projects');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      router.push('/projects');
    } catch (err: any) {
      setError('שגיאה בהתחברות. אנא בדוק את פרטי הכניסה.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
          {hebrewLabels.login}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label={hebrewLabels.email}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            margin="normal"
            autoComplete="email"
          />
          
          <TextField
            fullWidth
            label={hebrewLabels.password}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            margin="normal"
            autoComplete="current-password"
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {hebrewLabels.signIn}
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
            התחבר עם Google
          </Button>

          <Box sx={{ textAlign: 'center' }}>
            <Link href="/register" underline="hover">
              עדיין אין לך חשבון? הירשם כאן
            </Link>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
