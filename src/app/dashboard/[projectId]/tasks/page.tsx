'use client';

import React, { useState, useEffect } from 'react';
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
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { hebrewLabels } from '@/lib/labels';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocsFromServer, getDocFromServer } from 'firebase/firestore';
import type { Project, Task, Room } from '@/types';

export default function TasksPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { user } = useAuth();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    category: '',
    status: 'NO_STATUS' as Task['status'],
    roomId: '',
  });

  // Task category icons
  const taskCategoryIcons: Record<string, string> = {
    'צביעה': '🎨',
    'פרקט': '🪵',
    'חשמל': '⚡',
    'אינסטלציה': '🚰',
    'נגרות': '🔨',
    'חלונות': '🪟',
    'מיזוג אויר': '❄️',
    'אריחים': '🏗️',
    'גבס': '🧱',
    'דלתות': '🚪',
  };

  // Room icon mapping
  const roomIconMap: any = {
    'kitchen': '👨‍🍳',
    'living': '🛋️',
    'family': '👨‍👩‍👧‍👦',
    'dining': '🍽️',
    'bed': '🛏️',
    'bathtub': '🛁',
    'childcare': '👶',
    'balcony': '🌿',
    'deck': '👕',
    'warehouse': '📦',
    'pantry': '🍽️',
    'wc': '🚽',
    'office': '💼',
    'laundry': '🧺',
    'entrance': '🚪',
    'makeup': '💄',
  };

  // Available category icons for selection
  const availableCategoryIcons = [
    { name: 'צביעה', emoji: '🎨' },
    { name: 'פרקט', emoji: '🪵' },
    { name: 'חשמל', emoji: '⚡' },
    { name: 'אינסטלציה', emoji: '🚰' },
    { name: 'נגרות', emoji: '🔨' },
    { name: 'חלונות', emoji: '🪟' },
    { name: 'מיזוג אויר', emoji: '❄️' },
    { name: 'אריחים', emoji: '🏗️' },
    { name: 'גבס', emoji: '🧱' },
    { name: 'דלתות', emoji: '🚪' },
    { name: 'ריצוף', emoji: '⬛' },
    { name: 'תקרה', emoji: '🔺' },
    { name: 'אחר', emoji: '📝' },
  ].sort((a, b) => a.name.localeCompare(b.name, 'he'));

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
        // טעינת פרויקט
        const projectDoc = await getDocFromServer(doc(db, 'projects', projectId));
        if (projectDoc.exists()) {
          setProject({
            id: projectDoc.id,
            ...projectDoc.data(),
            createdAt: projectDoc.data().createdAt?.toDate() || new Date(),
          } as Project);
        }

        // טעינת חדרים
        const roomsQuery = query(collection(db, 'rooms'), where('projectId', '==', projectId));
        const roomsSnapshot = await getDocsFromServer(roomsQuery);
        const roomsData = roomsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as unknown as Room));
        setRooms(roomsData);

        // טעינת משימות
        const tasksQuery = query(collection(db, 'tasks'), where('projectId', '==', projectId));
        const tasksSnapshot = await getDocsFromServer(tasksQuery);
        const tasksData = tasksSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date()),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt || new Date()),
            startPlanned: data.startPlanned?.toDate ? data.startPlanned.toDate() : data.startPlanned,
            endPlanned: data.endPlanned?.toDate ? data.endPlanned.toDate() : data.endPlanned,
            startActual: data.startActual?.toDate ? data.startActual.toDate() : data.startActual,
            endActual: data.endActual?.toDate ? data.endActual.toDate() : data.endActual,
          } as unknown as Task;
        });
        setTasks(tasksData);
        console.log('Loaded tasks:', tasksData.length, tasksData);
        console.log('Loading state before finally:', loading);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoading(false);
        console.log('Loading state set to false');
      }
    };

    fetchData();
  }, [user, router, projectId]);

  // Helper function to update project's updatedAt timestamp
  const updateProjectTimestamp = async () => {
    try {
      await updateDoc(doc(db, 'projects', projectId), {
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating project timestamp:', error);
    }
  };

  const handleOpenDialog = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        description: task.description || '',
        category: task.category || '',
        status: task.status,
        roomId: task.roomId || '',
      });
    } else {
      setEditingTask(null);
      setFormData({
        description: '',
        category: '',
        status: 'NO_STATUS',
        roomId: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTask(null);
  };

  const handleSaveTask = async () => {
    try {
      if (editingTask) {
        // Update existing task
        await updateDoc(doc(db, 'tasks', editingTask.id), {
          title: formData.category || formData.description,
          description: formData.description,
          category: formData.category,
          status: formData.status,
          roomId: formData.roomId || null,
          updatedAt: new Date(),
        });
        setTasks(tasks.map(t => 
          t.id === editingTask.id 
            ? { ...t, description: formData.description, category: formData.category as Task['category'], status: formData.status, roomId: formData.roomId || undefined, title: formData.category || formData.description, updatedAt: new Date() }
            : t
        ));
      } else {
        // Add new task
        const newTask = {
          projectId,
          title: formData.category || formData.description,
          description: formData.description,
          category: formData.category,
          status: formData.status,
          priority: 'MEDIUM',
          roomId: formData.roomId || null,
          budgetAllocated: 0,
          budgetActual: 0,
          assignedTo: [],
          dependencies: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const docRef = await addDoc(collection(db, 'tasks'), newTask);
        setTasks([...tasks, { id: docRef.id, ...newTask } as Task]);
      }
      await updateProjectTimestamp();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('שגיאה בשמירת המשימה');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) {
      try {
        await deleteDoc(doc(db, 'tasks', taskId));
        await updateProjectTimestamp();
        setTasks(tasks.filter(t => t.id !== taskId));
      } catch (error) {
        console.error('Error deleting task:', error);
        alert('שגיאה במחיקת המשימה');
      }
    }
  };

  const handleMoveTask = (event: React.MouseEvent, index: number, direction: 'up' | 'down') => {
    event.stopPropagation();
    const newTasks = [...tasks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newTasks.length) return;
    
    [newTasks[index], newTasks[targetIndex]] = [newTasks[targetIndex], newTasks[index]];
    setTasks(newTasks);
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

  const categoryLabels: Record<Task['category'], string> = {
    PLUMBING: 'אינסטלציה',
    ELECTRICITY: 'חשמל',
    PAINT: 'צביעה',
    FLOORING: 'ריצוף/פרקט',
    CARPENTRY: 'נגרות',
    GENERAL: 'כללי',
    OTHER: 'אחר',
  };

  const statusLabels: Record<Task['status'], string> = {
    NO_STATUS: 'ללא סטטוס',
    NOT_STARTED: 'לא התחיל',
    IN_PROGRESS: 'בביצוע',
    WAITING: 'ממתין',
    DONE: 'הושלם',
    NOT_RELEVANT: 'לא רלוונטי',
  };

  const statusColors: Record<Task['status'], 'default' | 'primary' | 'warning' | 'success'> = {
    NO_STATUS: 'default',
    NOT_STARTED: 'default',
    IN_PROGRESS: 'primary',
    WAITING: 'warning',
    DONE: 'success',
    NOT_RELEVANT: 'default',
  };

  if (loading) {
    return (
      <DashboardLayout projectId={projectId}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout projectId={projectId} project={project || undefined}>
      <Box sx={{ pr: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} sx={{ px: 3 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h4">
              {hebrewLabels.tasks}
            </Typography>
            <Chip label={tasks.length} color="primary" size="medium" />
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            הוספת משימה
          </Button>
        </Box>

        {/* Tasks Table */}
        <Card sx={{ mx: 3 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ width: 140, textAlign: 'center', borderLeft: 1, borderColor: 'divider' }}><strong>קטגוריה</strong></TableCell>
                  <TableCell sx={{ textAlign: 'center', borderLeft: 1, borderColor: 'divider' }}><strong>תיאור</strong></TableCell>
                  <TableCell sx={{ width: 120, textAlign: 'center', borderLeft: 1, borderColor: 'divider' }}><strong>חדר</strong></TableCell>
                  <TableCell sx={{ width: 100, textAlign: 'center', borderLeft: 1, borderColor: 'divider' }}><strong>סטטוס</strong></TableCell>
                  <TableCell sx={{ width: 180, textAlign: 'center', borderLeft: 1, borderColor: 'divider' }}><strong>פעולות</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary" py={3}>
                        אין משימות להצגה. לחץ על "הוספת משימה" כדי להתחיל.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task, index) => {
                    const taskRoom = task.roomId ? rooms.find(r => r.id === task.roomId) : null;
                    const getStatusDisplay = (status: string) => {
                      const icons: any = {
                        'NO_STATUS': { icon: '—', color: '#bdbdbd' },
                        'DONE': { icon: '✓', color: '#4caf50' },
                        'IN_PROGRESS': { icon: '⬤', color: '#ff9800' },
                        'WAITING': { icon: '⏸', color: '#ffa726' },
                        'BLOCKED': { icon: '🚫', color: '#f44336' },
                        'NOT_STARTED': { icon: '○', color: '#9e9e9e' },
                      };
                      return icons[status] || icons['NO_STATUS'];
                    };
                    const statusDisplay = getStatusDisplay(task.status);
                    return (
                    <TableRow key={task.id} hover>
                      <TableCell sx={{ width: 140, borderLeft: 1, borderColor: 'divider', pr: 2 }}>
                        <Box display="flex" alignItems="center" justifyContent="flex-start" gap={0.5}>
                          {taskCategoryIcons[task.category || ''] && (
                            <Typography sx={{ fontSize: 18 }}>{taskCategoryIcons[task.category || '']}</Typography>
                          )}
                          <Typography>{task.category || '-'}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ borderLeft: 1, borderColor: 'divider' }}>
                        {task.description || '-'}
                      </TableCell>
                      <TableCell sx={{ width: 120, borderLeft: 1, borderColor: 'divider', pr: 2 }}>
                        {taskRoom ? (
                          <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
                            {taskRoom.icon && `${roomIconMap[taskRoom.icon] || taskRoom.icon} `}{taskRoom.name}
                          </Box>
                        ) : '-'}
                      </TableCell>
                      <TableCell sx={{ width: 100, textAlign: 'center', borderLeft: 1, borderColor: 'divider' }}>
                        <Typography sx={{ fontSize: 20, color: statusDisplay.color }}>
                          {statusDisplay.icon}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ width: 180, textAlign: 'center', borderLeft: 1, borderColor: 'divider' }}>
                        <Tooltip title="העלה למעלה">
                          <span>
                            <IconButton
                              size="small"
                              onClick={(e) => handleMoveTask(e, index, 'up')}
                              disabled={index === 0}
                            >
                              <ArrowUpwardIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="הורד למטה">
                          <span>
                            <IconButton
                              size="small"
                              onClick={(e) => handleMoveTask(e, index, 'down')}
                              disabled={index === tasks.length - 1}
                            >
                              <ArrowDownwardIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="ערוך משימה">
                          <IconButton size="small" onClick={() => handleOpenDialog(task)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="מחק משימה">
                          <IconButton size="small" onClick={() => handleDeleteTask(task.id)} color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* Add/Edit Task Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingTask ? 'עריכת משימה' : 'הוספת משימה חדשה'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="קטגוריה"
                fullWidth
                required
                select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                helperText="בחר קטגוריה מהרשימה"
              >
                {availableCategoryIcons.map((cat) => (
                  <MenuItem key={cat.name} value={cat.name}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography sx={{ fontSize: 18 }}>{cat.emoji}</Typography>
                      <Typography>{cat.name}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="תיאור"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="תיאור מפורט של המשימה"
              />

              <TextField
                label="חדר"
                fullWidth
                select
                value={formData.roomId}
                onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                helperText="אופציונלי - שייך משימה לחדר"
              >
                <MenuItem value="">ללא חדר</MenuItem>
                {rooms.map((room) => (
                  <MenuItem key={room.id} value={room.id}>
                    {room.icon && `${roomIconMap[room.icon] || room.icon} `}{room.name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="סטטוס"
                fullWidth
                select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
              >
                <MenuItem value="NO_STATUS">ללא סטטוס</MenuItem>
                <MenuItem value="NOT_STARTED">לא התחיל</MenuItem>
                <MenuItem value="IN_PROGRESS">בביצוע</MenuItem>
                <MenuItem value="WAITING">ממתין</MenuItem>
                <MenuItem value="DONE">הושלם</MenuItem>
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>
              ביטול
            </Button>
            <Button 
              onClick={handleSaveTask} 
              variant="contained"
              disabled={!formData.category.trim()}
            >
              {editingTask ? 'שמירה' : 'הוספה'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}
