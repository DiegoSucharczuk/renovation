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

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, signInWithGoogle, user } = useAuth();
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
      router.push('/projects');
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
      await signInWithGoogle();
      // Don't redirect here - let the auth state change trigger the redirect
      // The useEffect below will handle the navigation
    } catch (err: any) {
      setError('שגיאה בהרשמה עם Google. אנא נסה שנית.');
      console.error('Google sign-in error:', err);
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          {hebrewLabels.register}
        </Typography>
        
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
