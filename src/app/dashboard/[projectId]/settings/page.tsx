'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Stack,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { updateDoc, doc, getDocFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectRole } from '@/hooks/useProjectRole';
import AccessDenied from '@/components/AccessDenied';
import type { Project } from '@/types';

export default function ProjectSettingsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { user, firebaseUser } = useAuth();
  const router = useRouter();
  const { role, permissions, loading: roleLoading } = useProjectRole(projectId, firebaseUser?.uid || null);
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [openProjectDialog, setOpenProjectDialog] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [projectForm, setProjectForm] = useState({
    name: '',
    address: '',
    budgetPlanned: 0,
    budgetAllowedOverflowPercent: 10,
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchData();
  }, [user, projectId, router]);

  useEffect(() => {
    if (project) {
      setProjectForm({
        name: project.name,
        address: project.address,
        budgetPlanned: project.budgetPlanned,
        budgetAllowedOverflowPercent: project.budgetAllowedOverflowPercent,
      });
    }
  }, [project]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Load project
      const projectDoc = await getDocFromServer(doc(db, 'projects', projectId));
      if (projectDoc.exists()) {
        setProject({
          id: projectDoc.id,
          ...projectDoc.data(),
          createdAt: projectDoc.data().createdAt?.toDate() || new Date(),
        } as Project);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProject = async () => {
    setError('');

    if (!projectForm.name || !projectForm.address || projectForm.budgetPlanned <= 0) {
      setError('יש למלא את כל השדות בצורה תקינה');
      return;
    }

    try {
      await updateDoc(doc(db, 'projects', projectId), {
        name: projectForm.name,
        address: projectForm.address,
        budgetPlanned: projectForm.budgetPlanned,
        budgetAllowedOverflowPercent: projectForm.budgetAllowedOverflowPercent,
        updatedAt: new Date(),
      });

      setOpenProjectDialog(false);
      setSuccessMessage('פרטי הפרויקט עודכנו בהצלחה');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchData();
    } catch (error) {
      console.error('Error updating project:', error);
      setError('שגיאה בעדכון פרטי הפרויקט');
    }
  };

  if (roleLoading || loading) {
    return (
      <DashboardLayout projectId={projectId} project={project || undefined}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  if (!role || !permissions || !permissions.canEditProject) {
    return (
      <DashboardLayout projectId={projectId} project={project || undefined}>
        <AccessDenied message="אין לך הרשאה לערוך הגדרות פרויקט" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout projectId={projectId} project={project || undefined}>
      <Box sx={{ px: 3, py: 4 }}>
        {/* Header */}
        <Box mb={4}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            פרטי פרויקט
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ניהול המידע הבסיסי של הפרויקט
          </Typography>
        </Box>

        {/* Success Message */}
        {successMessage && (
          <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}

        {/* Main Section: Project Info */}
        <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{ backgroundColor: '#f5f5f5' }}
          >
            <Typography variant="h5" fontWeight="bold">
              📋 מידע על הפרויקט
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 3 }}>
            <Box display="flex" justifyContent="flex-end" mb={3}>
              {permissions.canEditProject && (
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={() => setOpenProjectDialog(true)}
                >
                  ערוך פרטי פרויקט
                </Button>
              )}
            </Box>
            
            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  שם הפרויקט
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {project?.name}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  כתובת
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {project?.address}
                </Typography>
              </Box>

              <Box display="flex" gap={4}>
                <Box flex={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    תקציב מתוכנן
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    ₪{project?.budgetPlanned.toLocaleString()}
                  </Typography>
                </Box>

                <Box flex={1}>
                  <Typography variant="subtitle2" color="text.secondary">
                    אחוז חריגה מותר
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {project?.budgetAllowedOverflowPercent}%
                  </Typography>
                </Box>
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Edit Project Dialog */}
        <Dialog open={openProjectDialog} onClose={() => setOpenProjectDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>ערוך פרטי פרויקט</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <TextField
              fullWidth
              label="שם הפרויקט"
              value={projectForm.name}
              onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="כתובת"
              value={projectForm.address}
              onChange={(e) => setProjectForm({ ...projectForm, address: e.target.value })}
              margin="normal"
            />
            
            <TextField
              fullWidth
              type="number"
              label="תקציב מתוכנן (₪)"
              value={projectForm.budgetPlanned}
              onChange={(e) => setProjectForm({ ...projectForm, budgetPlanned: Number(e.target.value) })}
              margin="normal"
            />
            
            <TextField
              fullWidth
              type="number"
              label="אחוז חריגה מותר (%)"
              value={projectForm.budgetAllowedOverflowPercent}
              onChange={(e) => setProjectForm({ ...projectForm, budgetAllowedOverflowPercent: Number(e.target.value) })}
              margin="normal"
              inputProps={{ min: 0, max: 100 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenProjectDialog(false)}>ביטול</Button>
            <Button onClick={handleUpdateProject} variant="contained">
              שמור שינויים
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}
