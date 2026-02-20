'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  IconButton,
  CircularProgress,
  Alert,
  Stack,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectRole } from '@/hooks/useProjectRole';
import AccessDenied from '@/components/AccessDenied';
import { doc, collection, query, where, getDocsFromServer, setDoc, deleteDoc, updateDoc, getDocFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ProjectOwner, Project } from '@/types';

export default function OwnersPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { firebaseUser } = useAuth();
  const router = useRouter();
  const { role, permissions, loading: roleLoading } = useProjectRole(projectId, firebaseUser?.uid || null);

  const [project, setProject] = useState<ProjectOwner | null>(null);
  const [owners, setOwners] = useState<ProjectOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'PRIMARY_OWNER' as 'PRIMARY_OWNER' | 'CO_OWNER' | 'OTHER_CONTACT',
    notes: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      
      // Fetch owners
      const ownersQuery = query(collection(db, 'projectOwners'), where('projectId', '==', projectId));
      const ownersSnapshot = await getDocsFromServer(ownersQuery);
      const ownersData = ownersSnapshot.docs.map(doc => ({
        id: doc.id,
        projectId,
        ...doc.data(),
      } as ProjectOwner));
      setOwners(ownersData);
    } catch (err) {
      console.error('Error fetching owners:', err);
      setError('שגיאה בטעינת נתונים. אנא נסה שוב במאוחר.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!roleLoading && !permissions?.canEditProject) {
      return;
    }
    fetchData();
  }, [roleLoading, permissions, fetchData]);

  const handleOpenDialog = (owner?: ProjectOwner) => {
    if (owner) {
      setEditingId(owner.id);
      setFormData({
        name: owner.name,
        phone: owner.phone,
        email: owner.email,
        role: owner.role,
        notes: owner.notes || '',
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', phone: '', email: '', role: 'PRIMARY_OWNER', notes: '' });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    try {
      setError(null);
      
      if (!formData.name.trim() || !formData.phone.trim() || !formData.email.trim()) {
        setError('אנא מלא את כל השדות הנדרשים');
        return;
      }

      if (editingId) {
        // Update existing
        await updateDoc(doc(db, 'projectOwners', editingId), {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          role: formData.role,
          notes: formData.notes,
          updatedAt: new Date(),
        });
      } else {
        // Create new
        const newOwnerId = `${projectId}_owner_${Date.now()}`;
        await setDoc(doc(db, 'projectOwners', newOwnerId), {
          projectId,
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          role: formData.role,
          notes: formData.notes,
          createdAt: new Date(),
        });
      }

      handleCloseDialog();
      await fetchData();
    } catch (err) {
      console.error('Error saving owner:', err);
      setError('שגיאה בשמירה. אנא נסה שוב במאוחר.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('האם אתה בטוח שברצונך למחוק?')) {
      try {
        setError(null);
        await deleteDoc(doc(db, 'projectOwners', id));
        await fetchData();
      } catch (err) {
        console.error('Error deleting owner:', err);
        setError('שגיאה במחיקה. אנא נסה שוב במאוחר.');
      }
    }
  };

  if (roleLoading || loading) {
    return (
      <DashboardLayout projectId={projectId} project={undefined}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  if (!permissions?.canEditProject) {
    return (
      <DashboardLayout projectId={projectId} project={undefined}>
        <AccessDenied message="אין לך הרשאה לערוך הגדרות פרויקט" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout projectId={projectId} project={undefined} scrollable={true}>
      <Box sx={{ px: { xs: 2, md: 4 }, py: 4, backgroundColor: '#f4f7fe', minHeight: '100vh' }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Typography variant="h4" fontWeight="800" gutterBottom sx={{ mb: 4 }}>
            👥 בעלי הבית / אנשי קשר
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

          <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', mb: 4 }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight="800">
                  {owners.length} בעלים / אנשי קשר
                </Typography>
                <Button variant="contained" onClick={() => handleOpenDialog()}>
                  ➕ הוסף בעלים
                </Button>
              </Box>

              {owners.length === 0 ? (
                <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                  אין בעלים/אנשי קשר. הוסף עכשיו כדי לשתף סיכומי פגישות.
                </Typography>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>שם</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>טלפון</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>אימייל</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>תפקיד</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>פעולות</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {owners.map(owner => (
                        <TableRow key={owner.id}>
                          <TableCell sx={{ fontWeight: 'bold' }}>{owner.name}</TableCell>
                          <TableCell>{owner.phone}</TableCell>
                          <TableCell>{owner.email}</TableCell>
                          <TableCell>
                            {owner.role === 'PRIMARY_OWNER' && '🏠 בעלים ראשיים'}
                            {owner.role === 'CO_OWNER' && '👥 בעלים שותף'}
                            {owner.role === 'OTHER_CONTACT' && '📞 איש קשר אחר'}
                          </TableCell>
                          <TableCell>
                            <IconButton size="small" onClick={() => handleOpenDialog(owner)}>
                              <EditIcon />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDelete(owner.id)}>
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Dialog for Add/Edit */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
          {editingId ? '✏️ עדכון בעלים' : '➕ הוסף בעלים'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="שם"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="דיאגו סוכרצוק"
            />
            <TextField
              fullWidth
              label="טלפון"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+972-50-1234567"
            />
            <TextField
              fullWidth
              label="אימייל"
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="diego@example.com"
            />
            <Select
              fullWidth
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value as any })}
              label="תפקיד"
            >
              <MenuItem value="PRIMARY_OWNER">🏠 בעלים ראשיים</MenuItem>
              <MenuItem value="CO_OWNER">👥 בעלים שותף</MenuItem>
              <MenuItem value="OTHER_CONTACT">📞 איש קשר אחר</MenuItem>
            </Select>
            <TextField
              fullWidth
              label="הערות (optional)"
              multiline
              rows={3}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog}>ביטול</Button>
          <Button onClick={handleSave} variant="contained">
            {editingId ? 'עדכן' : 'הוסף'}
          </Button>
        </DialogActions>
      </Dialog>
    </DashboardLayout>
  );
}
