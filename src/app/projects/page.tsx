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
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import CloseIcon from '@mui/icons-material/Close';
import MapIcon from '@mui/icons-material/Map';
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
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');
  const { user, signOut } = useAuth();
  const router = useRouter();

  // Debug: בדיקה אם המשתמש הוא super admin
  useEffect(() => {
    if (user) {
      console.log('User email:', user.email);
      console.log('Is super admin:', isSuperAdmin(user.email));
    }
  }, [user]);

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

  const handleAddressClick = (e: React.MouseEvent, address: string) => {
    e.stopPropagation(); // למנוע מעבר לדשבורד
    setSelectedAddress(address);
    setMapDialogOpen(true);
  };

  const handleCloseMap = () => {
    setMapDialogOpen(false);
    setSelectedAddress('');
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        pb: 6
      }}
    >
      <Container maxWidth="lg" sx={{ pt: 4 }}>
        {/* Header */}
        <Box 
          sx={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: 3,
            p: 3,
            mb: 4,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h3" component="h1" sx={{ fontWeight: 700, color: '#667eea', mb: 1 }}>
                🏠 {hebrewLabels.projects}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                שלום {user?.name || user?.email} 👋
              </Typography>
            </Box>
            <Box display="flex" gap={2}>
              {isSuperAdmin(user?.email) && (
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<AdminPanelSettingsIcon />}
                  onClick={() => router.push('/admin')}
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                  }}
                >
                  ניהול מערכת
                </Button>
              )}
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => router.push('/projects/create')}
                sx={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                  }
                }}
              >
                {hebrewLabels.createProject}
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<LogoutIcon />}
                onClick={handleSignOut}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                התנתק
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Projects Grid */}
        <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(320px, 1fr))" gap={3}>
          {projects.map((project) => (
            <Card 
              key={project.id}
              sx={{ 
                height: '100%',
                transition: 'all 0.3s ease',
                borderRadius: 3,
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.2)',
                }
              }}
            >
              <CardActionArea 
                onClick={() => router.push(`/dashboard/${project.id}`)}
                sx={{ height: '100%' }}
              >
                {/* Card Header with Gradient */}
                <Box 
                  sx={{ 
                    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                    p: 3,
                    color: 'white',
                  }}
                >
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 1, color: '#ffffff' }}>
                    🏗️ {project.name}
                  </Typography>
                  <Box 
                    display="flex" 
                    alignItems="center" 
                    gap={1}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { 
                        opacity: 0.8,
                        textDecoration: 'underline'
                      }
                    }}
                    onClick={(e) => handleAddressClick(e, project.address)}
                  >
                    <MapIcon sx={{ fontSize: '1rem', color: '#ffeb3b' }} />
                    <Typography variant="body2" sx={{ color: '#ffeb3b', fontWeight: 500 }}>
                      {project.address}
                    </Typography>
                  </Box>
                </Box>
                
                {/* Card Content */}
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      💰 תקציב:
                    </Typography>
                    <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                      ₪{project.budgetPlanned.toLocaleString()}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" color="text.secondary">
                      📅 נוצר:
                    </Typography>
                    <Typography variant="body2">
                      {project.createdAt.toLocaleDateString('he-IL')}
                    </Typography>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
        
        {/* Empty State */}
        {projects.length === 0 && (
          <Box 
            sx={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: 3,
              p: 8,
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Typography variant="h3" sx={{ mb: 2, fontSize: '4rem' }}>
              🏡
            </Typography>
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
              אין לך פרויקטים עדיין
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              התחל את המסע שלך בניהול השיפוץ - צור את הפרויקט הראשון שלך!
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => router.push('/projects/create')}
              sx={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '1.1rem',
                px: 4,
                py: 1.5,
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                }
              }}
            >
              יצירת פרויקט ראשון
            </Button>
          </Box>
        )}
      </Container>

      {/* Map Dialog */}
      <Dialog 
        open={mapDialogOpen} 
        onClose={handleCloseMap}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={1}>
              <MapIcon color="primary" />
              <Typography variant="h6">מיקום הפרויקט</Typography>
            </Box>
            <IconButton onClick={handleCloseMap} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body1" sx={{ mb: 2 }}>
              📍 {selectedAddress}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<MapIcon />}
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
              fullWidth
              sx={{ 
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
              }}
            >
              פתח ב-Google Maps
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
