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
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { hebrewLabels } from '@/lib/labels';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, getDoc } from 'firebase/firestore';
import type { Project, Room, Task } from '@/types';

// Available icons for rooms
const availableIcons = [
  { name: 'אמבטיה', emoji: '🛁' },
  { name: 'חדר איפור', emoji: '💄' },
  { name: 'חדר עבודה', emoji: '💼' },
  { name: 'חדר ילדים', emoji: '👶' },
  { name: 'חדר כביסה', emoji: '🧺' },
  { name: 'חדר משפחה', emoji: '👨‍👩‍👧‍👦' },
  { name: 'חדר שינה', emoji: '🛏️' },
  { name: 'כניסה/מסדרון', emoji: '🚪' },
  { name: 'מזווה', emoji: '🍽️' },
  { name: 'מחסן', emoji: '📦' },
  { name: 'מטבח', emoji: '👨‍🍳' },
  { name: 'מרפסת', emoji: '🌿' },
  { name: 'מרפסת שירות', emoji: '👕' },
  { name: 'סלון', emoji: '🛋️' },
  { name: 'פינת אוכל', emoji: '🍽️' },
  { name: 'שירותים', emoji: '🚽' },
].sort((a, b) => a.name.localeCompare(b.name, 'he'));

export default function RoomsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { user } = useAuth();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [rooms, setRooms] = useState<(Room & { icon?: string })[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRoom, setEditingRoom] = useState<(Room & { icon?: string }) | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'OTHER' as Room['type'],
    icon: '',
    status: 'NOT_STARTED' as Room['status'],
    isUsable: false,
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      try {
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
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        } as unknown as Room & { icon?: string }));
        setRooms(roomsData);

        // טעינת משימות
        const tasksQuery = query(collection(db, 'tasks'), where('projectId', '==', projectId));
        const tasksSnapshot = await getDocs(tasksQuery);
        const tasksData = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as unknown as Task));
        setTasks(tasksData);

        console.log('Loaded rooms:', roomsData.length, 'tasks:', tasksData.length);
      } catch (error) {
        console.error('Error fetching rooms:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, router, projectId]);

  const handleOpenDialog = (room?: Room & { icon?: string }) => {
    if (room) {
      setEditingRoom(room);
      setFormData({
        name: room.name,
        type: room.type,
        icon: room.icon || '',
        status: room.status,
        isUsable: room.isUsable,
      });
    } else {
      setEditingRoom(null);
      setFormData({
        name: '',
        type: 'OTHER',
        icon: '',
        status: 'NOT_STARTED',
        isUsable: false,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingRoom(null);
  };

  const handleSaveRoom = async () => {
    try {
      if (editingRoom) {
        // Update existing room
        await updateDoc(doc(db, 'rooms', editingRoom.id), {
          ...formData,
          updatedAt: new Date(),
        });
        setRooms(rooms.map(r => 
          r.id === editingRoom.id 
            ? { ...r, ...formData, updatedAt: new Date() }
            : r
        ));
      } else {
        // Add new room
        const newRoom = {
          projectId,
          ...formData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const docRef = await addDoc(collection(db, 'rooms'), newRoom);
        setRooms([...rooms, { id: docRef.id, ...newRoom } as Room & { icon?: string }]);
      }
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving room:', error);
      alert('שגיאה בשמירת החדר');
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק חדר זה? כל המשימות המשוייכות יישארו אבל לא יהיו משוייכות לחדר.')) {
      try {
        await deleteDoc(doc(db, 'rooms', roomId));
        setRooms(rooms.filter(r => r.id !== roomId));
      } catch (error) {
        console.error('Error deleting room:', error);
        alert('שגיאה במחיקת החדר');
      }
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

  const typeLabels: Record<Room['type'], string> = {
    BEDROOM: 'חדר שינה',
    BATHROOM: 'חדר אמבטיה',
    KITCHEN: 'מטבח',
    LIVING_ROOM: 'סלון',
    OTHER: 'אחר',
  };

  const statusLabels: Record<Room['status'], string> = {
    NOT_STARTED: 'לא התחיל',
    IN_PROGRESS: 'בביצוע',
    BLOCKED: 'חסום',
    DONE: 'הושלם',
  };

  const statusColors: Record<Room['status'], 'default' | 'primary' | 'error' | 'success'> = {
    NOT_STARTED: 'default',
    IN_PROGRESS: 'primary',
    BLOCKED: 'error',
    DONE: 'success',
  };

  // Calculate room progress based on tasks
  const getRoomProgress = (roomId: string) => {
    const roomTasks = tasks.filter(t => t.roomId === roomId);
    if (roomTasks.length === 0) return 0;
    const completedTasks = roomTasks.filter(t => t.status === 'DONE').length;
    return Math.round((completedTasks / roomTasks.length) * 100);
  };

  const getRoomTasksCount = (roomId: string) => {
    return tasks.filter(t => t.roomId === roomId).length;
  };

  return (
    <DashboardLayout projectId={projectId} project={project || undefined}>
      <Box sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">
            {hebrewLabels.rooms}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            הוספת חדר
          </Button>
        </Box>

        {/* Rooms Table */}
        <TableContainer component={Card}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>חדר</TableCell>
                <TableCell>סוג</TableCell>
                <TableCell>סטטוס</TableCell>
                <TableCell>משימות</TableCell>
                <TableCell>התקדמות</TableCell>
                <TableCell>ניתן לשימוש</TableCell>
                <TableCell align="center">פעולות</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body1" color="text.secondary" py={3}>
                      אין חדרים להצגה. לחץ על "הוספת חדר" כדי להתחיל.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rooms.map((room) => {
                  const progress = getRoomProgress(room.id);
                  const tasksCount = getRoomTasksCount(room.id);

                  return (
                    <TableRow key={room.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {room.icon && (
                            <Typography fontSize={24}>{room.icon}</Typography>
                          )}
                          <Typography fontWeight="medium">{room.name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{typeLabels[room.type]}</TableCell>
                      <TableCell>
                        <Chip
                          label={statusLabels[room.status]}
                          color={statusColors[room.status]}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{tasksCount}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 150 }}>
                          <Box sx={{ flex: 1 }}>
                            <LinearProgress variant="determinate" value={progress} />
                          </Box>
                          <Typography variant="body2" sx={{ minWidth: 40 }}>
                            {progress}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={room.isUsable ? 'כן' : 'לא'}
                          color={room.isUsable ? 'success' : 'default'}
                          size="small"
                          variant={room.isUsable ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(room)}
                          title="עריכה"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteRoom(room.id)}
                          title="מחיקה"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

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
                label="בחר אייקון"
                fullWidth
                select
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              >
                <MenuItem value="">ללא אייקון</MenuItem>
                {availableIcons.map((option) => (
                  <MenuItem key={option.emoji} value={option.emoji}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography fontSize={20}>{option.emoji}</Typography>
                      <Typography>{option.name}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="סוג החדר"
                fullWidth
                select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as Room['type'] })}
              >
                <MenuItem value="BEDROOM">חדר שינה</MenuItem>
                <MenuItem value="BATHROOM">חדר אמבטיה</MenuItem>
                <MenuItem value="KITCHEN">מטבח</MenuItem>
                <MenuItem value="LIVING_ROOM">סלון</MenuItem>
                <MenuItem value="OTHER">אחר</MenuItem>
              </TextField>

              <TextField
                label="סטטוס"
                fullWidth
                select
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as Room['status'] })}
              >
                <MenuItem value="NOT_STARTED">לא התחיל</MenuItem>
                <MenuItem value="IN_PROGRESS">בביצוע</MenuItem>
                <MenuItem value="BLOCKED">חסום</MenuItem>
                <MenuItem value="DONE">הושלם</MenuItem>
              </TextField>

              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="body2">ניתן לשימוש?</Typography>
                <Button
                  variant={formData.isUsable ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => setFormData({ ...formData, isUsable: !formData.isUsable })}
                >
                  {formData.isUsable ? 'כן' : 'לא'}
                </Button>
              </Box>
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
              {editingRoom ? 'שמירה' : 'הוספה'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}
