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
  Select,
  OutlinedInput,
  InputLabel,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import RefreshIcon from '@mui/icons-material/Refresh';
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
  { value: 'WAITING', label: 'בהמתנה', color: 'warning' },
  { value: 'DONE', label: 'הושלם', color: 'success' },
  { value: 'BLOCKED', label: 'חסום', color: 'error' },
];

// Format date from YYYY-MM-DD to DD-MM-YYYY
const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}-${month}-${year}`;
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
  const [highlightedStatus, setHighlightedStatus] = useState<string | null>(null);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

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
      const roomsSnapshot = await getDocs(roomsQuery);
      const roomsData = roomsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })).sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999));

      // Load tasks
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('projectId', '==', projectId)
      );
      const tasksSnapshot = await getDocs(tasksQuery);
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
        const roomTasks: Record<string, any[]> = {};
        categories.forEach(category => {
          const matchingTasks = tasksData.filter(t => t.roomId === room.id && t.category === category);
          if (matchingTasks.length > 0) {
            roomTasks[category] = matchingTasks.map(task => ({
              ...task,
              status: task.status || 'NOT_STARTED',
            }));
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

    // Validation: start date cannot be after end date
    if (taskFormData.startDate && taskFormData.endDate) {
      const startDate = new Date(taskFormData.startDate);
      const endDate = new Date(taskFormData.endDate);
      if (startDate > endDate) {
        alert('תאריך התחלה לא יכול להיות מאוחר יותר מתאריך הסיום');
        return;
      }
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
      'WAITING': { icon: '⏸', color: '#ff9800', label: 'ממתין' },
      'BLOCKED': { icon: '⚠', color: '#f44336', label: 'חסום' },
      'NOT_STARTED': { icon: '○', color: '#9e9e9e', label: 'לא התחיל' },
      'SHOULD_START': { icon: '❗', color: '#ff5722', label: 'צריך להתחיל' },
    };
    
    // בדיקה אם תאריך ההתחלה עבר אבל המשימה עדיין לא התחילה
    if (task.status === 'NOT_STARTED' && task.startDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // איפוס שעות להשוואה מדויקת
      const startDate = new Date(task.startDate);
      startDate.setHours(0, 0, 0, 0);
      
      // אם תאריך ההתחלה עבר או הוא היום
      if (today >= startDate) {
        return icons['SHOULD_START'];
      }
      
      // אם יש תאריך אבל עוד לא הגיע
      return icons['WAITING'];
    }
    
    // משימה NOT_STARTED עם תאריך סיום בלבד = בהמתנה
    if (task.status === 'NOT_STARTED' && task.endDate) {
      return icons['WAITING'];
    }
    
    return icons[task.status] || icons['NOT_STARTED'];
  };

  const isOverdue = (task: any) => {
    if (!task || !task.endDate || task.status === 'DONE') return false;
    const today = new Date();
    const endDate = new Date(task.endDate);
    return today > endDate;
  };

  const isInProgressOverdue = (task: any) => {
    if (!task || !task.endDate || task.status !== 'IN_PROGRESS') return false;
    const today = new Date();
    const endDate = new Date(task.endDate);
    return today > endDate;
  };

  const handleStatusFilter = (status: string) => {
    const newHighlightedStatus = highlightedStatus === status ? null : status;
    setHighlightedStatus(newHighlightedStatus);
  };

  const getHighlightColor = (task: any) => {
    if (!task) return 'transparent';
    if (!highlightedStatus) return 'transparent';
    
    // בדיקת התאמה לסטטוס שנבחר
    if (highlightedStatus === 'DONE' && task.status === 'DONE') {
      return '#e8f5e9'; // ירוק בהיר
    }
    if (highlightedStatus === 'IN_PROGRESS' && task.status === 'IN_PROGRESS' && !isInProgressOverdue(task)) {
      return '#fff9c4'; // צהוב בהיר
    }
    if (highlightedStatus === 'WAITING') {
      // משימה בהמתנה
      if (task.status === 'WAITING') return '#ffe0b2';
      if (task.status === 'NOT_STARTED' && (task.startDate || task.endDate)) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = task.startDate ? new Date(task.startDate) : null;
        if (startDate) {
          startDate.setHours(0, 0, 0, 0);
          if (today < startDate) return '#ffe0b2'; // עדיין לא הגיע הזמן
        } else {
          return '#ffe0b2';
        }
      }
    }
    if (highlightedStatus === 'NOT_STARTED') {
      // משימה לא התחילה (ללא תאריכים)
      if (task.status === 'NOT_STARTED' && !task.startDate && !task.endDate && (!task.progress || task.progress === 0)) {
        return '#f5f5f5'; // אפור בהיר
      }
    }
    if (highlightedStatus === 'BLOCKED' && task.status === 'BLOCKED') {
      return '#ffebee'; // אדום בהיר
    }
    if (highlightedStatus === 'OVERDUE' && isOverdue(task) && !isInProgressOverdue(task)) {
      return '#ffccbc'; // כתום-אדום בהיר
    }
    if (highlightedStatus === 'IN_PROGRESS_OVERDUE') {
      if (isInProgressOverdue(task)) {
        return '#ffcdd2'; // אדום בהיר יותר
      }
    }
    
    return 'transparent';
  };

  // Calculate statistics
  const completedTasks = tasks.filter(t => t.roomId && t.status === 'DONE').length;
  const inProgressTasks = tasks.filter(t => t.roomId && t.status === 'IN_PROGRESS').length;
  
  // משימה בהמתנה = WAITING או NOT_STARTED עם תאריכים שעדיין לא הגיעו
  const waitingTasks = tasks.filter(t => {
    if (!t.roomId) return false;
    if (t.status === 'WAITING') return true;
    if (t.status === 'NOT_STARTED' && (t.startDate || t.endDate)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = t.startDate ? new Date(t.startDate) : null;
      
      // אם יש תאריך התחלה - בדוק אם עוד לא הגיע
      if (startDate) {
        startDate.setHours(0, 0, 0, 0);
        if (today < startDate) return true; // תאריך לא הגיע = בהמתנה
      } else if (t.endDate) {
        // יש רק תאריך סיום (בלי התחלה) = בהמתנה
        return true;
      }
    }
    return false;
  }).length;
  
  // Debug: הצג משימות בהמתנה בקונסול
  React.useEffect(() => {
    const waiting = tasks.filter(t => {
      if (!t.roomId) return false;
      if (t.status === 'WAITING') return true;
      if (t.status === 'NOT_STARTED' && (t.startDate || t.endDate)) return true;
      return false;
    });
    
    console.log('🕐 משימות בהמתנה:', waiting.length, waiting.map(t => {
      const room = rooms.find(r => r.id === t.roomId);
      const statusDisplay = getStatusDisplay(t);
      return {
        title: t.title,
        category: t.category,
        status: t.status,
        startDate: t.startDate,
        endDate: t.endDate,
        roomName: room?.name || 'לא ידוע',
        displayIcon: statusDisplay.icon,
        displayLabel: statusDisplay.label
      };
    }));
  }, [tasks, rooms]);
  
  // משימה לא התחילה = NOT_STARTED + אין progress (או 0) + אין תאריכים
  const notStartedTasks = tasks.filter(t => 
    t.roomId && 
    t.status === 'NOT_STARTED' && 
    (!t.progress || t.progress === 0) &&
    !t.startDate && 
    !t.endDate
  ).length;
  
  const blockedTasks = tasks.filter(t => t.roomId && t.status === 'BLOCKED').length;
  const overdueTasks = tasks.filter(t => t.roomId && isOverdue(t)).length;
  const inProgressOverdueTasks = tasks.filter(t => t.roomId && isInProgressOverdue(t)).length;
  const totalTasks = tasks.filter(t => t.roomId).length;
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Filter logic
  const filteredRooms = rooms.filter(room => {
    // Room filter
    if (selectedRooms.length > 0 && !selectedRooms.includes(room.id)) {
      return false;
    }
    
    // Status filter - show room if ANY task matches ANY selected status
    if (selectedStatuses.length > 0) {
      const hasMatchingStatus = Object.values(room.tasks).some((tasks: any) => 
        Array.isArray(tasks) && tasks.some((task: any) => task && selectedStatuses.includes(task.status))
      );
      if (!hasMatchingStatus) return false;
    }
    
    return true;
  });

  // Category filter
  const filteredCategories = selectedCategories.length > 0 
    ? taskCategories.filter(cat => selectedCategories.includes(cat))
    : taskCategories;

  // Reset filters
  const handleResetFilters = () => {
    setSelectedRooms([]);
    setSelectedStatuses([]);
    setSelectedCategories([]);
  };

  // Quick filters
  const handleShowActive = () => {
    setSelectedStatuses(['IN_PROGRESS']);
    setSelectedRooms([]);
    setSelectedCategories([]);
  };

  const handleShowProblems = () => {
    const problematicRooms = rooms.filter(room => 
      Object.values(room.tasks).some((tasks: any) => 
        Array.isArray(tasks) && tasks.some((task: any) => task && (task.status === 'BLOCKED' || isOverdue(task) || isInProgressOverdue(task)))
      )
    ).map(r => r.id);
    setSelectedRooms(problematicRooms);
    setSelectedStatuses([]);
    setSelectedCategories([]);
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
      <Box sx={{ overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} sx={{ px: 3, pr: 3, flexShrink: 0 }}>
          <Typography variant="h3" fontWeight="bold">
            {hebrewLabels.rooms}
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
              {hebrewLabels.addRoom}
            </Button>
          </Box>
        </Box>

        {/* Statistics Grid */}
        <Box sx={{ px: 3, pr: 3, mb: 2, flexShrink: 0 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
            {/* Total Tasks Card */}
            <Box sx={{ flex: '0 0 calc(11% - 4px)', minWidth: '90px', maxWidth: '125px' }}>
              <Card 
                sx={{
                  height: '100%',
                  aspectRatio: '1 / 1',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  boxShadow: 3,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 5,
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <Typography variant="body2" display="block" fontWeight={600} sx={{ opacity: 0.9, mb: 1 }}>
                    סה"כ משימות
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {totalTasks}
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {/* Completed Card */}
            <Box sx={{ flex: '0 0 calc(11% - 4px)', minWidth: '90px', maxWidth: '125px' }}>
              <Card 
                onClick={() => handleStatusFilter('DONE')}
                sx={{
                  height: '100%',
                  aspectRatio: '1 / 1',
                  background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                  color: 'white',
                  boxShadow: 3,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 5,
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <Typography variant="body2" display="block" fontWeight={600} sx={{ opacity: 0.95, mb: 1 }}>
                    הושלמו ✓
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {completedTasks}
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {/* In Progress Card */}
            <Box sx={{ flex: '0 0 calc(11% - 4px)', minWidth: '90px', maxWidth: '125px' }}>
              <Card 
                onClick={() => handleStatusFilter('IN_PROGRESS')}
                sx={{
                  height: '100%',
                  aspectRatio: '1 / 1',
                  background: 'linear-gradient(135deg, #FFD700 0%, #FFC700 100%)',
                  color: '#333',
                  boxShadow: 3,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 5,
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <Typography variant="body2" display="block" fontWeight={600} sx={{ opacity: 0.95, mb: 1 }}>
                    בביצוע ●
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {inProgressTasks}
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {/* Waiting Card */}
            <Box sx={{ flex: '0 0 calc(11% - 4px)', minWidth: '90px', maxWidth: '125px' }}>
              <Card 
                onClick={() => handleStatusFilter('WAITING')}
                sx={{
                  height: '100%',
                  aspectRatio: '1 / 1',
                  background: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
                  color: 'white',
                  boxShadow: 3,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 5,
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <Typography variant="body2" display="block" fontWeight={600} sx={{ opacity: 0.95, mb: 1 }}>
                    בהמתנה ⏸
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {waitingTasks}
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {/* Not Started Card */}
            <Box sx={{ flex: '0 0 calc(11% - 4px)', minWidth: '90px', maxWidth: '125px' }}>
              <Card 
                onClick={() => handleStatusFilter('NOT_STARTED')}
                sx={{
                  height: '100%',
                  aspectRatio: '1 / 1',
                  background: 'linear-gradient(135deg, #9e9e9e 0%, #bdbdbd 100%)',
                  color: 'white',
                  boxShadow: 3,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 5,
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <Typography variant="body2" display="block" fontWeight={600} sx={{ opacity: 0.95, mb: 1 }}>
                    לא התחילו ○
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {notStartedTasks}
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {/* Blocked Card */}
            {blockedTasks > 0 && (
              <Box sx={{ flex: '0 0 calc(11% - 4px)', minWidth: '90px', maxWidth: '125px' }}>
                <Card 
                  onClick={() => handleStatusFilter('BLOCKED')}
                  sx={{
                    height: '100%',
                    aspectRatio: '1 / 1',
                    background: 'linear-gradient(135deg, #f44336 0%, #e57373 100%)',
                    color: 'white',
                    boxShadow: 3,
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 5,
                    }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', py: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <Typography variant="body2" display="block" fontWeight={600} sx={{ opacity: 0.95, mb: 1 }}>
                      חסומות ⚠
                    </Typography>
                    <Typography variant="h3" fontWeight="bold">
                      {blockedTasks}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* Overdue Card */}
            {overdueTasks > 0 && (
              <Box sx={{ flex: '0 0 calc(11% - 4px)', minWidth: '90px', maxWidth: '125px' }}>
                <Card 
                  onClick={() => handleStatusFilter('OVERDUE')}
                  sx={{
                    height: '100%',
                    aspectRatio: '1 / 1',
                    background: 'linear-gradient(135deg, #ff5722 0%, #ff7043 100%)',
                    color: 'white',
                    boxShadow: 3,
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 5,
                    }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', py: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <Typography variant="body2" display="block" fontWeight={600} sx={{ opacity: 0.95, mb: 1 }}>
                      באיחור ❗
                    </Typography>
                    <Typography variant="h3" fontWeight="bold">
                      {overdueTasks}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* In Progress Overdue Card */}
            {inProgressOverdueTasks > 0 && (
              <Box sx={{ flex: '0 0 calc(11% - 4px)', minWidth: '90px', maxWidth: '125px' }}>
                <Card 
                  onClick={() => handleStatusFilter('IN_PROGRESS_OVERDUE')}
                  sx={{
                    height: '100%',
                    aspectRatio: '1 / 1',
                    background: 'linear-gradient(135deg, #d32f2f 0%, #ef5350 100%)',
                    color: 'white',
                    boxShadow: 3,
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 5,
                    }
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', py: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <Typography variant="body2" display="block" fontWeight={600} sx={{ opacity: 0.95, mb: 1 }}>
                      בביצוע - באיחור ⚠️
                    </Typography>
                    <Typography variant="h3" fontWeight="bold">
                      {inProgressOverdueTasks}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            )}

            {/* Completion Percentage Card */}
            <Box sx={{ flex: '0 0 calc(11% - 4px)', minWidth: '90px', maxWidth: '125px' }}>
              <Card 
                sx={{
                  height: '100%',
                  aspectRatio: '1 / 1',
                  background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                  color: 'white',
                  boxShadow: 3,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 5,
                  }
                }}
              >
                <CardContent sx={{ textAlign: 'center', py: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <Typography variant="body2" display="block" fontWeight={600} sx={{ opacity: 0.95, mb: 1 }}>
                    אחוז השלמה
                  </Typography>
                  <Typography variant="h3" fontWeight="bold">
                    {completionPercentage}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={completionPercentage} 
                    sx={{
                      mt: 2,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: 'rgba(255, 255, 255, 0.3)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: '#4caf50',
                        borderRadius: 3,
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Box>

        {/* Matrix Table */}
        <Card
          sx={{
            mx: 3,
            mb: 1,
            position: 'relative',
            direction: 'ltr',
            boxShadow: 3,
            '&:hover': { boxShadow: 4 },
            transition: 'box-shadow 0.2s',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          <TableContainer
            sx={{
              overflowX: 'auto',
              overflowY: 'auto',
              direction: 'rtl',
              maxHeight: 'calc(100vh - 400px)',
              scrollbarWidth: 'thin',
              '&::-webkit-scrollbar': {
                width: 12,
                height: 12,
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#f1f1f1',
                borderRadius: 4,
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#888',
                borderRadius: 4,
                '&:hover': {
                  backgroundColor: '#555',
                },
              },
            }}
          >
            <Box sx={{ direction: 'ltr' }}>
              <Table stickyHeader sx={{ direction: 'ltr', tableLayout: 'fixed', minWidth: 'max-content' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 200, minWidth: 200, textAlign: 'center', backgroundColor: '#f5f5f5', borderBottom: '2px solid #e0e0e0', borderRight: '1px solid #e0e0e0' }}>
                        <Typography variant="subtitle2" fontWeight="bold">חדר</Typography>
                      </TableCell>
                      {filteredCategories.map((category) => (
                        <TableCell key={category} sx={{ width: 140, minWidth: 140, textAlign: 'center', backgroundColor: '#f5f5f5', borderBottom: '2px solid #e0e0e0', borderRight: '1px solid #e0e0e0' }}>
                          <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                            <Typography sx={{ fontSize: 18 }}>
                              {taskCategoryIcons[category] || '📝'}
                            </Typography>
                            <Typography variant="subtitle2" fontWeight="bold">
                              {category}
                            </Typography>
                          </Box>
                        </TableCell>
                      ))}
                      <TableCell sx={{ width: 140, minWidth: 140, textAlign: 'center', backgroundColor: '#f5f5f5', borderBottom: '2px solid #e0e0e0', borderRight: '1px solid #e0e0e0' }}>
                        <Typography variant="subtitle2" fontWeight="bold">פעולות</Typography>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRooms.map((room, index) => (
                      <TableRow
                        key={room.id}
                        sx={{
                          '&:hover': {
                            backgroundColor: '#f8f9fa',
                          },
                          transition: 'background-color 0.2s',
                        }}
                      >
                        {/* Room Name Cell */}
                        <TableCell sx={{ p: 1.5, overflow: 'hidden', borderRight: '1px solid #e0e0e0' }}>
                    <Box display="flex" flexDirection="row-reverse" alignItems="center" justifyContent="flex-end" gap={1} mb={0.5}>
                      <Typography variant="body1" fontWeight="600" sx={{ wordBreak: 'break-word' }}>
                        {room.name}
                      </Typography>
                      {(room.icon ? iconMap[room.icon] : roomIcons[room.name]) && (
                        <Typography sx={{ fontSize: 24, flexShrink: 0 }}>
                          {room.icon ? iconMap[room.icon] : roomIcons[room.name]}
                        </Typography>
                      )}
                    </Box>
                    {room.description && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          fontSize: '0.7rem',
                          display: 'flex',
                          flexDirection: 'row-reverse',
                          justifyContent: 'flex-end',
                          wordBreak: 'break-word',
                          whiteSpace: 'normal',
                        }}
                      >
                        {room.description}
                      </Typography>
                    )}
                        </TableCell>

                        {/* Task Status Cells */}
                        {filteredCategories.map((category) => {
                          const tasksArr = room.tasks[category] || [];
                          const task = tasksArr[0] || null;
                          const statusDisplay = getStatusDisplay(task);
                          const overdue = isOverdue(task);
                          const inProgressOverdue = isInProgressOverdue(task);

                          return (
                            <Tooltip 
                              key={category}
                              title={task ? `${statusDisplay.label}${tasksArr.length > 1 ? ` (${tasksArr.length} משימות)` : ''}${task.updatedAt ? ' | עודכן: ' + formatDate(typeof task.updatedAt === 'string' ? task.updatedAt.split('T')[0] : (task.updatedAt instanceof Date ? task.updatedAt.toISOString().split('T')[0] : (task.updatedAt as any).toDate?.().toISOString().split('T')[0] || '')) : ''}` : 'אין משימה'}
                              arrow
                            >
                              <TableCell
                                onClick={() => handleOpenTaskDialog(room.id, category, task)}
                                sx={{
                                  p: 1.5,
                                  backgroundColor: (() => {
                                    if (!task) return 'transparent';
                                    
                                    // If a filter is active, use highlight colors
                                    if (highlightedStatus) {
                                      const highlightColor = getHighlightColor(task);
                                      if (highlightColor !== 'transparent') {
                                        return highlightColor;
                                      }
                                      // If filter is active but this task doesn't match, make it slightly faded
                                      return 'rgba(255, 255, 255, 0.3)';
                                    }
                                    
                                    // Default colors for overdue (always visible)
                                    if (inProgressOverdue) return '#ffcdd2';
                                    if (overdue) return '#ffebee';
                                    return 'transparent';
                                  })(),
                                  cursor: 'pointer',
                                  '&:hover': {
                                    backgroundColor: inProgressOverdue ? '#ef9a9a' : (overdue ? '#ffcdd2' : '#e3f2fd'),
                                    transform: 'scale(1.02)',
                                  },
                                  transition: 'all 0.2s',
                                  textAlign: 'center',
                                  borderRight: '1px solid #e0e0e0',
                                }}
                              >
                                {task ? (
                                  <Box>
                                    {tasksArr.map((t: any, tIdx: number) => {
                                      const tStatus = getStatusDisplay(t);
                                      const tOverdue = isOverdue(t);
                                      const tInProgressOverdue = isInProgressOverdue(t);
                                      return (
                                        <Box key={tIdx} sx={{ mb: tIdx < tasksArr.length - 1 ? 0.5 : 0, pb: tIdx < tasksArr.length - 1 ? 0.5 : 0, borderBottom: tIdx < tasksArr.length - 1 ? '1px dashed #ccc' : 'none', cursor: 'pointer' }} onClick={(e) => { if (tIdx > 0) { e.stopPropagation(); handleOpenTaskDialog(room.id, category, t); } }}>
                                          <Box display="flex" alignItems="center" justifyContent="center" gap={0.5} mb={0.5}>
                                            <Typography
                                              sx={{
                                                fontSize: tasksArr.length > 1 ? '18px' : '24px',
                                                color: tStatus.color,
                                                lineHeight: 1,
                                                fontWeight: 'bold',
                                              }}
                                            >
                                              {tStatus.icon}
                                            </Typography>
                                            {tInProgressOverdue && (
                                              <Typography sx={{ fontSize: tasksArr.length > 1 ? '12px' : '16px' }}>⚠️</Typography>
                                            )}
                                            {t.progress > 0 && (
                                              <Typography sx={{ fontSize: '0.75rem', fontWeight: 'bold' }} color="primary">
                                                {t.progress}%
                                              </Typography>
                                            )}
                                          </Box>
                                          {t.endDate && (
                                            <Typography
                                              variant="caption"
                                              display="block"
                                              sx={{
                                                color: (tOverdue || tInProgressOverdue) ? '#d32f2f' : 'text.secondary',
                                                fontWeight: (tOverdue || tInProgressOverdue) ? 'bold' : 'normal',
                                                fontSize: '0.7rem',
                                              }}
                                            >
                                              {formatDate(t.endDate)}
                                            </Typography>
                                          )}
                                        </Box>
                                      );
                                    })}
                                  </Box>
                                ) : (
                                  <Typography variant="body2" color="text.disabled">—</Typography>
                                )}
                              </TableCell>
                            </Tooltip>
                          );
                        })}

                        {/* Actions Cell */}
                        <TableCell sx={{ p: 0.5, textAlign: 'center', borderRight: '1px solid #e0e0e0' }}>
                          <Box display="flex" justifyContent="center" alignItems="center" gap={0.25} flexWrap="wrap">
                            <Tooltip title="ערוך חדר">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDialog(room)}
                                color="primary"
                                sx={{
                                  p: 0.5,
                                  '&:hover': { backgroundColor: 'primary.light', color: 'white' },
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="מחק חדר">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteRoom(room.id)}
                                color="error"
                                sx={{
                                  p: 0.5,
                                  '&:hover': { backgroundColor: 'error.light', color: 'white' },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="הזז למעלה">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={(e) => handleMoveRoom(e, index, 'up')}
                                  disabled={index === 0}
                                  sx={{ p: 0.5 }}
                                >
                                  <ArrowUpwardIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="הזז למטה">
                              <span>
                                <IconButton
                                  size="small"
                                  sx={{ p: 0.5 }}
                                  onClick={(e) => handleMoveRoom(e, index, 'down')}
                                  disabled={index === filteredRooms.length - 1}
                                >
                                  <ArrowDownwardIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </TableContainer>
        </Card>

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
                    onChange={(e) => {
                      const values = e.target.value as string[];
                      // When a room name is toggled, include/exclude all room IDs with that name
                      const lastValue = values[values.length - 1];
                      if (lastValue && !selectedRooms.includes(lastValue)) {
                        // Adding: find the room name and add all IDs with that name
                        const room = rooms.find(r => r.id === lastValue);
                        if (room) {
                          const allIds = rooms.filter(r => r.name === room.name).map(r => r.id);
                          setSelectedRooms([...new Set([...selectedRooms, ...allIds])]);
                        }
                      } else {
                        // Removing: find the room name and remove all IDs with that name
                        const room = rooms.find(r => r.id === lastValue);
                        if (room) {
                          const allIds = rooms.filter(r => r.name === room.name).map(r => r.id);
                          setSelectedRooms(selectedRooms.filter(id => !allIds.includes(id)));
                        } else {
                          setSelectedRooms(values);
                        }
                      }
                    }}
                    input={<OutlinedInput label="חדרים" />}
                    renderValue={(selected) => 
                      selected.length === 0 ? 'כל החדרים' : `${selected.length} חדרים`
                    }
                  >
                    {(() => {
                      const seen = new Set<string>();
                      return rooms.filter(room => {
                        if (seen.has(room.name)) return false;
                        seen.add(room.name);
                        return true;
                      }).map((room) => {
                        const count = rooms.filter(r => r.name === room.name).length;
                        const allIds = rooms.filter(r => r.name === room.name).map(r => r.id);
                        const isChecked = allIds.some(id => selectedRooms.includes(id));
                        return (
                          <MenuItem key={room.id} value={room.id}>
                            <Checkbox checked={isChecked} />
                            <Box display="flex" alignItems="center" gap={1}>
                              {(room.icon ? iconMap[room.icon] : roomIcons[room.name]) && (
                                <Typography sx={{ fontSize: 18 }}>
                                  {room.icon ? iconMap[room.icon] : roomIcons[room.name]}
                                </Typography>
                              )}
                              <Typography>{room.name}{count > 1 ? ` (${count})` : ''}</Typography>
                            </Box>
                          </MenuItem>
                        );
                      });
                    })()}
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
                    {statusOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        <Checkbox checked={selectedStatuses.includes(option.value)} />
                        <Typography>{option.label}</Typography>
                      </MenuItem>
                    ))}
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
                    {taskCategories.map((category) => (
                      <MenuItem key={category} value={category}>
                        <Checkbox checked={selectedCategories.includes(category)} />
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography sx={{ fontSize: 18 }}>
                            {taskCategoryIcons[category] || '📝'}
                          </Typography>
                          <Typography>{category}</Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            {/* Quick Filter Buttons */}
            <Box display="flex" gap={1} mt={3} flexWrap="wrap">
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleShowActive}
                variant="outlined"
              >
                חדרים פעילים
              </Button>
              <Button
                size="small"
                color="warning"
                onClick={handleShowProblems}
                variant="outlined"
              >
                חדרים עם בעיות
              </Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              startIcon={<ClearIcon />}
              onClick={handleResetFilters}
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
