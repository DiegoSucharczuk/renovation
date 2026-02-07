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
  const [rooms, setRooms] = useState(mockRoomsWithTasks);
  const [taskCategories, setTaskCategories] = useState(getTaskCategories());
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
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
    // Reload task categories (in case they were updated on tasks page)
    setTaskCategories(getTaskCategories());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    // Simulate data loading
    setTimeout(() => setLoading(false), 500);
  }, [user, router, mounted]);

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

  const handleSaveRoom = () => {
    if (editingRoom) {
      // Update existing room
      setRooms(rooms.map(room => 
        room.id === editingRoom.id 
          ? { ...room, ...formData }
          : room
      ));
    } else {
      // Add new room
      const newRoom = {
        id: Date.now().toString(),
        ...formData,
        tasks: {} as any, // Empty tasks object for new room
        progress: 0,
        tasksCount: 0,
      };
      setRooms([...rooms, newRoom]);
    }
    handleCloseDialog();
  };

  const handleDeleteRoom = (roomId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק חדר זה?')) {
      setRooms(rooms.filter(room => room.id !== roomId));
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
    } else {
      setTaskFormData({
        status: 'NOT_STARTED',
        progress: 0,
        startDate: '',
        endDate: '',
      });
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
  };

  const handleSaveTask = () => {
    if (!editingTask) return;

    // Auto-calculate status based on dates and progress
    let finalStatus = taskFormData.status;
    let finalProgress = taskFormData.progress;
    const today = new Date();
    const startDate = taskFormData.startDate ? new Date(taskFormData.startDate) : null;
    
    // Validation: if status is DONE, progress must be 100%
    if (taskFormData.status === 'DONE' && taskFormData.progress < 100) {
      alert('לא ניתן לסמן משימה כהושלם אם האחוז ביצוע הוא פחות מ-100%');
      return;
    }
    
    // Only auto-update if not manually set to BLOCKED
    if (taskFormData.status !== 'BLOCKED') {
      if (taskFormData.progress >= 100) {
        finalStatus = 'DONE';
        finalProgress = 100;
      } else if (startDate && today >= startDate && taskFormData.progress > 0) {
        finalStatus = 'IN_PROGRESS';
      } else if (!startDate || today < startDate) {
        finalStatus = 'NOT_STARTED';
      }
    }

    setRooms(rooms.map(room => {
      if (room.id === editingTask.roomId) {
        return {
          ...room,
          tasks: {
            ...room.tasks,
            [editingTask.taskTypeName]: { ...taskFormData, status: finalStatus, progress: finalProgress },
          }
        };
      }
      return room;
    }));
    handleCloseTaskDialog();
  };

  const handleMoveRoom = (event: React.MouseEvent, index: number, direction: 'up' | 'down') => {
    event.stopPropagation();
    const newRooms = [...rooms];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newRooms.length) return;
    
    [newRooms[index], newRooms[targetIndex]] = [newRooms[targetIndex], newRooms[index]];
    setRooms(newRooms);
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
          <Typography variant="h4">
            {hebrewLabels.rooms}
          </Typography>
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
                {taskCategories.map((taskType) => (
                  <Box key={taskType.name} sx={{ flex: 1, p: 2, textAlign: 'center', borderLeft: '1px solid #e0e0e0', minWidth: '140px' }}>
                    <Tooltip 
                      title={taskType.description || ''}
                      arrow 
                      placement="top"
                      componentsProps={{
                        tooltip: {
                          sx: {
                            direction: 'rtl',
                            textAlign: 'right',
                            maxWidth: '300px',
                            whiteSpace: 'pre-wrap',
                            '& *': {
                              direction: 'rtl',
                              textAlign: 'right',
                            }
                          }
                        },
                        popper: {
                          sx: {
                            direction: 'rtl !important',
                          }
                        }
                      }}
                    >
                      <Box display="flex" alignItems="center" justifyContent="center" gap={0.5} sx={{ cursor: taskType.description ? 'help' : 'default' }}>
                        <Typography sx={{ fontSize: 18 }}>{taskType.icon}</Typography>
                        <Typography variant="subtitle2" fontWeight="bold">{taskType.name}</Typography>
                      </Box>
                    </Tooltip>
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
                  {taskCategories.map((taskType) => {
                    const task = room.tasks[taskType.name];
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
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseTaskDialog}>
              ביטול
            </Button>
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
