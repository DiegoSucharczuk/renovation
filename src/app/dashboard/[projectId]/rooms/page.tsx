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
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import type { Project, Room, Task } from '@/types';
import { getTaskCategories } from '@/lib/taskCategories';

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

const mockRoomsWithTasks = [
  {
    id: '1',
    name: 'מטבח',
    tasks: {
      'צביעה': { status: 'DONE', progress: 100, startDate: '2026-01-15', endDate: '2026-01-20' },
      'פרקט': { status: 'IN_PROGRESS', progress: 50, startDate: '2026-02-01', endDate: '2026-02-10' },
      'חשמל': { status: 'DONE', progress: 100, startDate: '2026-01-10', endDate: '2026-01-18' },
      'אינסטלציה': { status: 'BLOCKED', progress: 30, startDate: '2026-01-25', endDate: '2026-02-05' },
    }
  },
  {
    id: '2',
    name: 'סלון',
    tasks: {
      'צביעה': { status: 'IN_PROGRESS', progress: 60, startDate: '2026-02-01', endDate: '2026-02-08' },
      'פרקט': { status: 'NOT_STARTED', progress: 0, startDate: null, endDate: '2026-02-20' },
      'חשמל': { status: 'DONE', progress: 100, startDate: '2026-01-12', endDate: '2026-01-20' },
    }
  },
  {
    id: '3',
    name: 'חדר שינה ראשי',
    tasks: {
      'צביעה': { status: 'DONE', progress: 100, startDate: '2026-01-20', endDate: '2026-01-25' },
      'פרקט': { status: 'DONE', progress: 100, startDate: '2026-01-26', endDate: '2026-02-02' },
      'חשמל': { status: 'DONE', progress: 100, startDate: '2026-01-08', endDate: '2026-01-15' },
      'נגרות': { status: 'DONE', progress: 100, startDate: '2026-02-03', endDate: '2026-02-06' },
    }
  },
  {
    id: '4',
    name: 'חדר אמבטיה',
    tasks: {
      'אינסטלציה': { status: 'BLOCKED', progress: 30, startDate: '2026-01-28', endDate: '2026-02-05' },
      'חשמל': { status: 'IN_PROGRESS', progress: 45, startDate: '2026-02-02', endDate: '2026-02-08' },
    }
  },
];

const statusOptions = [
  { value: 'NOT_STARTED', label: 'לא התחיל', color: 'default' },
  { value: 'IN_PROGRESS', label: 'בביצוע', color: 'primary' },
  { value: 'DONE', label: 'הושלם', color: 'success' },
  { value: 'BLOCKED', label: 'חסום', color: 'error' },
];

export default function RoomsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { user } = useAuth();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskCategories, setTaskCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [taskFormData, setTaskFormData] = useState({
    description: '',
    status: 'NOT_STARTED',
    autoUpdateStatus: true,
  });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchData();
  }, [user, router, projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // טעינת פרויקט
      const projectDoc = await getDoc(doc(db, 'projects', projectId));
      if (projectDoc.exists()) {
        setProject({
          id: projectDoc.id,
          ...projectDoc.data(),
          createdAt: projectDoc.data().createdAt?.toDate() || new Date(),
        } as Project);
      }

      // טעינת חדרים
      const roomsQuery = query(collection(db, 'rooms'), where('projectId', '==', projectId));
      const roomsSnapshot = await getDocs(roomsQuery);
      const roomsData = roomsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));

      // טעינת משימות
      const tasksQuery = query(collection(db, 'tasks'), where('projectId', '==', projectId));
      const tasksSnapshot = await getDocs(tasksQuery);
      const tasksData = tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Task[];

      setTasks(tasksData);

      // יצירת קטגוריות ייחודיות מהמשימות
      const uniqueCategories = Array.from(new Set(tasksData.map(t => t.category)))
        .sort((a, b) => a.localeCompare(b, 'he'))
        .map(name => ({ name }));
      setTaskCategories(uniqueCategories);

      // ארגון המשימות לפי חדרים וקטגוריות
      const roomsWithTasks = roomsData.map(room => {
        const roomTasks: any = {};
        uniqueCategories.forEach(category => {
          const task = tasksData.find(t => t.roomId === room.id && t.category === category.name);
          // רק אם המשימה קיימת ולא מסומנת כלא רלוונטית
          if (task && task.status !== 'NOT_RELEVANT') {
            roomTasks[category.name] = {
              id: task.id,
              status: task.status,
              description: task.description || '',
            };
          }
        });
        return {
          ...room,
          tasks: roomTasks,
        };
      });

      // מיון החדרים לפי א"ב עברי
      roomsWithTasks.sort((a, b) => (a as any).name.localeCompare((b as any).name, 'he'));

      setRooms(roomsWithTasks);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get only categories that have tasks
  const getActiveCategories = () => {
    const activeCategoryNames = new Set<string>();
    rooms.forEach(room => {
      Object.keys(room.tasks || {}).forEach(category => {
        activeCategoryNames.add(category);
      });
    });
    // Return categories in the order they appear in taskCategories
    return taskCategories.filter(cat => activeCategoryNames.has(cat.name));
  };

  // תמיד להציג את כל הקטגוריות, גם אם אין משימות
  const activeCategories = taskCategories;

  const handleOpenDialog = (room?: any) => {
    if (room) {
      setEditingRoom(room);
      // If icon is an emoji, find its value
      let iconValue = room.icon || '';
      if (iconValue && !availableIcons.find(i => i.value === iconValue)) {
        // It's an emoji, find the value
        const iconOption = availableIcons.find(i => i.emoji === iconValue);
        iconValue = iconOption?.value || '';
      }
      setFormData({
        name: room.name,
        description: room.description || '',
        icon: iconValue,
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
        // Update existing room - only include defined values
        const updateData: any = {
          name: formData.name,
        };
        if (formData.description) {
          updateData.description = formData.description;
        }
        if (formData.icon) {
          updateData.icon = formData.icon;
        }
        await updateDoc(doc(db, 'rooms', editingRoom.id), updateData);
      } else {
        // Add new room
        await addDoc(collection(db, 'rooms'), {
          projectId,
          name: formData.name,
          description: formData.description || '',
          icon: formData.icon || '',
          type: 'OTHER',
          status: 'NOT_STARTED',
          isUsable: false,
          createdAt: new Date(),
        });
      }
      await fetchData();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving room:', error);
      alert('שגיאה בשמירת החדר');
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק חדר זה?')) {
      try {
        await deleteDoc(doc(db, 'rooms', roomId));
        await fetchData();
      } catch (error) {
        console.error('Error deleting room:', error);
        alert('שגיאה במחיקת החדר');
      }
    }
  };

  const handleOpenTaskDialog = (roomId: string, taskTypeName: string, task?: any) => {
    setEditingTask({ roomId, taskTypeName, task });
    if (task) {
      // Find the full task object from Firebase to get autoUpdateStatus
      const fullTask = tasks.find(t => t.roomId === roomId && t.category === taskTypeName);
      setTaskFormData({
        description: fullTask?.description || task.description || '',
        status: task.status || 'NOT_STARTED',

        autoUpdateStatus: (fullTask as any)?.autoUpdateStatus !== undefined ? (fullTask as any).autoUpdateStatus : true,
      });
    } else {
      // בדוק אם יש משימה מוסתרת
      const hiddenTask = tasks.find(t => t.roomId === roomId && t.category === taskTypeName && t.status === 'NOT_RELEVANT');
      if (hiddenTask) {
        if (window.confirm('יש משימה מוסתרת בחדר זה. האם להחזיר אותה?')) {
          setTaskFormData({
            description: hiddenTask.description || '',
            status: 'NOT_STARTED',
            autoUpdateStatus: (hiddenTask as any)?.autoUpdateStatus !== undefined ? (hiddenTask as any).autoUpdateStatus : true,
          });
        } else {
          setTaskFormData({
            description: '',
            status: 'NOT_STARTED',
            autoUpdateStatus: true,
          });
        }
      } else {
        setTaskFormData({
          description: '',
          status: 'NOT_STARTED',
          autoUpdateStatus: true,
        });
      }
    }
    setOpenTaskDialog(true);
  };

  const handleCloseTaskDialog = () => {
    setOpenTaskDialog(false);
    setEditingTask(null);
    setTaskFormData({
      description: '',
      status: 'NOT_STARTED',
      autoUpdateStatus: true,
    });
  };

  const handleSaveTask = async () => {
    if (!editingTask) return;

    const { roomId, taskTypeName, task: currentTask } = editingTask;

    try {
      if (currentTask) {
        // עדכון משימה קיימת
        const taskDocRef = doc(db, 'tasks', currentTask.id);
        await updateDoc(taskDocRef, {
          status: taskFormData.status as Task['status'],
          description: taskFormData.description,
          updatedAt: new Date(),
        });

        // עדכון הסטייט המקומי
        setTasks(prevTasks => prevTasks.map(t =>
          t.id === currentTask.id
            ? {
                ...t,
                status: taskFormData.status as Task['status'],
                description: taskFormData.description,
                updatedAt: new Date(),
              }
            : t
        ));
      } else {
        // יצירת משימה חדשה
        const newTask = {
          projectId,
          roomId,
          category: taskTypeName,
          title: taskTypeName,
          status: taskFormData.status as Task['status'],
          description: taskFormData.description,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const docRef = await addDoc(collection(db, 'tasks'), newTask);
        
        setTasks(prevTasks => [...prevTasks, {
          ...newTask,
          id: docRef.id,
        } as Task]);
      }

      // רענון המסך
      await fetchData();
      handleCloseTaskDialog();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('שגיאה בשמירת המשימה');
    }
  };

  const handleDeleteTask = async () => {
    if (!editingTask) return;

    if (!window.confirm('האם להסתיר משימה זו מהחדר? (התא יראה "-" אבל העמודה תישאר)')) {
      return;
    }

    try {
      // מצא את המשימה ב-Firestore
      const existingTask = tasks.find(t => t.roomId === editingTask.roomId && t.category === editingTask.taskTypeName);
      
      if (existingTask) {
        // סמן את המשימה כלא רלוונטית - תישאר ב-DB אבל לא תוצג
        await updateDoc(doc(db, 'tasks', existingTask.id), {
          status: 'NOT_RELEVANT',
        });
        await fetchData();
      }
      
      handleCloseTaskDialog();
    } catch (error) {
      console.error('Error hiding task:', error);
      alert('שגיאה בהסתרת המשימה');
    }
  };

  const handleMoveRoom = async (event: React.MouseEvent, index: number, direction: 'up' | 'down') => {
    event.stopPropagation();
    // Note: Room ordering would require adding an 'order' field to Firestore
    // For now, rooms are ordered by creation date
    console.log('Room reordering not yet implemented with Firebase');
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
      'IN_PROGRESS': { icon: '⬤', color: '#ff9800', label: 'בביצוע' },
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
            <Box sx={{ minWidth: 800 }}>
              {/* Table Header */}
              <Box display="flex" sx={{ borderBottom: '2px solid #e0e0e0', backgroundColor: '#f5f5f5' }}>
                <Box sx={{ width: '200px', p: 2, borderLeft: '1px solid #e0e0e0', textAlign: 'center' }}>
                  <Typography variant="subtitle2" fontWeight="bold">חדר</Typography>
                </Box>
                {activeCategories.map((taskType) => (
                  <Box key={taskType.name} sx={{ flex: 1, p: 2, textAlign: 'center', borderLeft: '1px solid #e0e0e0', minWidth: '140px' }}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                      <Typography sx={{ fontSize: 18 }}>{taskType.icon}</Typography>
                      <Typography variant="subtitle2" fontWeight="bold">{taskType.name}</Typography>
                    </Box>
                  </Box>
                ))}
                <Box sx={{ width: '140px', p: 2, textAlign: 'center', borderLeft: '1px solid #e0e0e0' }}>
                  <Typography variant="subtitle2" fontWeight="bold">פעולות</Typography>
                </Box>
              </Box>

              {/* Table Rows */}
              {rooms.map((room, index) => (
                <Box key={room.id} display="flex" sx={{ borderBottom: '1px solid #e0e0e0', '&:hover': { backgroundColor: '#fafafa' } }}>
                  {/* Room Name */}
                  <Box sx={{ width: '200px', p: 2, borderLeft: '1px solid #e0e0e0', overflow: 'hidden' }}>
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
                  {activeCategories.map((taskType) => {
                    const task = room.tasks[taskType.name];
                    const fullTask = task?.id ? tasks.find(t => t.id === task.id) : null;
                    const statusDisplay = getStatusDisplay(task);
                    const overdue = isOverdue(task);

                    return (
                      <Box 
                        key={taskType.name}
                        onClick={() => handleOpenTaskDialog(room.id, taskType.name, task)}
                        sx={{ 
                          flex: 1, 
                          p: 2, 
                          borderLeft: '1px solid #e0e0e0',
                          minWidth: '140px',
                          backgroundColor: overdue ? '#ffebee' : 'transparent',
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: overdue ? '#ffcdd2' : '#f5f5f5',
                          }
                        }}
                      >
                        {task ? (
                          <Tooltip 
                            title={fullTask?.description || task?.description || ''} 
                            arrow
                            placement="top"
                          >
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
                                <Typography variant="caption" display="block" color="text.secondary" textAlign="center">
                                  {task.startDate}
                                </Typography>
                              )}
                              {task.endDate && (
                                <Typography 
                                  variant="caption" 
                                  display="block" 
                                  textAlign="center"
                                  sx={{ color: overdue ? '#d32f2f' : 'text.secondary', fontWeight: overdue ? 'bold' : 'normal' }}
                                >
                                  → {task.endDate}
                                </Typography>
                              )}
                            </Box>
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" color="text.disabled" textAlign="center">
                            —
                          </Typography>
                        )}
                      </Box>
                    );
                  })}

                  {/* Actions */}
                  <Box sx={{ width: '140px', p: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 0.5, borderLeft: '1px solid #e0e0e0' }}>
                    <Box display="flex" gap={0.5}>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(room)}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteRoom(room.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Box display="flex" gap={0.5}>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMoveRoom(e, index, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUpwardIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMoveRoom(e, index, 'down')}
                        disabled={index === rooms.length - 1}
                      >
                        <ArrowDownwardIcon fontSize="small" />
                      </IconButton>
                    </Box>
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
                label="תיאור"
                fullWidth
                value={taskFormData.description}
                onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                placeholder="לדוגמא: התקנת פרקט"
              />
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
                label="תיאור"
                fullWidth
                multiline
                rows={3}
                value={taskFormData.description}
                onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', px: 1 }}>
              <Box>
                {editingTask?.task && (
                  <Button 
                    onClick={handleDeleteTask}
                    color="error"
                    startIcon={<DeleteIcon />}
                  >
                    מחק מהחדר
                  </Button>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button onClick={handleCloseTaskDialog}>
                  ביטול
                </Button>
                <Button
                  onClick={handleSaveTask}
                  variant="contained"
                >
                  שמור
                </Button>
              </Box>
            </Box>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}
