'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Card,
  CardContent,
  CardActionArea,
  Typography,
  Button,
  Box,
  CircularProgress,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { collection, query, where, getDocs, getDocsFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Project, ProjectUser } from '@/types';
import { hebrewLabels } from '@/lib/labels';
import { isSuperAdmin } from '@/lib/adminConfig';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchProjects = async () => {
      try {
        // Get all projectUsers for this user
        const projectUsersQuery = query(
          collection(db, 'projectUsers'),
          where('userId', '==', user.id)
        );
        const projectUsersSnapshot = await getDocsFromServer(projectUsersQuery);
        const projectIds = projectUsersSnapshot.docs.map(doc => doc.data().projectId);

        if (projectIds.length === 0) {
          setLoading(false);
          return;
        }

        // Get all projects for these projectIds
        const projectsQuery = query(collection(db, 'projects'));
        const projectsSnapshot = await getDocsFromServer(projectsQuery);
        const projectsData = projectsSnapshot.docs
          .filter(doc => projectIds.includes(doc.id))
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          } as Project));

        setProjects(projectsData);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user, router, mounted]);

  if (!mounted || loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          {hebrewLabels.projects}
        </Typography>
        <Box display="flex" gap={2}>
          {isSuperAdmin(user?.email) && (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<AdminPanelSettingsIcon />}
              onClick={() => router.push('/admin')}
            >
              ניהול מערכת
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push('/projects/create')}
          >
            {hebrewLabels.createProject}
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={handleSignOut}
          >
            התנתק
          </Button>
        </Box>
      </Box>

      <Box display="flex" flexWrap="wrap" gap={3}>
        {projects.map((project) => (
          <Box key={project.id} flex="1" minWidth="280px" maxWidth="400px">
            <Card>
              <CardActionArea onClick={() => router.push(`/dashboard/${project.id}`)}>
                <CardContent>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {project.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {project.address}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    תקציב: ₪{project.budgetPlanned.toLocaleString()}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Box>
        ))}
        
        {projects.length === 0 && (
          <Box width="100%">
            <Box textAlign="center" py={8}>
              <Typography variant="h6" color="text.secondary">
                אין לך פרויקטים עדיין. לחץ על "יצירת פרויקט" למעלה כדי ליצור פרויקט חדש.
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Container>
  );
}
