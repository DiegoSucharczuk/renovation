'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
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
  Tooltip,
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
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
import { formatDateMedium } from '@/lib/dateUtils';

interface ProjectMember {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  roleInProject: ProjectRole;
}

interface PendingInvitation {
  id: string;
  email: string;
  roleInProject: ProjectRole;
  token: string;
  invitedByName: string;
  createdAt: Date;
}

const roleLabels: Record<ProjectRole, string> = {
  OWNER: 'בעלים',
  ADMIN: 'מנהל',
  FAMILY: 'בן משפחה',
  CONTRACTOR: 'קבלן',
  DESIGNER: 'מעצב',
  VIEW_ONLY: 'צפייה בלבד',
};

const roleColors: Record<ProjectRole, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'> = {
  OWNER: 'error',
  ADMIN: 'primary',
  FAMILY: 'success',
  CONTRACTOR: 'warning',
  DESIGNER: 'secondary',
  VIEW_ONLY: 'default',
};

export default function UsersManagementPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { user, firebaseUser } = useAuth();
  const router = useRouter();
  const { role, permissions, loading: roleLoading } = useProjectRole(projectId, firebaseUser?.uid || null);
  
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<ProjectMember | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('VIEW_ONLY');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [invitationLink, setInvitationLink] = useState('');
  const [showInvitationDialog, setShowInvitationDialog] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchData();
  }, [user, projectId, router]);

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
      const projectUsersQuery = query(
        collection(db, 'projectUsers'),
        where('projectId', '==', projectId)
      );
      const projectUsersSnapshot = await getDocsFromServer(projectUsersQuery);

      const membersData: ProjectMember[] = [];

      // Add owner as first member if exists
      if (projectDoc.exists()) {
        const ownerDoc = await getDocFromServer(doc(db, 'users', projectDoc.data().ownerId));
        if (ownerDoc.exists()) {
          const ownerData = ownerDoc.data();
          membersData.push({
            id: 'owner-' + projectDoc.data().ownerId,
            userId: projectDoc.data().ownerId,
            userName: ownerData.name || 'לא ידוע',
            userEmail: ownerData.email || '',
            roleInProject: 'OWNER' as ProjectRole,
          });
        }
      }

      // Add other members
      for (const memberDoc of projectUsersSnapshot.docs) {
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
      
      // טען הזמנות ממתינות
      await fetchPendingInvitations();
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingInvitations = async () => {
    try {
      const invitationsQuery = query(
        collection(db, 'pendingInvitations'),
        where('projectId', '==', projectId)
      );
      const invitationsSnapshot = await getDocsFromServer(invitationsQuery);
      const invitationsData = invitationsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email,
          roleInProject: data.roleInProject,
          token: data.token,
          invitedByName: data.invitedByName,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        } as PendingInvitation;
      });
      setPendingInvitations(invitationsData);
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
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
        // משתמש לא קיים - נצור הזמנה
        const invitationToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
        
        await addDoc(collection(db, 'pendingInvitations'), {
          email: userEmail.toLowerCase(),
          projectId,
          projectName: project?.name || '',
          roleInProject: selectedRole,
          invitedBy: user?.id,
          invitedByName: user?.name || '',
          token: invitationToken,
          createdAt: new Date(),
        });

        // יצירת לינק הזמנה
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/register?invitation=${invitationToken}`;
        setInvitationLink(link);
        setShowInvitationDialog(true);
        setOpenAddDialog(false);
        setUserEmail('');
        setSelectedRole('VIEW_ONLY');
        
        // רענן את רשימת ההזמנות
        await fetchPendingInvitations();
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

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('האם אתה בטוח שברצונך להסיר משתמש זה מהפרויקט?')) {
      return;
    }

    try {
      const memberToDelete = members.find(m => m.id === memberId);
      if (!memberToDelete) return;

      const userId = memberToDelete.userId;

      // מחק מהפרויקט הנוכחי
      await deleteDoc(doc(db, 'projectUsers', memberId));

      // בדוק אם המשתמש שייך לפרויקטים אחרים
      const userProjectsQuery = query(
        collection(db, 'projectUsers'),
        where('userId', '==', userId)
      );
      const userProjectsSnapshot = await getDocsFromServer(userProjectsQuery);

      // בדוק אם המשתמש הוא בעלים של פרויקטים
      const ownerProjectsQuery = query(
        collection(db, 'projects'),
        where('ownerId', '==', userId)
      );
      const ownerProjectsSnapshot = await getDocsFromServer(ownerProjectsQuery);

      // אם המשתמש לא שייך לשום פרויקט אחר - מחק אותו לגמרי
      if (userProjectsSnapshot.empty && ownerProjectsSnapshot.empty) {
        await deleteDoc(doc(db, 'users', userId));
        setSuccessMessage('המשתמש הוסר לגמרי מהמערכת');
      } else {
        setSuccessMessage('המשתמש הוסר מהפרויקט');
      }

      setTimeout(() => setSuccessMessage(''), 3000);
      fetchData();
    } catch (error) {
      console.error('Error deleting member:', error);
      setError('שגיאה בהסרת המשתמש');
    }
  };

  const handleCopyInvitationLink = (token: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/register?invitation=${token}`;
    navigator.clipboard.writeText(link);
    setSuccessMessage('הקישור הועתק ללוח');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק הזמנה זו?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'pendingInvitations', invitationId));
      await fetchPendingInvitations();
      setSuccessMessage('ההזמנה נמחקה בהצלחה');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting invitation:', error);
      setError('שגיאה במחיקת ההזמנה');
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

  if (!role || !permissions || !permissions.canManageUsers) {
    return (
      <DashboardLayout projectId={projectId} project={project || undefined}>
        <AccessDenied message="אין לך הרשאה לנהל משתמשים" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout projectId={projectId} project={project || undefined}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            👥 ניהול משתמשים
          </Typography>
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

        {successMessage && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Members Table */}
        <TableContainer sx={{ mb: 4 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>שם</TableCell>
                <TableCell>אימייל</TableCell>
                <TableCell>תפקיד</TableCell>
                <TableCell align="left">פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
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

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              ⏳ הזמנות ממתינות
              <Chip label={pendingInvitations.length} size="small" color="warning" />
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>אימייל</TableCell>
                    <TableCell>תפקיד</TableCell>
                    <TableCell>הוזמן על ידי</TableCell>
                    <TableCell>תאריך</TableCell>
                    <TableCell align="left">פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingInvitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <Typography>{invitation.email}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={roleLabels[invitation.roleInProject]} 
                          color={roleColors[invitation.roleInProject]}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{invitation.invitedByName}</TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {formatDateMedium(invitation.createdAt)}
                        </Typography>
                      </TableCell>
                      <TableCell align="left">
                        <Tooltip title="העתק קישור הזמנה">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleCopyInvitationLink(invitation.token)}
                          >
                            <ContentCopyIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="מחק הזמנה">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteInvitation(invitation.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Add Member Dialog */}
        <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>הוסף משתמש לפרויקט</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <TextField
              fullWidth
              label="כתובת אימייל"
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              margin="normal"
            />
            <TextField
              fullWidth
              select
              label="תפקיד בפרויקט"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
              margin="normal"
              helperText="בחר את רמת ההרשאות המתאימה למשתמש"
            >
              <MenuItem value="VIEW_ONLY">צפייה בלבד</MenuItem>
              <MenuItem value="DESIGNER">מעצב</MenuItem>
              <MenuItem value="CONTRACTOR">קבלן</MenuItem>
              <MenuItem value="FAMILY">בן משפחה</MenuItem>
              <MenuItem value="ADMIN">מנהל</MenuItem>
            </TextField>

            <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                הסברים על תפקידים:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2">
                  <strong>👨‍💼 מנהל:</strong> גישה מלאה לכל הפרויקט, כולל ניהול משתמשים, תקציבים ותשלומים
                </Typography>
                <Typography variant="body2">
                  <strong>👨‍👩‍👧‍👦 בן משפחה:</strong> גישה מלאה לצפייה ועריכה, כולל תקציבים ותשלומים
                </Typography>
                <Typography variant="body2">
                  <strong>👷 קבלן:</strong> גישה לצפייה ועדכון משימות בלבד, ללא גישה לתקציבים ותשלומים
                </Typography>
                <Typography variant="body2">
                  <strong>🎨 מעצב:</strong> גישה לצפייה ועדכון משימות בלבד, ללא גישה לתקציבים ותשלומים
                </Typography>
                <Typography variant="body2">
                  <strong>👁️ צפייה בלבד:</strong> גישה לצפייה בלבד בכל הפרויקט, ללא אפשרות לערוך
                </Typography>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddDialog(false)}>ביטול</Button>
            <Button onClick={handleAddMember} variant="contained">
              הוסף
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Member Dialog */}
        <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>עריכת תפקיד משתמש</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              select
              label="תפקיד בפרויקט"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
              margin="normal"
            >
              <MenuItem value="VIEW_ONLY">צפייה בלבד</MenuItem>
              <MenuItem value="DESIGNER">מעצב</MenuItem>
              <MenuItem value="CONTRACTOR">קבלן</MenuItem>
              <MenuItem value="FAMILY">בן משפחה</MenuItem>
              <MenuItem value="ADMIN">מנהל</MenuItem>
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEditDialog(false)}>ביטול</Button>
            <Button onClick={handleEditMember} variant="contained">
              שמור
            </Button>
          </DialogActions>
        </Dialog>

        {/* Invitation Link Dialog */}
        <Dialog 
          open={showInvitationDialog} 
          onClose={() => setShowInvitationDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>הזמנה נשלחה בהצלחה! 🎉</DialogTitle>
          <DialogContent>
            <Alert severity="success" sx={{ mb: 2 }}>
              משתמש זה עדיין לא רשום במערכת. נוצרה הזמנה עבורו.
            </Alert>
            <Typography variant="body2" gutterBottom sx={{ mb: 2 }}>
              העתק את הלינק הבא ושלח למשתמש. כשיירשם באמצעות הלינק, הוא יתווסף אוטומטית לפרויקט עם התפקיד שנבחר.
            </Typography>
            <TextField
              fullWidth
              value={invitationLink}
              multiline
              rows={3}
              InputProps={{
                readOnly: true,
              }}
              sx={{ mb: 2, fontFamily: 'monospace' }}
            />
            <Button
              fullWidth
              variant="contained"
              onClick={() => {
                navigator.clipboard.writeText(invitationLink);
                setSuccessMessage('הלינק הועתק ללוח!');
                setTimeout(() => setSuccessMessage(''), 3000);
              }}
            >
              📋 העתק לינק
            </Button>
            {successMessage && (
              <Alert severity="success" sx={{ mt: 2 }}>
                {successMessage}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowInvitationDialog(false)}>סגור</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}
