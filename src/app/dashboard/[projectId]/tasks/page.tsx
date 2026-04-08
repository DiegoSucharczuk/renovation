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
  Select,
  OutlinedInput,
  InputLabel,
  FormControl,
  Checkbox,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
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
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
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
        }).sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999));
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

  const handleMoveTask = async (event: React.MouseEvent, index: number, direction: 'up' | 'down') => {
    event.stopPropagation();
    const newTasks = [...tasks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newTasks.length) return;
    
    [newTasks[index], newTasks[targetIndex]] = [newTasks[targetIndex], newTasks[index]];
    setTasks(newTasks);

    try {
      await Promise.all(
        newTasks.map((task, idx) => 
          updateDoc(doc(db, 'tasks', task.id), { order: idx })
        )
      );
    } catch (error) {
      console.error('Error saving task order:', error);
    }
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
    BLOCKED: 'חסום',
    NOT_RELEVANT: 'לא רלוונטי',
  };

  const statusColors: Record<Task['status'], 'default' | 'primary' | 'warning' | 'success' | 'error'> = {
    NO_STATUS: 'default',
    NOT_STARTED: 'default',
    IN_PROGRESS: 'primary',
    WAITING: 'warning',
    DONE: 'success',
    BLOCKED: 'error',
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

  // Calculate statistics
  const noStatusTasks = tasks.filter(t => t.status === 'NO_STATUS').length;
  const notStartedTasks = tasks.filter(t => t.status === 'NOT_STARTED').length;
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const blockedTasks = tasks.filter(t => t.status === 'BLOCKED').length;
  const completedTasks = tasks.filter(t => t.status === 'DONE').length;
  const totalTasks = tasks.length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <DashboardLayout projectId={projectId} project={project || undefined}>
      <Box sx={{ pr: 3, height: 'calc(100% - 16px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} sx={{ px: 3, flexShrink: 0 }}>
          <Typography variant="h3" fontWeight="bold">
            {hebrewLabels.tasks}
          </Typography>
          <Box display="flex" gap={2} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<FilterListIcon />}
              onClick={() => setFilterModalOpen(true)}
              sx={{
                boxShadow: 1,
                '&:hover': {
                  boxShadow: 3,
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s',
              }}
            >
              סינון
              {(selectedRooms.length > 0 || selectedStatuses.length > 0 || selectedCategories.length > 0) && (
                <Chip 
                  label={selectedRooms.length + selectedStatuses.length + selectedCategories.length}
                  size="small"
                  sx={{ ml: 1, backgroundColor: 'primary.main', color: 'white' }}
                />
              )}
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{
                boxShadow: 2,
                '&:hover': {
                  boxShadow: 4,
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s',
              }}
            >
              הוספת משימה
            </Button>
          </Box>
        </Box>

        {/* Summary Cards */}
        <Box sx={{ px: 3, mb: 2, display: 'grid', gap: 2, gridAutoFlow: 'column', gridAutoColumns: '1fr', overflowX: 'auto', pb: 1, flexShrink: 0 }}>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', transition: 'transform 0.2s, boxShadow 0.2s', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } }}>
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ fontSize: '0.95rem', display: 'block' }}>סה"כ משימות</Typography>
              <Typography variant="h4" fontWeight="800" color="primary.main" sx={{ mt: 0.5, fontSize: '2.5rem' }}>{totalTasks}</Typography>
            </Box>
          </Card>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', transition: 'transform 0.2s, boxShadow 0.2s', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } }}>
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ fontSize: '0.95rem', display: 'block' }}>הושלמו</Typography>
              <Typography variant="h4" fontWeight="800" color="success.main" sx={{ mt: 0.5, fontSize: '2.5rem' }}>{completedTasks}</Typography>
            </Box>
          </Card>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', transition: 'transform 0.2s, boxShadow 0.2s', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } }}>
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ fontSize: '0.95rem', display: 'block' }}>בביצוע</Typography>
              <Typography variant="h4" fontWeight="800" color="primary.main" sx={{ mt: 0.5, fontSize: '2.5rem' }}>{inProgressTasks}</Typography>
            </Box>
          </Card>
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', transition: 'transform 0.2s, boxShadow 0.2s', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } }}>
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ fontSize: '0.95rem', display: 'block' }}>לא התחילו</Typography>
              <Typography variant="h4" fontWeight="800" color="text.secondary" sx={{ mt: 0.5, fontSize: '2.5rem' }}>{notStartedTasks}</Typography>
            </Box>
          </Card>
          {blockedTasks > 0 && (
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', transition: 'transform 0.2s, boxShadow 0.2s', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } }}>
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ fontSize: '0.95rem', display: 'block' }}>חסומות</Typography>
                <Typography variant="h4" fontWeight="800" color="error.main" sx={{ mt: 0.5, fontSize: '2.5rem' }}>{blockedTasks}</Typography>
              </Box>
            </Card>
          )}
          {noStatusTasks > 0 && (
            <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', transition: 'transform 0.2s, boxShadow 0.2s', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } }}>
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ fontSize: '0.95rem', display: 'block' }}>ללא סטטוס</Typography>
                <Typography variant="h4" fontWeight="800" color="text.disabled" sx={{ mt: 0.5, fontSize: '2.5rem' }}>{noStatusTasks}</Typography>
              </Box>
            </Card>
          )}
          <Card sx={{ borderRadius: 3, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', transition: 'transform 0.2s, boxShadow 0.2s', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center', '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } }}>
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ fontSize: '0.95rem', display: 'block' }}>אחוז השלמה</Typography>
              <Typography variant="h4" fontWeight="800" color="primary.main" sx={{ mt: 0.5, fontSize: '2.5rem' }}>{completionPercentage}%</Typography>
            </Box>
          </Card>
        </Box>

        {/* Tasks Table */}
        <Card sx={{ 
          mx: 3,
          mb: 1,
          boxShadow: 3,
          '&:hover': {
            boxShadow: 4,
          },
          transition: 'box-shadow 0.2s',
          direction: 'ltr',
          position: 'relative',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minHeight: 0,
        }}>
          <TableContainer sx={{ direction: 'rtl', flex: 1, overflow: 'auto', width: '100%' }}>
            <Box sx={{ direction: 'ltr' }}>
              <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 140, textAlign: 'center', borderLeft: 1, borderColor: 'divider', backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 10 }}><strong>קטגוריה</strong></TableCell>
                  <TableCell sx={{ textAlign: 'center', borderLeft: 1, borderColor: 'divider', backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 10 }}><strong>תיאור</strong></TableCell>
                  <TableCell sx={{ width: 120, textAlign: 'center', borderLeft: 1, borderColor: 'divider', backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 10 }}><strong>חדר</strong></TableCell>
                  <TableCell sx={{ width: 100, textAlign: 'center', borderLeft: 1, borderColor: 'divider', backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 10 }}><strong>סטטוס</strong></TableCell>
                  <TableCell sx={{ width: 180, textAlign: 'center', borderLeft: 1, borderColor: 'divider', backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 10 }}><strong>פעולות</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  // Apply filters
                  let filteredTasks = tasks;
                  
                  // Filter by room (selectedRooms stores room names, match all IDs with that name)
                  if (selectedRooms.length > 0) {
                    const matchingRoomIds = rooms.filter(r => selectedRooms.includes(r.name)).map(r => r.id);
                    filteredTasks = filteredTasks.filter(task => 
                      task.roomId && matchingRoomIds.includes(task.roomId)
                    );
                  }
                  
                  // Filter by status
                  if (selectedStatuses.length > 0) {
                    filteredTasks = filteredTasks.filter(task => 
                      selectedStatuses.includes(task.status)
                    );
                  }
                  
                  // Filter by category
                  if (selectedCategories.length > 0) {
                    filteredTasks = filteredTasks.filter(task => 
                      task.category && selectedCategories.includes(task.category)
                    );
                  }

                  if (filteredTasks.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={6} align="center">
                          <Typography variant="body2" color="text.secondary" py={3}>
                            {tasks.length === 0 ? 'אין משימות להצגה. לחץ על "הוספת משימה" כדי להתחיל.' : 'אין משימות התואמות את ההסתנן הנבחר'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return filteredTasks.map((task, index) => {
                    const taskRoom = task.roomId ? rooms.find(r => r.id === task.roomId) : null;
                    const getStatusDisplay = (status: string) => {
                      const icons: any = {
                        'NO_STATUS': { icon: '—', color: '#bdbdbd' },
                        'DONE': { icon: '✓', color: '#4caf50' },
                        'IN_PROGRESS': { icon: '●', color: '#FFD700' },
                        'WAITING': { icon: '⏸', color: '#ff9800' },
                        'BLOCKED': { icon: '⚠', color: '#f44336' },
                        'NOT_STARTED': { icon: '○', color: '#9e9e9e' },
                        'NOT_RELEVANT': { icon: '—', color: '#e0e0e0' },
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
                        <Typography>{task.description || '-'}</Typography>
                      </TableCell>
                      <TableCell sx={{ width: 120, borderLeft: 1, borderColor: 'divider', pr: 2 }}>
                        {taskRoom ? (
                          <Box display="flex" alignItems="center" gap={0.5} sx={{ whiteSpace: 'nowrap' }}>
                            {taskRoom.icon && (
                              <Typography sx={{ fontSize: 18 }}>{roomIconMap[taskRoom.icon] || taskRoom.icon}</Typography>
                            )}
                            <Typography sx={{ whiteSpace: 'nowrap' }}>{taskRoom.name}</Typography>
                          </Box>
                        ) : (
                          <Typography>-</Typography>
                        )}
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
                  });
                })()}
              </TableBody>
            </Table>
            </Box>
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

        {/* Filter Modal Dialog */}
        <Dialog 
          open={filterModalOpen} 
          onClose={() => setFilterModalOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle fontWeight="bold" display="flex" alignItems="center" gap={1}>
            <FilterListIcon color="primary" />
            סינון משימות
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Box display="flex" gap={2} flexWrap="wrap">
              {/* Room Filter */}
              <Box sx={{ flex: '1 1 280px', minWidth: 250 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>חדרים</InputLabel>
                  <Select
                    multiple
                    value={selectedRooms}
                    onChange={(e) => setSelectedRooms(e.target.value as string[])}
                    input={<OutlinedInput label="חדרים" />}
                    renderValue={(selected) => 
                      selected.length === 0 ? 'כל החדרים' : `${selected.length} חדרים`
                    }
                  >
                    {Array.from(new Map(rooms.map(r => [r.name, r])).values()).map((room) => (
                      <MenuItem key={room.name} value={room.name}>
                        <Checkbox checked={selectedRooms.includes(room.name)} />
                        <Box display="flex" alignItems="center" gap={1}>
                          {room.icon && (
                            <Typography sx={{ fontSize: 18 }}>
                              {roomIconMap[room.icon]}
                            </Typography>
                          )}
                          <Typography>{room.name}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Status Filter */}
              <Box sx={{ flex: '1 1 280px', minWidth: 250 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>סטטוס</InputLabel>
                  <Select
                    multiple
                    value={selectedStatuses}
                    onChange={(e) => setSelectedStatuses(e.target.value as string[])}
                    input={<OutlinedInput label="סטטוס" />}
                    renderValue={(selected) => 
                      selected.length === 0 ? 'כל הסטטוסים' : `${selected.length} סטטוסים`
                    }
                  >
                    <MenuItem value="NOT_STARTED">
                      <Checkbox checked={selectedStatuses.includes('NOT_STARTED')} />
                      <Typography>לא התחיל</Typography>
                    </MenuItem>
                    <MenuItem value="IN_PROGRESS">
                      <Checkbox checked={selectedStatuses.includes('IN_PROGRESS')} />
                      <Typography>בביצוע</Typography>
                    </MenuItem>
                    <MenuItem value="WAITING">
                      <Checkbox checked={selectedStatuses.includes('WAITING')} />
                      <Typography>ממתין</Typography>
                    </MenuItem>
                    <MenuItem value="DONE">
                      <Checkbox checked={selectedStatuses.includes('DONE')} />
                      <Typography>הושלם</Typography>
                    </MenuItem>
                    <MenuItem value="BLOCKED">
                      <Checkbox checked={selectedStatuses.includes('BLOCKED')} />
                      <Typography>חסום</Typography>
                    </MenuItem>
                    <MenuItem value="NO_STATUS">
                      <Checkbox checked={selectedStatuses.includes('NO_STATUS')} />
                      <Typography>ללא סטטוס</Typography>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Category Filter */}
              <Box sx={{ flex: '1 1 280px', minWidth: 250 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>קטגוריות</InputLabel>
                  <Select
                    multiple
                    value={selectedCategories}
                    onChange={(e) => setSelectedCategories(e.target.value as string[])}
                    input={<OutlinedInput label="קטגוריות" />}
                    renderValue={(selected) => 
                      selected.length === 0 ? 'כל הקטגוריות' : `${selected.length} קטגוריות`
                    }
                  >
                    {availableCategoryIcons.map((category) => (
                      <MenuItem key={category.name} value={category.name}>
                        <Checkbox checked={selectedCategories.includes(category.name)} />
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography sx={{ fontSize: 18 }}>
                            {category.emoji}
                          </Typography>
                          <Typography>{category.name}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              startIcon={<ClearIcon />}
              onClick={() => {
                setSelectedRooms([]);
                setSelectedStatuses([]);
                setSelectedCategories([]);
              }}
              disabled={selectedRooms.length === 0 && selectedStatuses.length === 0 && selectedCategories.length === 0}
            >
              איפוס
            </Button>
            <Button onClick={() => setFilterModalOpen(false)} variant="contained">
              סגור
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}
