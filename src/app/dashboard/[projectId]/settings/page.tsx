'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
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
  TextField,
  MenuItem,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  getDocsFromServer,
  getDocFromServer
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectRole } from '@/hooks/useProjectRole';
import AccessDenied from '@/components/AccessDenied';
import type { Project, ProjectRole } from '@/types';

interface ProjectMember {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  roleInProject: ProjectRole;
}

const roleLabels: Record<ProjectRole, string> = {
  OWNER: 'בעלים',
  ADMIN: 'מנהל',
  FAMILY: 'בן משפחה',
  CONTRACTOR: 'קבלן',
  DESIGNER: 'מעצב',
  VIEW_ONLY: 'צפייה בלבד',
};

const roleDescriptions: Record<ProjectRole, string> = {
  OWNER: 'שליטה מלאה - כל ההרשאות כולל מחיקת הפרויקט',
  ADMIN: 'ניהול מלא - כל ההרשאות כולל ניהול משתמשים',
  FAMILY: 'צפייה בכל המידע, עריכת משימות וחדרים ללא גישה לתשלומים',
  CONTRACTOR: 'צפייה ועדכון משימות בלבד, ללא גישה לנתונים פיננסיים',
  DESIGNER: 'צפייה ועדכון משימות בלבד, ללא גישה לנתונים פיננסיים',
  VIEW_ONLY: 'צפייה בלבד ללא אפשרות עריכה או גישה לנתונים פיננסיים',
};

const roleColors: Record<ProjectRole, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'> = {
  OWNER: 'error',
  ADMIN: 'primary',
  FAMILY: 'success',
  CONTRACTOR: 'warning',
  DESIGNER: 'secondary',
  VIEW_ONLY: 'default',
};

export default function SettingsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { user, firebaseUser } = useAuth();
  const router = useRouter();
  const { role, permissions, loading: roleLoading } = useProjectRole(projectId, firebaseUser?.uid || null);
  
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openProjectDialog, setOpenProjectDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<ProjectMember | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('VIEW_ONLY');
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

      // Load project members
      const membersQuery = query(
        collection(db, 'projectUsers'),
        where('projectId', '==', projectId)
      );
      const membersSnapshot = await getDocsFromServer(membersQuery);
      
      const membersData: ProjectMember[] = [];
      
      // Add project owner first
      if (projectDoc.exists()) {
        const ownerId = projectDoc.data().ownerId;
        const ownerDoc = await getDocFromServer(doc(db, 'users', ownerId));
        if (ownerDoc.exists()) {
          const ownerData = ownerDoc.data();
          membersData.push({
            id: 'owner', // Special ID for owner
            userId: ownerId,
            userName: ownerData.name || 'לא ידוע',
            userEmail: ownerData.email || '',
            roleInProject: 'OWNER',
          });
        }
      }
      
      // Add other members
      for (const memberDoc of membersSnapshot.docs) {
        const memberData = memberDoc.data();
        // Skip if this is the owner (already added)
        if (projectDoc.exists() && memberData.userId === projectDoc.data().ownerId) {
          continue;
        }
        
        // Fetch user details
        const userDoc = await getDocFromServer(doc(db, 'users', memberData.userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          membersData.push({
            id: memberDoc.id,
            userId: memberData.userId,
            userName: userData.name || 'לא ידוע',
            userEmail: userData.email || '',
            roleInProject: memberData.roleInProject as ProjectRole,
          });
        }
      }

      setMembers(membersData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    setError('');
    
    if (!userEmail) {
      setError('יש להזין כתובת אימייל');
      return;
    }

    try {
      // Find user by email
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', userEmail.toLowerCase())
      );
      const usersSnapshot = await getDocsFromServer(usersQuery);

      if (usersSnapshot.empty) {
        setError('משתמש עם אימייל זה לא נמצא במערכת');
        return;
      }

      const userDoc = usersSnapshot.docs[0];
      const userId = userDoc.id;

      // Check if user is already a member
      const existingMember = members.find(m => m.userId === userId);
      if (existingMember) {
        setError('משתמש זה כבר חבר בפרויקט');
        return;
      }

      // Add to projectUsers collection
      await addDoc(collection(db, 'projectUsers'), {
        projectId,
        userId,
        roleInProject: selectedRole,
        addedAt: new Date(),
      });

      setOpenAddDialog(false);
      setUserEmail('');
      setSelectedRole('VIEW_ONLY');
      fetchData();
    } catch (error) {
      console.error('Error adding member:', error);
      setError('שגיאה בהוספת המשתמש');
    }
  };

  const handleEditMember = async () => {
    if (!editingMember) return;

    try {
      await updateDoc(doc(db, 'projectUsers', editingMember.id), {
        roleInProject: selectedRole,
      });

      setOpenEditDialog(false);
      setEditingMember(null);
      fetchData();
    } catch (error) {
      console.error('Error updating member:', error);
      setError('שגיאה בעדכון התפקיד');
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

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('האם אתה בטוח שברצונך להסיר משתמש זה מהפרויקט?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'projectUsers', memberId));
      fetchData();
    } catch (error) {
      console.error('Error deleting member:', error);
      alert('שגיאה בהסרת המשתמש');
    }
  };

  const openEditMemberDialog = (member: ProjectMember) => {
    setEditingMember(member);
    setSelectedRole(member.roleInProject);
    setOpenEditDialog(true);
    setError('');
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

  // Only OWNER and ADMIN can manage users
  if (!role || !permissions || !permissions.canManageUsers) {
    return (
      <DashboardLayout projectId={projectId} project={project || undefined}>
        <AccessDenied message="אין לך הרשאה לנהל את הגדרות הפרויקט" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout projectId={projectId} project={project || undefined}>
      <Box sx={{ px: 3, py: 4 }}>
        {/* Header */}
        <Box mb={4}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            הגדרות פרויקט
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ניהול כל היבטי הפרויקט
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
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  שם הפרויקט
                </Typography>
                <Typography variant="h6" fontWeight="medium" mt={0.5}>
                  {project?.name}
                </Typography>
              </Box>
              <Box sx={{ p: 2, backgroundColor: '#f9fafb', border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  כתובת
                </Typography>
                <Typography variant="body1" mt={0.5}>
                  {project?.address}
                </Typography>
              </Box>
              <Box sx={{ p: 2, backgroundColor: '#e8f5e9', border: '1px solid #4caf50', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  תקציב מתוכנן
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="success.main" mt={0.5}>
                  ₪{project?.budgetPlanned.toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ p: 2, backgroundColor: '#fff3e0', border: '1px solid #ff9800', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  אחוז חריגה מותר
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="warning.main" mt={0.5}>
                  {project?.budgetAllowedOverflowPercent}%
                </Typography>
              </Box>
              <Box sx={{ p: 2, backgroundColor: '#f9fafb', border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary" fontWeight="bold">
                  תאריך יצירה
                </Typography>
                <Typography variant="body1" mt={0.5}>
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

        {/* Main Section: Permissions */}
        <Accordion defaultExpanded sx={{ mt: 2 }}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{ backgroundColor: '#f5f5f5' }}
          >
            <Typography variant="h5" fontWeight="bold">
              👥 הרשאות
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            {/* Sub-section: Users Management */}
            <Accordion defaultExpanded elevation={0}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e0e0e0' }}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="h6" fontWeight="bold">
                    ניהול משתמשים
                  </Typography>
                  <Chip label={`${members.length} משתמשים`} size="small" color="primary" />
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 3 }}>
                <Box display="flex" justifyContent="flex-end" mb={2}>
                  <Button
                    variant="contained"
                    startIcon={<PersonAddIcon />}
                    onClick={() => {
                      setOpenAddDialog(true);
                      setError('');
                    }}
                  >
                    הוסף משתמש
                  </Button>
                </Box>

                {/* Members Table */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>שם</TableCell>
                    <TableCell>אימייל</TableCell>
                    <TableCell>תפקיד</TableCell>
                    <TableCell>הרשאות</TableCell>
                    <TableCell align="left">פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography color="text.secondary">
                          אין משתמשים נוספים בפרויקט
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <Typography fontWeight="medium">{member.userName}</Typography>
                        </TableCell>
                        <TableCell>{member.userEmail}</TableCell>
                        <TableCell>
                          <Chip 
                            label={roleLabels[member.roleInProject]} 
                            color={roleColors[member.roleInProject]}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {roleDescriptions[member.roleInProject]}
                          </Typography>
                        </TableCell>
                        <TableCell align="left">
                          <IconButton
                            size="small"
                            onClick={() => openEditMemberDialog(member)}
                            disabled={member.roleInProject === 'OWNER'}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteMember(member.id)}
                            disabled={member.roleInProject === 'OWNER'}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Permissions Legend */}
            <Box sx={{ mt: 4, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                📋 מדריך הרשאות מפורט
              </Typography>
              <Box sx={{ display: 'grid', gap: 1, mt: 2 }}>
                {Object.entries(roleLabels).map(([key, label]) => (
                  <Box key={key} display="flex" alignItems="center" gap={1}>
                    <Chip 
                      label={label} 
                      color={roleColors[key as ProjectRole]}
                      size="small"
                      sx={{ minWidth: 100 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {roleDescriptions[key as ProjectRole]}
                    </Typography>
                  </Box>
                ))}
              </Box>
              
              {/* Detailed Permissions Table */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  טבלת הרשאות מפורטת
                </Typography>
                <TableContainer sx={{ mt: 2, backgroundColor: 'white', borderRadius: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>הרשאה</strong></TableCell>
                        <TableCell align="center"><Chip label="בעלים" color="error" size="small" /></TableCell>
                        <TableCell align="center"><Chip label="מנהל" color="primary" size="small" /></TableCell>
                        <TableCell align="center"><Chip label="משפחה" color="success" size="small" /></TableCell>
                        <TableCell align="center"><Chip label="קבלן" color="warning" size="small" /></TableCell>
                        <TableCell align="center"><Chip label="מעצב" color="secondary" size="small" /></TableCell>
                        <TableCell align="center"><Chip label="צפייה" color="default" size="small" /></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>צפייה בתקציב</TableCell>
                        <TableCell align="center">✅</TableCell>
                        <TableCell align="center">✅</TableCell>
                        <TableCell align="center">✅</TableCell>
                        <TableCell align="center">❌</TableCell>
                        <TableCell align="center">❌</TableCell>
                        <TableCell align="center">❌</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>עריכת תקציב</TableCell>
                        <TableCell align="center">✅</TableCell>
                        <TableCell align="center">✅</TableCell>
                        <TableCell align="center">❌</TableCell>
                        <TableCell align="center">❌</TableCell>
                        <TableCell align="center">❌</TableCell>
                        <TableCell align="center">❌</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>צפייה בתשלומים</TableCell>
                        <TableCell align="center">✅</TableCell>
                        <TableCell align="center">✅</TableCell>
                        <TableCell align="center">✅</TableCell>
                        <TableCell align="center">❌</TableCell>
                        <TableCell align="center">❌</TableCell>
                        <TableCell align="center">❌</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>עריכת תשלומים</TableCell>
                        <TableCell align="center">✅</TableCell>
                        <TableCell align="center">✅</TableCell>
                        <TableCell align="center">❌</TableCell>
                        <TableCell align="center">❌</TableCell>
                        <TableCell align="center">❌</TableCell>
                        <TableCell align="center">❌</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>ניהול משתמשים</TableCell>
                        <TableCell align="center">✅</TableCell>
                        <TableCell align="center">✅</TableCell>
                        <TableCell align="center">❌</TableCell>
                        <TableCell align="center">❌</TableCell>
                        <TableCell align="center">❌</TableCell>
                        <TableCell align="center">❌</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>עריכת פרויקט</TableCell>
                        <TableCell align="center">✅</TableCell>
                        <TableCell align="center">✅</TableCell>
                        <TableCell align="center">❌</TableCell>
                        <TableCell align="center">❌</TableCell>
                        <TableCell align="center">❌</TableCell>
                        <TableCell align="center">❌</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>עריכת משימות</TableCell>
                        <TableCell align="center">✅</TableCell>
                        <TableCell align="center">✅</TableCell>
                        <TableCell align="center">✅</TableCell>
                        <TableCell align="center">✅</TableCell>
                        <TableCell align="center">✅</TableCell>
                        <TableCell align="center">❌</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>עריכת חדרים</TableCell>
                        <TableCell align="center">✅</TableCell>
                        <TableCell align="center">✅</TableCell>
                        <TableCell align="center">✅</TableCell>
                        <TableCell align="center">❌</TableCell>
                        <TableCell align="center">❌</TableCell>
                        <TableCell align="center">❌</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion elevation={0}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{ backgroundColor: '#fafafa', borderBottom: '1px solid #e0e0e0' }}
            >
              <Typography variant="h6" fontWeight="bold">
                📋 מדריך הרשאות
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 3 }}>
              <Box sx={{ display: 'grid', gap: 2 }}>
                {Object.entries(roleLabels).map(([key, label]) => (
                  <Box key={key} sx={{ p: 2, backgroundColor: '#f9fafb', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                      <Box display="flex" alignItems="center" gap={2} mb={1}>
                        <Chip 
                          label={label} 
                          color={roleColors[key as ProjectRole]}
                          size="small"
                          sx={{ minWidth: 100 }}
                        />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {roleDescriptions[key as ProjectRole]}
                      </Typography>
                    </Box>
                  ))}
                </Box>
                
                {/* Detailed Permissions Table */}
                <Box sx={{ mt: 4 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    טבלת הרשאות מפורטת
                  </Typography>
                  <TableContainer sx={{ mt: 2, backgroundColor: 'white', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                          <TableCell><strong>הרשאה</strong></TableCell>
                          <TableCell align="center"><Chip label="בעלים" color="error" size="small" /></TableCell>
                          <TableCell align="center"><Chip label="מנהל" color="primary" size="small" /></TableCell>
                          <TableCell align="center"><Chip label="משפחה" color="success" size="small" /></TableCell>
                          <TableCell align="center"><Chip label="קבלן" color="warning" size="small" /></TableCell>
                          <TableCell align="center"><Chip label="מעצב" color="secondary" size="small" /></TableCell>
                          <TableCell align="center"><Chip label="צפייה" color="default" size="small" /></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell>צפייה בתקציב</TableCell>
                          <TableCell align="center">✅</TableCell>
                          <TableCell align="center">✅</TableCell>
                          <TableCell align="center">✅</TableCell>
                          <TableCell align="center">❌</TableCell>
                          <TableCell align="center">❌</TableCell>
                          <TableCell align="center">❌</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>צפייה בתשלומים</TableCell>
                          <TableCell align="center">✅</TableCell>
                          <TableCell align="center">✅</TableCell>
                          <TableCell align="center">❌</TableCell>
                          <TableCell align="center">❌</TableCell>
                          <TableCell align="center">❌</TableCell>
                          <TableCell align="center">❌</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>עריכת תקציב</TableCell>
                          <TableCell align="center">✅</TableCell>
                          <TableCell align="center">✅</TableCell>
                          <TableCell align="center">✅</TableCell>
                          <TableCell align="center">❌</TableCell>
                          <TableCell align="center">❌</TableCell>
                          <TableCell align="center">❌</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>עריכת תשלומים</TableCell>
                          <TableCell align="center">✅</TableCell>
                          <TableCell align="center">✅</TableCell>
                          <TableCell align="center">❌</TableCell>
                          <TableCell align="center">❌</TableCell>
                          <TableCell align="center">❌</TableCell>
                          <TableCell align="center">❌</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>ניהול משתמשים</TableCell>
                          <TableCell align="center">✅</TableCell>
                          <TableCell align="center">✅</TableCell>
                          <TableCell align="center">❌</TableCell>
                          <TableCell align="center">❌</TableCell>
                          <TableCell align="center">❌</TableCell>
                          <TableCell align="center">❌</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>עריכת פרויקט</TableCell>
                          <TableCell align="center">✅</TableCell>
                          <TableCell align="center">✅</TableCell>
                          <TableCell align="center">❌</TableCell>
                          <TableCell align="center">❌</TableCell>
                          <TableCell align="center">❌</TableCell>
                          <TableCell align="center">❌</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>עריכת משימות</TableCell>
                          <TableCell align="center">✅</TableCell>
                          <TableCell align="center">✅</TableCell>
                          <TableCell align="center">✅</TableCell>
                          <TableCell align="center">✅</TableCell>
                          <TableCell align="center">✅</TableCell>
                          <TableCell align="center">❌</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>עריכת חדרים</TableCell>
                          <TableCell align="center">✅</TableCell>
                          <TableCell align="center">✅</TableCell>
                          <TableCell align="center">✅</TableCell>
                          <TableCell align="center">❌</TableCell>
                          <TableCell align="center">❌</TableCell>
                          <TableCell align="center">❌</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </AccordionDetails>
            </Accordion>
          </AccordionDetails>
        </Accordion>

        {/* Add Member Dialog */}
        <Dialog 
          open={openAddDialog} 
          onClose={() => setOpenAddDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>הוסף משתמש לפרויקט</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <TextField
              fullWidth
              label="אימייל משתמש"
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              sx={{ mt: 2, mb: 2 }}
              helperText="הזן את כתובת האימייל של המשתמש שברצונך להוסיף"
            />
            <TextField
              fullWidth
              select
              label="תפקיד"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
            >
              {Object.entries(roleLabels)
                .filter(([key]) => key !== 'OWNER') // Cannot add another owner
                .map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    <Box display="flex" flexDirection="column" alignItems="flex-start">
                      <Typography>{label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {roleDescriptions[key as ProjectRole]}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddDialog(false)}>ביטול</Button>
            <Button onClick={handleAddMember} variant="contained">
              הוסף
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Member Dialog */}
        <Dialog 
          open={openEditDialog} 
          onClose={() => setOpenEditDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>עריכת תפקיד</DialogTitle>
          <DialogContent>
            {editingMember && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  עריכת תפקיד עבור: <strong>{editingMember.userName}</strong>
                </Typography>
                <TextField
                  fullWidth
                  select
                  label="תפקיד"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
                  sx={{ mt: 2 }}
                >
                  {Object.entries(roleLabels)
                    .filter(([key]) => key !== 'OWNER') // Cannot change to owner
                    .map(([key, label]) => (
                      <MenuItem key={key} value={key}>
                        <Box display="flex" flexDirection="column" alignItems="flex-start">
                          <Typography>{label}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {roleDescriptions[key as ProjectRole]}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                </TextField>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEditDialog(false)}>ביטול</Button>
            <Button onClick={handleEditMember} variant="contained">
              שמור
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Project Dialog */}
        <Dialog 
          open={openProjectDialog} 
          onClose={() => setOpenProjectDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>עריכת פרטי פרויקט</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2, mt: 2 }}>
                {error}
              </Alert>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                fullWidth
                label="שם הפרויקט"
                value={projectForm.name}
                onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                required
                helperText="הזן שם ייחודי לפרויקט"
              />
              <TextField
                fullWidth
                label="כתובת"
                value={projectForm.address}
                onChange={(e) => setProjectForm({ ...projectForm, address: e.target.value })}
                required
                multiline
                rows={2}
                helperText="הזן את הכתובת המלאה של הנכס"
              />
              <TextField
                fullWidth
                label="תקציב מתוכנן (₪)"
                type="number"
                value={projectForm.budgetPlanned}
                onChange={(e) => setProjectForm({ ...projectForm, budgetPlanned: Number(e.target.value) })}
                required
                inputProps={{ min: 0, step: 1000 }}
                helperText="הזן את התקציב המתוכנן לפרויקט בשקלים"
              />
              <TextField
                fullWidth
                label="אחוז חריגה מותר (%)"
                type="number"
                value={projectForm.budgetAllowedOverflowPercent}
                onChange={(e) => setProjectForm({ ...projectForm, budgetAllowedOverflowPercent: Number(e.target.value) })}
                required
                inputProps={{ min: 0, max: 100, step: 1 }}
                helperText="אחוז החריגה המותר מהתקציב המתוכנן (0-100)"
              />
            </Box>
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
