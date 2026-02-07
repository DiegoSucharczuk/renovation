'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { hebrewLabels } from '@/lib/labels';

export default function CreateProjectPage() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [budget, setBudget] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('יש להתחבר כדי ליצור פרויקט');
      return;
    }

    setLoading(true);

    try {
      // Create project
      const projectRef = await addDoc(collection(db, 'projects'), {
        name,
        address,
        ownerId: user.id,
        budgetPlanned: parseFloat(budget),
        budgetAllowedOverflowPercent: 15,
        createdAt: new Date(),
      });

      // Add user as owner
      await addDoc(collection(db, 'projectUsers'), {
        projectId: projectRef.id,
        userId: user.id,
        roleInProject: 'OWNER',
      });

      router.push('/projects');
    } catch (err: any) {
      setError('שגיאה ביצירת הפרויקט');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          {hebrewLabels.createProject}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label={hebrewLabels.projectName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            margin="normal"
          />

          <TextField
            fullWidth
            label={hebrewLabels.address}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            margin="normal"
          />
          
          <TextField
            fullWidth
            label={hebrewLabels.budgetPlanned}
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            required
            margin="normal"
            inputProps={{ min: 0, step: 1000 }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {hebrewLabels.createProject}
          </Button>

          <Button
            fullWidth
            variant="outlined"
            onClick={() => router.back()}
          >
            {hebrewLabels.cancel}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
