'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  LinearProgress,
  Grid,
  MenuItem,
  CircularProgress,
  Tooltip,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import KitchenIcon from '@mui/icons-material/Kitchen';
import LivingIcon from '@mui/icons-material/Weekend';
import BedIcon from '@mui/icons-material/Bed';
import BathtubIcon from '@mui/icons-material/Bathtub';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import BalconyIcon from '@mui/icons-material/Balcony';
import DeckIcon from '@mui/icons-material/Deck';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import WcIcon from '@mui/icons-material/Wc';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import WorkIcon from '@mui/icons-material/Work';
import LocalLaundryServiceIcon from '@mui/icons-material/LocalLaundryService';
import GroupsIcon from '@mui/icons-material/Groups';
import DiningIcon from '@mui/icons-material/TableRestaurant';
import FormatPaintIcon from '@mui/icons-material/FormatPaint';
import CarpenterIcon from '@mui/icons-material/Carpenter';
import BoltIcon from '@mui/icons-material/Bolt';
import PlumbingIcon from '@mui/icons-material/Plumbing';
import HandymanIcon from '@mui/icons-material/Handyman';
import WindowIcon from '@mui/icons-material/Window';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { hebrewLabels } from '@/lib/labels';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc, getDocsFromServer } from 'firebase/firestore';
import type { Project, Room, Task } from '@/types';

const roomIcons: any = {
  'מטבח': '👨‍🍳',
  'סלון': '🛋️',
  'חדר שינה ראשי': '🛏️',
  'חדר אמבטיה': '🛁',
  'חדר ילדים': '👶',
};

// Available icons for selection
const availableIcons = [
  { name: 'אמבטיה', emoji: '🛁', value: 'bathtub' },
  { name: 'חדר איפור', emoji: '💄', value: 'makeup' },
  { name: 'חדר עבודה', emoji: '💼', value: 'office' },
  { name: 'חדר ילדים', emoji: '👶', value: 'childcare' },
  { name: 'חדר כביסה', emoji: '🧺', value: 'laundry' },
  { name: 'חדר משפחה', emoji: '👨‍👩‍👧‍👦', value: 'family' },
  { name: 'חדר שינה', emoji: '🛏️', value: 'bed' },
  { name: 'כניסה/מסדרון', emoji: '🚪', value: 'entrance' },
  { name: 'מזווה', emoji: '🍽️', value: 'pantry' },
  { name: 'מחסן', emoji: '📦', value: 'warehouse' },
  { name: 'מטבח', emoji: '👨‍🍳', value: 'kitchen' },
  { name: 'מרפסת', emoji: '🌿', value: 'balcony' },
  { name: 'מרפסת שירות', emoji: '👕', value: 'deck' },
  { name: 'סלון', emoji: '🛋️', value: 'living' },
  { name: 'פינת אוכל', emoji: '🍽️', value: 'dining' },
  { name: 'שירותים', emoji: '🚽', value: 'wc' },
].sort((a, b) => a.name.localeCompare(b.name, 'he'));

const iconMap: any = {
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

const statusOptions = [
  { value: 'NOT_STARTED', label: 'לא התחיל', color: 'default' },
  { value: 'IN_PROGRESS', label: 'בביצוע', color: 'primary' },
  { value: 'DONE', label: 'הושלם', color: 'success' },
  { value: 'BLOCKED', label: 'חסום', color: 'error' },
];

// Format date from YYYY-MM-DD to DD/MM/YYYY
const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

export default function RoomsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { user } = useAuth();
  const router = useRouter();
  const [rooms, setRooms] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskCategories, setTaskCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [autoUpdateStatus, setAutoUpdateStatus] = useState(true);
  const [taskFormData, setTaskFormData] = useState({
    status: 'NOT_STARTED',
    progress: 0,
    startDate: '',
    endDate: '',
  });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-update status when progress or dates change
  useEffect(() => {
    // Only run auto-update if checkbox is checked
    if (!autoUpdateStatus || !openTaskDialog) return;
    
    const today = new Date();
    const startDate = taskFormData.startDate ? new Date(taskFormData.startDate) : null;
    
    let newStatus: string;
    
    // Calculate what status should be based on progress and dates
    // This OVERRIDES manual selection when checkbox is checked
    if (taskFormData.progress >= 100) {
      newStatus = 'DONE';
    } else if (taskFormData.progress > 0) {
      newStatus = 'IN_PROGRESS';
    } else {
      newStatus = 'NOT_STARTED';
    }
    
    // Always update status when auto-update is enabled (override manual selection)
    if (newStatus !== taskFormData.status) {
      setTaskFormData(prev => ({ ...prev, status: newStatus }));
    }
  }, [taskFormData.progress, taskFormData.startDate, autoUpdateStatus, openTaskDialog, taskFormData.status]);

  useEffect(() => {
    if (!mounted) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    loadData();
  }, [user, router, mounted, projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Load rooms
      const roomsQuery = query(
        collection(db, 'rooms'),
        where('projectId', '==', projectId)
      );
      const roomsSnapshot = await getDocsFromServer(roomsQuery);
      const roomsData = roomsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Load tasks
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('projectId', '==', projectId)
      );
      const tasksSnapshot = await getDocsFromServer(tasksQuery);
      const tasksData = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[];

      setTasks(tasksData);

      // Extract unique task categories
      const categories = [...new Set(tasksData.map(t => t.category))].filter(Boolean);
      setTaskCategories(categories as string[]);

      // Build rooms with tasks matrix
      const roomsWithTasks = roomsData.map(room => {
        const roomTasks: Record<string, any> = {};
        categories.forEach(category => {
          const task = tasksData.find(t => t.roomId === room.id && t.category === category);
          if (task) {
            roomTasks[category] = {
              ...task,
              status: task.status || 'NOT_STARTED',
            };
          }
        });
        return {
          ...room,
          tasks: roomTasks,
        };
      });

      setRooms(roomsWithTasks);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (room?: any) => {
    if (room) {
      setEditingRoom(room);
      setFormData({
        name: room.name,
        description: room.description,
        icon: room.icon || '',
      });
    } else {
      setEditingRoom(null);
      setFormData({
        name: '',
        description: '',
        icon: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRoom(null);
    setFormData({
      name: '',
      description: '',
      icon: '',
    });
  };

  const handleSaveRoom = async () => {
    try {
      if (editingRoom) {
        // Update existing room
        await updateDoc(doc(db, 'rooms', editingRoom.id), formData);
      } else {
        // Add new room
        await addDoc(collection(db, 'rooms'), {
          ...formData,
          projectId,
          order: rooms.length,
          createdAt: new Date().toISOString(),
        });
      }
      handleCloseDialog();
      await loadData();
    } catch (error) {
      console.error('Error saving room:', error);
      alert('שגיאה בשמירת החדר');
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק חדר זה?')) {
      try {
        await deleteDoc(doc(db, 'rooms', roomId));
        // Also delete all tasks in this room
        const roomTasks = tasks.filter(t => t.roomId === roomId);
        await Promise.all(roomTasks.map(t => deleteDoc(doc(db, 'tasks', t.id))));
        await loadData();
      } catch (error) {
        console.error('Error deleting room:', error);
        alert('שגיאה במחיקת החדר');
      }
    }
  };

  const handleOpenTaskDialog = (roomId: string, taskTypeName: string, task?: any) => {
    setEditingTask({ roomId, taskTypeName, task });
    if (task) {
      setTaskFormData({
        status: task.status || 'NOT_STARTED',
        progress: task.progress || 0,
        startDate: task.startDate || '',
        endDate: task.endDate || '',
      });
      setAutoUpdateStatus(task.autoUpdateStatus !== undefined ? task.autoUpdateStatus : true);
    } else {
      setTaskFormData({
        status: 'NOT_STARTED',
        progress: 0,
        startDate: '',
        endDate: '',
      });
      setAutoUpdateStatus(true);
    }
    setOpenTaskDialog(true);
  };

  const handleCloseTaskDialog = () => {
    setOpenTaskDialog(false);
    setEditingTask(null);
    setTaskFormData({
      status: 'NOT_STARTED',
      progress: 0,
      startDate: '',
      endDate: '',
    });
    setAutoUpdateStatus(true);
  };

  const handleResetTask = async () => {
    if (!editingTask?.task) return;
    
    if (window.confirm('האם אתה בטוח שברצונך לאפס משימה זו? כל הנתונים (סטטוס, אחוזים, תאריכים) יימחקו.')) {
      try {
        const taskToReset = tasks.find(
          t => t.roomId === editingTask.roomId && t.category === editingTask.taskTypeName
        );
        
        if (taskToReset) {
          // Delete the task completely from Firebase
          await deleteDoc(doc(db, 'tasks', taskToReset.id));
          
          // Close dialog and reload data
          handleCloseTaskDialog();
          await loadData();
        }
      } catch (error) {
        console.error('Error resetting task:', error);
        alert('שגיאה באיפוס המשימה');
      }
    }
  };

  const handleSaveTask = async () => {
    if (!editingTask) return;

    // Use the status that was already calculated by useEffect
    let finalStatus = taskFormData.status;
    let finalProgress = taskFormData.progress;
    
    // Validation: if status is DONE, progress must be 100%
    if (taskFormData.status === 'DONE' && taskFormData.progress < 100) {
      alert('לא ניתן לסמן משימה כהושלם אם האחוז ביצוע הוא פחות מ-100%');
      return;
    }
    
    // If auto-update is enabled, apply the same logic as useEffect
    if (autoUpdateStatus) {
      if (taskFormData.progress >= 100) {
        finalStatus = 'DONE';
        finalProgress = 100;
      } else if (taskFormData.progress > 0) {
        finalStatus = 'IN_PROGRESS';
      } else {
        finalStatus = 'NOT_STARTED';
      }
    }

    try {
      // Check if task exists
      const existingTask = tasks.find(
        t => t.roomId === editingTask.roomId && t.category === editingTask.taskTypeName
      );

      const taskData = {
        title: editingTask.taskTypeName,
        category: editingTask.taskTypeName,
        status: finalStatus,
        roomId: editingTask.roomId,
        projectId,
        dueDate: taskFormData.endDate || null,
        updatedAt: new Date().toISOString(),
        // Store dates in the task's tasks object structure
        startDate: taskFormData.startDate || null,
        endDate: taskFormData.endDate || null,
        progress: finalProgress,
        autoUpdateStatus: autoUpdateStatus,
      };

      if (existingTask) {
        // Update existing task
        await updateDoc(doc(db, 'tasks', existingTask.id), taskData);
      } else {
        // Create new task
        await addDoc(collection(db, 'tasks'), {
          ...taskData,
          createdAt: new Date().toISOString(),
        });
      }

      handleCloseTaskDialog();
      await loadData();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('שגיאה בשמירת המשימה');
    }
  };

  const handleMoveRoom = async (event: React.MouseEvent, index: number, direction: 'up' | 'down') => {
    event.stopPropagation();
    const newRooms = [...rooms];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newRooms.length) return;
    
    [newRooms[index], newRooms[targetIndex]] = [newRooms[targetIndex], newRooms[index]];
    
    try {
      // Update order in Firebase
      await Promise.all(
        newRooms.map((room, idx) => 
          updateDoc(doc(db, 'rooms', room.id), { order: idx })
        )
      );
      setRooms(newRooms);
    } catch (error) {
      console.error('Error moving room:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return statusOption?.color as any || 'default';
  };

  const getStatusLabel = (status: string) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return statusOption?.label || status;
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'DONE':
        return 'success';
      case 'IN_PROGRESS':
        return 'warning';
      case 'BLOCKED':
        return 'error';
      case 'NOT_STARTED':
      default:
        return 'inherit';
    }
  };

  const getStatusDisplay = (task: any) => {
    if (!task) return { icon: '—', color: '#e0e0e0', label: 'לא רלוונטי' };
    
    const icons: any = {
      'DONE': { icon: '✓', color: '#4caf50', label: 'הושלם' },
      'IN_PROGRESS': { icon: '●', color: '#FFD700', label: 'בביצוע' },
      'BLOCKED': { icon: '⚠', color: '#f44336', label: 'חסום' },
      'NOT_STARTED': { icon: '○', color: '#9e9e9e', label: 'לא התחיל' },
    };
    
    return icons[task.status] || icons['NOT_STARTED'];
  };

  const isOverdue = (task: any) => {
    if (!task || !task.endDate || task.status === 'DONE') return false;
    const today = new Date();
    const endDate = new Date(task.endDate);
    return today > endDate;
  };

  if (!mounted || loading) {
    return (
      <DashboardLayout projectId={projectId}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout projectId={projectId}>
      <Box sx={{ pr: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} sx={{ px: 3 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h4">
              {hebrewLabels.rooms}
            </Typography>
            <Chip label={rooms.length} color="primary" size="medium" />
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            {hebrewLabels.addRoom}
          </Button>
        </Box>

        {/* Matrix Table */}
        <Box sx={{ px: 3, overflowX: 'auto' }}>
          <Card>
            {/* עטיפה עם grid משותף ל-header ולשורות */}
            <Box
              sx={{
                minWidth: 800,
                overflowX: 'auto',
                // נגדיר פעם אחת את תבנית העמודות
                '--rooms-grid-template': `
                  200px
                  repeat(${taskCategories.length}, minmax(140px, 1fr))
                  minmax(140px, 1fr)
                `,
              }}
            >
              {/* Table Header */}
              <Box
                role="row"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'var(--rooms-grid-template)',
                  borderBottom: '2px solid #e0e0e0',
                  backgroundColor: '#f5f5f5',
                  minWidth: 'fit-content',
                }}
              >
                {/* חדר */}
                <Box
                  role="columnheader"
                  sx={{ p: 2, borderLeft: '1px solid #e0e0e0', textAlign: 'center' }}
                >
                  <Typography variant="subtitle2" fontWeight="bold">חדר</Typography>
                </Box>

                {/* קטגוריות */}
                {taskCategories.map((category) => (
                  <Box
                    key={category}
                    role="columnheader"
                    sx={{ p: 2, textAlign: 'center', borderLeft: '1px solid #e0e0e0' }}
                  >
                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                      <Typography sx={{ fontSize: 18 }}>
                        {taskCategoryIcons[category] || '📝'}
                      </Typography>
                      <Typography variant="subtitle2" fontWeight="bold">{category}</Typography>
                    </Box>
                  </Box>
                ))}

                {/* פעולות */}
                <Box
                  role="columnheader"
                  sx={{ p: 2, textAlign: 'center', borderLeft: '1px solid #e0e0e0' }}
                >
                  <Typography variant="subtitle2" fontWeight="bold">פעולות</Typography>
                </Box>
              </Box>

              {/* Table Rows */}
              {rooms.map((room, index) => (
                <Box
                  key={room.id}
                  role="row"
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'var(--rooms-grid-template)',
                    borderBottom: '1px solid #e0e0e0',
                    '&:hover': { backgroundColor: '#fafafa' },
                    minWidth: 'fit-content',
                  }}
                >
                  {/* Room Name */}
                  <Box sx={{ p: 2, borderLeft: '1px solid #e0e0e0', overflow: 'hidden' }}>
                    <Box display="flex" flexDirection="row-reverse" alignItems="center" justifyContent="flex-end" gap={1} mb={0.5}>
                      <Typography variant="body1" fontWeight="500" sx={{ wordBreak: 'break-word' }}>{room.name}</Typography>
                      {(room.icon ? iconMap[room.icon] : roomIcons[room.name]) && (
                        <Typography sx={{ fontSize: 20, flexShrink: 0 }}>
                          {room.icon ? iconMap[room.icon] : roomIcons[room.name]}
                        </Typography>
                      )}
                    </Box>
                    {room.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', display: 'block', paddingRight: '28px', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                        {room.description}
                      </Typography>
                    )}
                  </Box>

                  {/* Task Status Cells */}
                  {taskCategories.map((category) => {
                    const task = room.tasks[category];
                    const statusDisplay = getStatusDisplay(task);
                    const overdue = isOverdue(task);

                    return (
                      <Box
                        key={category}
                        onClick={() => handleOpenTaskDialog(room.id, category, task)}
                        sx={{
                          p: 2,
                          borderLeft: '1px solid #e0e0e0',
                          backgroundColor: overdue ? '#ffebee' : 'transparent',
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: overdue ? '#ffcdd2' : '#f5f5f5',
                          },
                          textAlign: 'center',
                        }}
                      >
                        {task ? (
                          <Box>
                            <Box display="flex" alignItems="center" justifyContent="center" gap={0.5} mb={0.5}>
                              <Typography 
                                sx={{ 
                                  fontSize: '18px', 
                                  color: statusDisplay.color,
                                  lineHeight: 1,
                                }}
                              >
                                {statusDisplay.icon}
                              </Typography>
                              {task.progress > 0 && (
                                <Typography variant="caption" fontWeight="bold">
                                  {task.progress}%
                                </Typography>
                              )}
                            </Box>
                            {task.startDate && (
                              <Typography 
                                variant="caption" 
                                display="block"
                                sx={{ color: 'text.secondary' }}
                              >
                                {formatDate(task.startDate)}
                              </Typography>
                            )}
                            {task.endDate && (
                              <Typography 
                                variant="caption" 
                                display="block"
                                sx={{ color: overdue ? '#d32f2f' : 'text.secondary', fontWeight: overdue ? 'bold' : 'normal' }}
                              >
                                {formatDate(task.endDate)}
                              </Typography>
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.disabled">
                            —
                          </Typography>
                        )}
                      </Box>
                    );
                  })}

                  {/* Actions */}
                  <Box
                    sx={{
                      p: 0.5,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: 0.25,
                      borderLeft: '1px solid #e0e0e0',
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(room)}
                      color="primary"
                      sx={{ p: 0.5 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteRoom(room.id)}
                      color="error"
                      sx={{ p: 0.5 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMoveRoom(e, index, 'up')}
                      disabled={index === 0}
                      sx={{ p: 0.5 }}
                    >
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      sx={{ p: 0.5 }}
                      onClick={(e) => handleMoveRoom(e, index, 'down')}
                      disabled={index === rooms.length - 1}
                    >
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
          </Card>
        </Box>

        {/* Add/Edit Room Dialog */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingRoom ? 'עריכת חדר' : 'הוספת חדר חדש'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="שם החדר"
                fullWidth
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />

              <TextField
                label="תיאור"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />

              <TextField
                label="אייקון"
                fullWidth
                select
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              >
                <MenuItem value="">ללא אייקון</MenuItem>
                {availableIcons.map((iconOption) => (
                  <MenuItem key={iconOption.value} value={iconOption.value}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography sx={{ fontSize: 20 }}>{iconOption.emoji}</Typography>
                      <Typography>{iconOption.name}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>
              ביטול
            </Button>
            <Button
              onClick={handleSaveRoom}
              variant="contained"
              disabled={!formData.name.trim()}
            >
              שמור
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit Task Dialog */}
        <Dialog open={openTaskDialog} onClose={handleCloseTaskDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            עריכת משימה
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="סטטוס"
                fullWidth
                select
                value={taskFormData.status}
                onChange={(e) => setTaskFormData({ ...taskFormData, status: e.target.value })}
              >
                {statusOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="אחוז התקדמות"
                fullWidth
                type="number"
                value={taskFormData.progress}
                onChange={(e) => setTaskFormData({ ...taskFormData, progress: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                inputProps={{ min: 0, max: 100 }}
              />

              <TextField
                label="תאריך התחלה"
                fullWidth
                type="date"
                value={taskFormData.startDate}
                onChange={(e) => setTaskFormData({ ...taskFormData, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                label="תאריך סיום"
                fullWidth
                type="date"
                value={taskFormData.endDate}
                onChange={(e) => setTaskFormData({ ...taskFormData, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={autoUpdateStatus}
                    onChange={(e) => setAutoUpdateStatus(e.target.checked)}
                  />
                }
                label="עדכן סטטוס אוטומטי לפי אחוז התקדמות"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseTaskDialog}>
              ביטול
            </Button>
            {editingTask?.task && (
              <Button
                onClick={handleResetTask}
                color="warning"
                sx={{ mr: 'auto' }}
              >
                אפס משימה
              </Button>
            )}
            <Button
              onClick={handleSaveTask}
              variant="contained"
            >
              שמור
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}
