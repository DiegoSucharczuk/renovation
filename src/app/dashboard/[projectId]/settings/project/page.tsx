'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectRole } from '@/hooks/useProjectRole';
import AccessDenied from '@/components/AccessDenied';
import { doc, getDocFromServer, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Project } from '@/types';

export default function ProjectSettingsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { firebaseUser } = useAuth();
  const { role, permissions, loading: roleLoading } = useProjectRole(projectId, firebaseUser?.uid || null);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState<'designer' | null>(null);
  
  const [formData, setFormData] = useState({
    designerName: '',
    designerPhone: '',
    designerEmail: '',
  });

  const fetchProject = useCallback(async () => {
    try {
      setError(null);
      const projectDoc = await getDocFromServer(doc(db, 'projects', projectId));
      if (projectDoc.exists()) {
        const data = projectDoc.data() as Project;
        setProject(data);
        setFormData({
          designerName: data.designerName || '',
          designerPhone: data.designerPhone || '',
          designerEmail: data.designerEmail || '',
        });
      }
    } catch (err) {
      console.error('Error fetching project:', err);
      setError('שגיאה בטעינת פרטי הפרויקט');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!roleLoading) {
      fetchProject();
    }
  }, [roleLoading, fetchProject]);

  const handleOpenDialog = () => {
    setEditMode('designer');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditMode(null);
  };

  const handleSave = async () => {
    try {
      setError(null);

      if (!formData.designerName.trim()) {
        setError('אנא הזן שם המעצבת');
        return;
      }

      await updateDoc(doc(db, 'projects', projectId), {
        designerName: formData.designerName,
        designerPhone: formData.designerPhone,
        designerEmail: formData.designerEmail,
      });

      setProject(prev => prev ? {
        ...prev,
        designerName: formData.designerName,
        designerPhone: formData.designerPhone,
        designerEmail: formData.designerEmail,
      } : null);

      handleCloseDialog();
    } catch (err) {
      console.error('Error saving designer:', err);
      setError('שגיאה בשמירה. אנא נסה שוב');
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

  if (!permissions?.canEditProject) {
    return (
      <DashboardLayout projectId={projectId} project={project || undefined}>
        <AccessDenied message="אין לך הרשאה לערוך הגדרות פרויקט" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout projectId={projectId} project={project || undefined} scrollable={true}>
      <Box sx={{ px: { xs: 2, md: 4 }, py: 4, backgroundColor: '#f4f7fe', minHeight: '100vh' }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Typography variant="h4" fontWeight="800" gutterBottom sx={{ mb: 4 }}>
            ⚙️ הגדרות פרויקט
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

          {/* Designer Card */}
          <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', mb: 4 }}>
            <CardContent sx={{ p: 4 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                <Box>
                  <Typography variant="h6" fontWeight="800" sx={{ mb: 1 }}>
                    🎨 מעצבת הפרויקט
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    פרטי איש הקשר של המעצבת
                  </Typography>
                </Box>
                <Button variant="outlined" onClick={handleOpenDialog}>
                  {project?.designerName ? '✏️ עדכן' : '➕ הוסף'}
                </Button>
              </Box>

              {project?.designerName ? (
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">שם</Typography>
                    <Typography variant="body1" fontWeight="600">{project.designerName}</Typography>
                  </Box>
                  {project.designerPhone && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">טלפון</Typography>
                      <Typography variant="body1" fontWeight="600">{project.designerPhone}</Typography>
                    </Box>
                  )}
                  {project.designerEmail && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">אימייל</Typography>
                      <Typography variant="body1" fontWeight="600">{project.designerEmail}</Typography>
                    </Box>
                  )}
                </Stack>
              ) : (
                <Typography color="text.secondary">לא הוגדרה עדיין</Typography>
              )}
            </CardContent>
          </Card>

          {/* Project Address Card */}
          <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" fontWeight="800" sx={{ mb: 3 }}>
                📍 כתובת הפרויקט
              </Typography>
              <Typography variant="body1" fontWeight="600">
                {project?.address || 'לא הוגדרה'}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Dialog for Designer */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
          {project?.designerName ? '✏️ עדכון מעצבת' : '➕ הוסף מעצבת'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="שם המעצבת"
              value={formData.designerName}
              onChange={e => setFormData({ ...formData, designerName: e.target.value })}
              placeholder="שרה כהן"
            />
            <TextField
              fullWidth
              label="טלפון"
              value={formData.designerPhone}
              onChange={e => setFormData({ ...formData, designerPhone: e.target.value })}
              placeholder="+972-50-1234567"
            />
            <TextField
              fullWidth
              label="אימייל"
              type="email"
              value={formData.designerEmail}
              onChange={e => setFormData({ ...formData, designerEmail: e.target.value })}
              placeholder="sarah@example.com"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog}>ביטול</Button>
          <Button onClick={handleSave} variant="contained">
            {project?.designerName ? 'עדכן' : 'הוסף'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}
