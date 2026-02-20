'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  MenuItem,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import type { Project, Meeting } from '@/types';


const MEETING_TYPES = [
  { value: 'SITE_VISIT', label: 'ביקור באתר' },
  { value: 'PLANNING', label: 'תכנון' },
  { value: 'REVIEW', label: 'בדיקה' },
  { value: 'DECISION', label: 'החלטה' },
  { value: 'OTHER', label: 'אחר' },
];

export default function MeetingsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { firebaseUser } = useAuth();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    meetingDate: '',
    dueDate: '',
    meetingType: 'SITE_VISIT' as any,
    completed: false,
    decisions: [''],
    actionItems: [{ id: '', description: '', dueDate: '', assigneeVendorId: '', status: 'PENDING' as any }],
  });

  useEffect(() => {
    if (!firebaseUser) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        // Load project
        const projectDoc = await getDocs(query(collection(db, 'projects'), where('__name__', '==', projectId)));
        if (!projectDoc.empty) {
          setProject({
            id: projectDoc.docs[0].id,
            ...projectDoc.docs[0].data(),
          } as Project);
        }

        // Load meetings
        const meetingsQuery = query(collection(db, 'meetings'), where('projectId', '==', projectId));
        const meetingsSnapshot = await getDocs(meetingsQuery);
        const meetingsData = meetingsSnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Loaded meeting data from Firestore:', data);
          return {
            id: doc.id,
            ...data,
            meetingDate: data.meetingDate?.toDate ? data.meetingDate.toDate() : new Date(data.meetingDate),
            dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : (data.dueDate ? new Date(data.dueDate) : null),
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
            actionItems: (data.actionItems || []).map((item: any) => {
              console.log('Loaded actionItem from Firestore:', item);
              return {
                ...item,
                dueDate: item.dueDate?.toDate ? item.dueDate.toDate() : (item.dueDate ? new Date(item.dueDate) : new Date()),
              };
            }),
          } as Meeting;
        }).sort((a, b) => a.meetingDate.getTime() - b.meetingDate.getTime());
        
        setMeetings(meetingsData);
      } catch (error) {
        console.error('Error fetching meetings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [firebaseUser, router, projectId]);

  const handleOpenDialog = (meeting?: Meeting) => {
    if (meeting) {
      console.log('Opening meeting for edit, actionItems from meeting:', meeting.actionItems);
      setEditingMeeting(meeting);
      setFormData({
        title: meeting.title,
        description: meeting.description,
        meetingDate: meeting.meetingDate.toISOString().split('T')[0],
        dueDate: meeting.dueDate ? (meeting.dueDate instanceof Date ? meeting.dueDate : new Date(meeting.dueDate)).toISOString().split('T')[0] : '',
        meetingType: String(meeting.meetingType) as any,
        completed: meeting.completed || false,
        decisions: meeting.decisions.length > 0 ? meeting.decisions : [''],
        actionItems: meeting.actionItems.length > 0 ? meeting.actionItems.map(a => ({
          id: a.id,
          description: a.description,
          dueDate: (a.dueDate instanceof Date ? a.dueDate : new Date(a.dueDate)).toISOString().split('T')[0],
          assigneeVendorId: a.assigneeVendorId || '',
          status: a.status || 'PENDING',
        })) : [{ id: '', description: '', dueDate: '', assigneeVendorId: '', status: 'PENDING' }],
      });
    } else {
      setEditingMeeting(null);
      setFormData({
        title: '',
        description: '',
        meetingDate: '',
        dueDate: '',
        meetingType: 'SITE_VISIT',
        completed: false,
        decisions: [''],
        actionItems: [{ id: '', description: '', dueDate: '', assigneeVendorId: '', status: 'PENDING' }],
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingMeeting(null);
  };

  const handleSaveMeeting = async () => {
    try {
      if (!formData.title.trim()) {
        alert('אנא הזן כותרת');
        return;
      }

      console.log('Saving meeting with actionItems:', formData.actionItems);

      const meetingData = {
        projectId,
        title: formData.title,
        description: formData.description,
        meetingDate: new Date(formData.meetingDate),
        dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
        meetingType: formData.meetingType,
        completed: formData.completed,
        decisions: formData.decisions.filter(d => d.trim()),
        actionItems: formData.actionItems.map(a => ({
          id: a.id || `action_${Date.now()}_${Math.random()}`,
          description: a.description,
          assigneeVendorId: a.assigneeVendorId || '',
          dueDate: new Date(a.dueDate),
          status: a.status || 'PENDING',
        })),
        updatedAt: new Date(),
      };

      console.log('Meeting data to save with actionItems:', meetingData.actionItems);

      if (editingMeeting) {
        // Update
        console.log('Updating meeting:', editingMeeting.id, 'with data:', meetingData);
        await updateDoc(doc(db, 'meetings', editingMeeting.id), meetingData);
        setMeetings(meetings.map(m => 
          m.id === editingMeeting.id 
            ? { ...m, ...meetingData }
            : m
        ));
      } else {
        // Add new
        const newMeeting = {
          ...meetingData,
          createdAt: new Date(),
        };
        const docRef = await addDoc(collection(db, 'meetings'), newMeeting);
        setMeetings([...meetings, { id: docRef.id, ...newMeeting } as Meeting]);
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving meeting:', error);
      alert('שגיאה בשמירת הפגישה');
    }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק פגישה זו?')) return;
    
    try {
      await deleteDoc(doc(db, 'meetings', meetingId));
      setMeetings(meetings.filter(m => m.id !== meetingId));
    } catch (error) {
      console.error('Error deleting meeting:', error);
      alert('שגיאה במחיקת הפגישה');
    }
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return '-';
    if (!(date instanceof Date)) date = new Date(date);
    return date.toLocaleDateString('he-IL');
  };

  const getMeetingStatus = (meeting: Meeting) => {
    const totalItems = meeting.actionItems?.length || 0;
    const completedItems = meeting.actionItems?.filter(item => item.status === 'COMPLETED').length || 0;
    
    // אם הפגישה עצמה סומנה כ"בוצע"
    if (meeting.completed) {
      // אם יש עדיין משימות שלא בוצעו → כתום (PARTIAL - בעיה!)
      if (completedItems < totalItems) return 'PARTIAL';
      // כל המשימות בוצעו → ירוק (COMPLETED)
      return 'COMPLETED';
    }
    
    // אם כמה משימות בוצעו אבל הפגישה לא סומנה → צהוב (IN_PROGRESS)
    if (completedItems > 0) return 'IN_PROGRESS';
    
    // כלום לא בוצע → לא מתחיל
    return 'NOT_STARTED';
  };

  const getStatusColor = (status: string) => {
    if (status === 'COMPLETED') return '#c8e6c9'; // Green
    if (status === 'PARTIAL') return '#ffe0b2'; // Orange
    if (status === 'IN_PROGRESS') return '#fff9c4'; // Yellow
    return 'transparent'; // No color for NOT_STARTED
  };

  const getSortedMeetings = () => {
    const sorted = [...meetings].sort((a, b) => {
      const statusOrder = { NOT_STARTED: 0, IN_PROGRESS: 1, PARTIAL: 2, COMPLETED: 3 };
      const statusA = getMeetingStatus(a);
      const statusB = getMeetingStatus(b);
      return statusOrder[statusA as keyof typeof statusOrder] - statusOrder[statusB as keyof typeof statusOrder];
    });
    return sorted;
  };

  if (loading) {
    return (
      <DashboardLayout projectId={projectId} project={project || undefined}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout projectId={projectId} project={project || undefined}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight="bold">פגישות</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            פגישה חדשה
          </Button>
        </Box>

        <Card sx={{ borderRadius: 2 }}>
          <TableContainer>
            <Table sx={{ borderCollapse: 'collapse' }}>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid #ddd' }}>תאריך פגישה</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid #ddd' }}>סוג</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid #ddd' }}>כותרת</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', borderRight: '1px solid #ddd' }}>תאריך יעד</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>פעולות</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {getSortedMeetings().map((meeting) => {
                  const status = getMeetingStatus(meeting);
                  const bgColor = getStatusColor(status);
                  return (
                  <TableRow key={meeting.id} sx={{ '&:hover': { backgroundColor: bgColor === 'transparent' ? '#f9f9f9' : bgColor }, borderBottom: '1px solid #ddd', backgroundColor: bgColor }}>
                    <TableCell sx={{ borderRight: '1px solid #ddd' }}>{formatDate(meeting.meetingDate)}</TableCell>
                    <TableCell sx={{ borderRight: '1px solid #ddd' }}>
                      <Chip
                        label={MEETING_TYPES.find(t => t.value === meeting.meetingType)?.label || meeting.meetingType}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell sx={{ borderRight: '1px solid #ddd' }}>
                      <Typography variant="body2" fontWeight="500">{meeting.title}</Typography>
                      {meeting.description && (
                        <Typography variant="caption" color="textSecondary">{meeting.description}</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ borderRight: '1px solid #ddd' }}>{formatDate(meeting.dueDate)}</TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(meeting)}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteMeeting(meeting.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>{editingMeeting ? 'עריכת פגישה' : 'פגישה חדשה'}</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Box sx={{ mt: 3, mb: 2 }} />
            <Stack spacing={2}>
              <TextField
                label="תאריך פגישה"
                type="date"
                value={formData.meetingDate}
                onChange={(e) => setFormData({ ...formData, meetingDate: e.target.value })}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="כותרת"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label="תיאור"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                fullWidth
                multiline
                rows={2}
                size="small"
              />
              <TextField
                label="תאריך יעד"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                select
                label="סוג"
                value={formData.meetingType}
                onChange={(e) => setFormData({ ...formData, meetingType: e.target.value as any })}
                fullWidth
                size="small"
              >
                {MEETING_TYPES.map(type => (
                  <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                ))}
              </TextField>

              <FormControlLabel
                control={<Checkbox checked={formData.completed} onChange={(e) => setFormData({ ...formData, completed: e.target.checked })} />}
                label="בוצע"
              />

              <Box>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                  משימות פעולה
                </Typography>
                {formData.actionItems.map((item, idx) => (
                  <Box key={idx} sx={{ mb: 1, p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <TextField
                      label="תיאור"
                      value={item.description}
                      onChange={(e) => {
                        const newItems = [...formData.actionItems];
                        newItems[idx].description = e.target.value;
                        setFormData({ ...formData, actionItems: newItems });
                      }}
                      fullWidth
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <TextField
                      label="תאריך יעד"
                      type="date"
                      value={item.dueDate}
                      onChange={(e) => {
                        const newItems = [...formData.actionItems];
                        newItems[idx].dueDate = e.target.value;
                        setFormData({ ...formData, actionItems: newItems });
                      }}
                      fullWidth
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      sx={{ mb: 1 }}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={item.status === 'COMPLETED'}
                          onChange={(e) => {
                            const newItems = [...formData.actionItems];
                            newItems[idx].status = e.target.checked ? 'COMPLETED' : 'PENDING';
                            setFormData({ ...formData, actionItems: newItems });
                          }}
                        />
                      }
                      label="הושלמה"
                    />
                  </Box>
                ))}
                <Button
                  onClick={() => setFormData({ ...formData, actionItems: [...formData.actionItems, { id: '', description: '', dueDate: '', assigneeVendorId: '', status: 'PENDING' }] })}
                  size="small"
                  variant="outlined"
                >
                  + משימה
                </Button>
              </Box>

              <Box>
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                  החלטות
                </Typography>
                {formData.decisions.map((decision, idx) => (
                  <TextField
                    key={idx}
                    value={decision}
                    onChange={(e) => {
                      const newDecisions = [...formData.decisions];
                      newDecisions[idx] = e.target.value;
                      setFormData({ ...formData, decisions: newDecisions });
                    }}
                    placeholder={`החלטה ${idx + 1}`}
                    fullWidth
                    size="small"
                    sx={{ mb: 1 }}
                  />
                ))}
                <Button
                  onClick={() => setFormData({ ...formData, decisions: [...formData.decisions, ''] })}
                  size="small"
                  variant="outlined"
                >
                  + החלטה
                </Button>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>ביטול</Button>
            <Button onClick={handleSaveMeeting} variant="contained">שמור</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}
