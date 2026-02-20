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
  Stack,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import ClearIcon from '@mui/icons-material/Clear';
import { updateDoc, doc, getDocFromServer, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadToDrive, deleteFromDrive } from '@/lib/googleDrive';
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
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
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

  const handleDeleteProject = async () => {
    if (deleteConfirmText !== project?.name) {
      setError('שם הפרויקט אינו תואם');
      return;
    }

    try {
      // Delete all related collections
      const collections = ['tasks', 'rooms', 'projectUsers', 'vendors', 'payments', 'pendingInvitations'];
      
      for (const collectionName of collections) {
        const q = query(collection(db, collectionName), where('projectId', '==', projectId));
        const snapshot = await getDocs(q);
        await Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)));
      }

      // Delete the project itself
      await deleteDoc(doc(db, 'projects', projectId));

      setSuccessMessage('הפרויקט נמחק בהצלחה');
      setTimeout(() => {
        router.push('/projects');
      }, 1500);
    } catch (error) {
      console.error('Error deleting project:', error);
      setError('שגיאה במחיקת הפרויקט');
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
              📋 שינוי מידע על הפרויקט
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 3 }}>
            <Box display="flex" justifyContent="flex-end" mb={3}>
              {permissions.canEditProject && (
                <Button
                  variant="contained"
                  startIcon={<EditIcon />}
                  onClick={() => {
                    setOpenProjectDialog(true);
                    setError('');
                  }}
                >
                  ערוך פרטי פרויקט
                </Button>
              )}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3 }}>
              <Box sx={{ p: 2, backgroundColor: '#f9fafb', border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="h6" color="text.secondary" fontWeight="bold">
                  שם הפרויקט
                </Typography>
                <Typography variant="body1" fontWeight="bold" mt={0.5}>
                  {project?.name}
                </Typography>
              </Box>
              <Box sx={{ p: 2, backgroundColor: '#f9fafb', border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="h6" color="text.secondary" fontWeight="bold">
                  כתובת
                </Typography>
                <Typography variant="body1" fontWeight="bold" mt={0.5}>
                  {project?.address}
                </Typography>
              </Box>
              <Box sx={{ p: 2, backgroundColor: '#e8f5e9', border: '1px solid #4caf50', borderRadius: 1 }}>
                <Typography variant="h6" color="text.secondary" fontWeight="bold">
                  תקציב מתוכנן
                </Typography>
                <Typography variant="body1" fontWeight="bold" color="success.main" mt={0.5}>
                  ₪{project?.budgetPlanned.toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ p: 2, backgroundColor: '#fff3e0', border: '1px solid #ff9800', borderRadius: 1 }}>
                <Typography variant="h6" color="text.secondary" fontWeight="bold">
                  אחוז חריגה מותר
                </Typography>
                <Typography variant="body1" fontWeight="bold" color="warning.main" mt={0.5}>
                  {project?.budgetAllowedOverflowPercent}%
                </Typography>
              </Box>
              <Box sx={{ p: 2, backgroundColor: '#f9fafb', border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="h6" color="text.secondary" fontWeight="bold">
                  תאריך יצירה
                </Typography>
                <Typography variant="body1" fontWeight="bold" mt={0.5}>
                  {project?.createdAt.toLocaleDateString('he-IL', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Typography>
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Danger Zone: Delete Project */}
        {(role === 'OWNER' || role === 'ADMIN' || project?.ownerId === user?.id) && (
          <Box sx={{ mt: 4, p: 3, border: '2px solid #f44336', borderRadius: 2, backgroundColor: '#ffebee' }}>
            <Typography variant="h6" fontWeight="bold" color="error" gutterBottom>
              ⚠️ אזור סכנה
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              מחיקת הפרויקט היא פעולה בלתי הפיכה. כל המידע הקשור לפרויקט יימחק לצמיתות.
            </Typography>
            <Button
              variant="contained"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => {
                setOpenDeleteDialog(true);
                setDeleteConfirmText('');
                setError('');
              }}
            >
              מחק פרויקט
            </Button>
          </Box>
        )}

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
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenProjectDialog(false)}>
              ביטול
            </Button>
            <Button 
              onClick={handleUpdateProject}
              variant="contained"
            >
              שמור שינויים
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Project Dialog */}
        <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ color: 'error.main' }}>⚠️ מחיקת פרויקט</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <Alert severity="warning" sx={{ mb: 2 }}>
              <strong>אזהרה!</strong> פעולה זו תמחק את הפרויקט לצמיתות וכל המידע הקשור אליו:
              <ul>
                <li>חדרים</li>
                <li>משימות</li>
                <li>ספקים</li>
                <li>תשלומים</li>
                <li>חברי צוות</li>
              </ul>
            </Alert>
            
            <Typography variant="body2" gutterBottom>
              כדי לאשר, הקלד את שם הפרויקט: <strong>{project?.name}</strong>
            </Typography>
            
            <TextField
              fullWidth
              label="שם הפרויקט"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              margin="normal"
              placeholder={project?.name}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDeleteDialog(false)}>ביטול</Button>
            <Button 
              onClick={handleDeleteProject} 
              variant="contained"
              color="error"
              disabled={deleteConfirmText !== project?.name}
            >
              מחק פרויקט לצמיתות
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}
