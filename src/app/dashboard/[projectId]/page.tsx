'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Alert,
  Chip,
  List,
  CircularProgress,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

// --- אייקונים ---
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PaidIcon from '@mui/icons-material/Paid';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import CelebrationIcon from '@mui/icons-material/Celebration';

import { doc, collection, query, where, getDocsFromServer, getDocFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectRole } from '@/hooks/useProjectRole';
import AccessDenied from '@/components/AccessDenied';
import type { Project, Room, Task } from '@/types';

interface Vendor {
  id: string;
  name: string;
  category: string;
  contractAmount: number;
  [key: string]: any;
}

interface Payment {
  id: string;
  vendorId: string;
  amount: number;
  status: string;
  date?: string;
  estimatedDate?: string;
  [key: string]: any;
}

export default function DashboardPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { user, firebaseUser } = useAuth();
  const router = useRouter();
  const { role, permissions, loading: roleLoading } = useProjectRole(projectId, firebaseUser?.uid || null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  const fetchData = useCallback(async () => {
    const isInitialLoad = loading;
    if (!isInitialLoad) setRefreshing(true);
    
    try {
        const projectDoc = await getDocFromServer(doc(db, 'projects', projectId));
        if (projectDoc.exists()) {
          setProject({
            id: projectDoc.id,
            ...projectDoc.data(),
            createdAt: projectDoc.data().createdAt?.toDate() || new Date(),
          } as Project);
        }

        const roomsQuery = query(collection(db, 'rooms'), where('projectId', '==', projectId));
        const roomsSnapshot = await getDocsFromServer(roomsQuery);
        const roomsData = roomsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date()),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt || new Date()),
          } as unknown as Room;
        });
        setRooms(roomsData);

        const tasksQuery = query(collection(db, 'tasks'), where('projectId', '==', projectId));
        const tasksSnapshot = await getDocsFromServer(tasksQuery);
        const tasksData = tasksSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date()),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt || new Date()),
          } as unknown as Task;
        });
        setTasks(tasksData);

        const vendorsQuery = query(collection(db, 'vendors'), where('projectId', '==', projectId));
        const vendorsSnapshot = await getDocsFromServer(vendorsQuery);
        const vendorsData = vendorsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Vendor));
        setVendors(vendorsData);

        const paymentsQuery = query(collection(db, 'payments'), where('projectId', '==', projectId));
        const paymentsSnapshot = await getDocsFromServer(paymentsQuery);
        const paymentsData = paymentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Payment));
        setPayments(paymentsData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }, [projectId, loading]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchData();

    let wasOutside = false;
    const handleBlur = () => { wasOutside = true; };
    const handleFocus = () => {
      if (wasOutside) {
        fetchData();
        wasOutside = false;
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, router, fetchData]);

  if (roleLoading || loading || !firebaseUser) {
    return (
      <DashboardLayout projectId={projectId} project={project || undefined}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  if (!role || !permissions) {
    return (
      <DashboardLayout projectId={projectId} project={project || undefined}>
        <AccessDenied message="אין לך הרשאה לצפות בפרויקט זה" />
      </DashboardLayout>
    );
  }

  const now = new Date();
  const isTaskOverdue = (task: Task) => {
    const endDateField = task.endPlanned || task.endDate || task.dueDate;
    if (!endDateField) return false;
    const endDate = endDateField instanceof Date ? endDateField : new Date(endDateField);
    return endDate < now;
  };

  const relevantTasks = tasks.filter(t => t.status !== 'NOT_RELEVANT');
  const totalTasks = relevantTasks.length;

  const completedTasksArr = relevantTasks.filter(t => t.status === 'DONE');
  const inProgressOnTimeArr = relevantTasks.filter(t => t.status === 'IN_PROGRESS' && !isTaskOverdue(t));
  const inProgressOverdueArr = relevantTasks.filter(t => t.status === 'IN_PROGRESS' && isTaskOverdue(t));
  const waitingTasksArr = relevantTasks.filter(t => t.status === 'WAITING');
  const blockedTasksArr = relevantTasks.filter(t => t.status === 'BLOCKED');
  const notStartedOnTimeArr = relevantTasks.filter(t => t.status === 'NOT_STARTED' && !isTaskOverdue(t));
  const overdueNotInProgressArr = relevantTasks.filter(t => t.status !== 'DONE' && t.status !== 'IN_PROGRESS' && isTaskOverdue(t));

  const tasksCompletedPercent = totalTasks > 0 ? (completedTasksArr.length / totalTasks) * 100 : 0;

  const roomsWithProgress = rooms.map(room => {
    const roomTasks = tasks.filter(t => t.roomId === room.id && t.status !== 'NOT_RELEVANT');
    const totalRoomTasks = roomTasks.length;
    const completedTasksCount = roomTasks.filter(t => t.status === 'DONE').length;
    const averageProgress = totalRoomTasks > 0 ? (completedTasksCount / totalRoomTasks) * 100 : 0;
    
    return {
      roomId: room.id,
      roomName: room.name,
      completedTasks: completedTasksCount,
      totalTasks: totalRoomTasks,
      progress: Math.round(averageProgress),
    };
  }).sort((a, b) => b.totalTasks - a.totalTasks);

  const budgetPlanned = project?.budgetPlanned || 0;
  const totalContracts = vendors.reduce((sum, vendor) => sum + (vendor.contractAmount || 0), 0);
  const totalPaid = payments.filter(p => p.status === 'שולם').reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPlanned = payments.filter(p => p.status === 'מתוכנן' || p.status === 'ממתין').reduce((sum, p) => sum + (p.amount || 0), 0);
  const budgetRemaining = budgetPlanned - totalPaid;
  const budgetUsedPercent = budgetPlanned > 0 ? (totalPaid / budgetPlanned) * 100 : 0;

  const budgetByCategory = vendors.reduce((acc, vendor) => {
    const category = vendor.category || 'אחר';
    const vendorPaymentsPaid = payments.filter(p => p.vendorId === vendor.id && p.status === 'שולם');
    const vendorPaymentsPending = payments.filter(p => p.vendorId === vendor.id && p.status === 'ממתין');
    const totalPaid = vendorPaymentsPaid.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalPending = vendorPaymentsPending.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalAmount = totalPaid + totalPending;
    
    if (!acc[category]) {
      acc[category] = { total: 0, paid: 0, pending: 0, count: 0 };
    }
    acc[category].total += totalAmount;
    acc[category].paid += totalPaid;
    acc[category].pending += totalPending;
    acc[category].count += 1;
    
    return acc;
  }, {} as Record<string, { total: number; paid: number; pending: number; count: number }>);

  const categoriesSorted = Object.entries(budgetByCategory)
    .sort((a, b) => b[1].total - a[1].total)
    .filter(([_, data]) => data.total > 0);

  const vendorsWithPayments = vendors
    .map(vendor => {
      const vendorPaymentsPaid = payments.filter(p => p.vendorId === vendor.id && p.status === 'שולם');
      const vendorPaymentsPending = payments.filter(p => p.vendorId === vendor.id && p.status === 'ממתין');
      const totalPaid = vendorPaymentsPaid.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalPending = vendorPaymentsPending.reduce((sum, p) => sum + (p.amount || 0), 0);
      return { 
        id: vendor.id,
        name: vendor.name,
        category: vendor.category,
        totalPaid, 
        totalPending,
        totalAmount: totalPaid + totalPending
      };
    })
    .filter(v => v.totalAmount > 0)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 5);

  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const shouldStartTasks = relevantTasks.filter(task => {
    if (task.status !== 'NOT_STARTED' || !task.startDate) return false;
    const startDateObj = typeof task.startDate === 'string' ? new Date(task.startDate) : task.startDate;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDateObj.setHours(0, 0, 0, 0);
    return startDateObj <= today;
  });

  const upcomingPayments = payments.filter(payment => {
    if (payment.status === 'שולם') return false;
    const paymentDateStr = (payment as any).estimatedDate || (payment as any).date;
    if (!paymentDateStr) return false;
    const paymentDate = typeof paymentDateStr === 'string' ? new Date(paymentDateStr) : paymentDateStr;
    return paymentDate >= now && paymentDate <= twoWeeksFromNow;
  });

  const recentlyCompletedTasks = completedTasksArr.filter(task => {
    const completedDate = task.endActual || task.updatedAt;
    if (!completedDate) return false;
    const date = completedDate instanceof Date ? completedDate : new Date(completedDate);
    return date >= weekAgo;
  });

  return (
    <DashboardLayout projectId={projectId} project={project || undefined} scrollable={true}>
      <Box 
        sx={{ 
          px: { xs: 2, md: 4 }, 
          pt: 4,
          pb: 10, // הריווח החשוב בתחתית העמוד שמונע מהתוכן להחתך
          backgroundColor: '#f4f7fe', 
          minHeight: '100vh', 
          fontFamily: 'inherit',
          overflowY: 'auto',
          '&::-webkit-scrollbar': { display: 'none' },
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
        }}
      >
        
        {/* ========== ZONE 1: HERO & OVERVIEW ========== */}
        <Box 
          sx={{ 
            mb: 4, 
            p: 4, 
            borderRadius: 4, 
            background: 'linear-gradient(135deg, #1976d2 0%, #115293 100%)',
            color: 'white',
            boxShadow: '0 10px 30px rgba(25, 118, 210, 0.3)',
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center'
          }}
        >
          <Box>
            <Typography variant="h3" fontWeight="800" gutterBottom sx={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
              {project?.name || 'טוען...'}
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              מבט על - סטטוס פרויקט והתקדמות
            </Typography>
          </Box>
          <Tooltip title="רענון נתונים">
            <IconButton 
              onClick={fetchData} 
              disabled={refreshing}
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                color: 'white', 
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
                width: 56, height: 56
              }}
            >
              <RefreshIcon fontSize="large" sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* KPI Cards Row */}
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, mb: 4 }}>
          <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">התקדמות משימות</Typography>
                  <Typography variant="h4" fontWeight="800" color="primary.main" sx={{ mt: 1 }}>
                    {tasksCompletedPercent.toFixed(0)}%
                  </Typography>
                </Box>
                <Box sx={{ p: 1.5, backgroundColor: 'primary.50', borderRadius: 2 }}>
                  <TrendingUpIcon color="primary" />
                </Box>
              </Box>
              <LinearProgress variant="determinate" value={tasksCompletedPercent} sx={{ height: 8, borderRadius: 4 }} />
            </CardContent>
          </Card>

          {permissions.canViewBudget && (
            <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">תקציב מתוכנן</Typography>
                    <Typography variant="h4" fontWeight="800" sx={{ mt: 1, color: '#333' }}>
                      ₪{budgetPlanned.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.5, backgroundColor: 'grey.100', borderRadius: 2 }}>
                    <AccountBalanceWalletIcon color="action" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}

          {permissions.canViewPayments && (
            <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">שולם בפועל</Typography>
                    <Typography variant="h4" fontWeight="800" color="success.main" sx={{ mt: 1 }}>
                      ₪{totalPaid.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.5, backgroundColor: 'success.50', borderRadius: 2 }}>
                    <PaidIcon color="success" />
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary" fontWeight="medium">
                  נוצלו {budgetUsedPercent.toFixed(0)}% מהתקציב
                </Typography>
              </CardContent>
            </Card>
          )}

          {permissions.canViewBudget && (
            <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', background: budgetRemaining >= 0 ? '#ffffff' : 'linear-gradient(135deg, #fff0f0 0%, #ffe0e0 100%)' }}>
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" fontWeight="bold">יתרה נותרת</Typography>
                    <Typography variant="h4" fontWeight="800" color={budgetRemaining >= 0 ? "success.main" : "error.main"} sx={{ mt: 1 }}>
                      ₪{budgetRemaining.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>

        {/* ========== ZONE 2: ALERTS ========== */}
        {(blockedTasksArr.length > 0 || overdueNotInProgressArr.length > 0 || shouldStartTasks.length > 0 || inProgressOverdueArr.length > 0 || (permissions.canViewPayments && upcomingPayments.length > 0) || recentlyCompletedTasks.length > 0) && (
          <Card sx={{ mb: 4, borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', borderLeft: '6px solid #ff9800' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight="800" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningAmberIcon color="warning" /> התראות הדורשות תשומת לב
              </Typography>
              <Stack spacing={2} mt={2}>
                {overdueNotInProgressArr.length > 0 && <Alert severity="error" icon={<EventBusyIcon />} sx={{ borderRadius: 2 }}>יש {overdueNotInProgressArr.length} משימות שחרגו מתאריך היעד</Alert>}
                {inProgressOverdueArr.length > 0 && <Alert severity="error" sx={{ borderRadius: 2 }}>יש {inProgressOverdueArr.length} משימות בביצוע שעבר להן תאריך הסיום!</Alert>}
                {shouldStartTasks.length > 0 && <Alert severity="warning" sx={{ borderRadius: 2 }}>יש {shouldStartTasks.length} משימות שאמורות היו להתחיל ועדיין לא התחילו</Alert>}
                {blockedTasksArr.length > 0 && <Alert severity="warning" sx={{ borderRadius: 2 }}>{blockedTasksArr.length} משימות נמצאות בסטטוס חסום ומעכבות את הפרויקט</Alert>}
                {permissions.canViewPayments && upcomingPayments.length > 0 && <Alert severity="info" sx={{ borderRadius: 2 }}>{upcomingPayments.length} תשלומים ממתינים בשבועיים הקרובים (סך הכל: ₪{upcomingPayments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()})</Alert>}
                {recentlyCompletedTasks.length > 0 && <Alert severity="success" icon={<CelebrationIcon />} sx={{ borderRadius: 2 }}>עבודה טובה! הושלמו {recentlyCompletedTasks.length} משימות השבוע.</Alert>}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* ========== ZONE 3: DETAILED SPLIT VIEW ========== */}
        <Box sx={{ display: 'grid', gap: 4, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' } }}>
          
          <Stack spacing={4}>
            {/* סטטוס משימות פרויקט */}
            <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="800" gutterBottom mb={3}>
                  📊 סטטוס משימות פרויקט
                </Typography>
                <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(130px, 1fr))" gap={2}>
                  
                  <Box sx={{ p: 2, borderRadius: 3, backgroundColor: 'success.50', textAlign: 'center', border: '1px solid', borderColor: 'success.100' }}>
                    <Typography variant="h4" fontWeight="800" color="success.main">{completedTasksArr.length}</Typography>
                    <Typography variant="body2" color="success.main" fontWeight="bold">הושלמו ✓</Typography>
                  </Box>

                  <Box sx={{ p: 2, borderRadius: 3, backgroundColor: 'primary.50', textAlign: 'center', border: '1px solid', borderColor: 'primary.100' }}>
                    <Typography variant="h4" fontWeight="800" color="primary.main">{inProgressOnTimeArr.length}</Typography>
                    <Typography variant="body2" color="primary.main" fontWeight="bold">בביצוע ●</Typography>
                  </Box>

                  <Box sx={{ p: 2, borderRadius: 3, backgroundColor: 'info.50', textAlign: 'center', border: '1px solid', borderColor: 'info.100' }}>
                    <Typography variant="h4" fontWeight="800" color="info.main">{waitingTasksArr.length}</Typography>
                    <Typography variant="body2" color="info.main" fontWeight="bold">בהמתנה ⏸</Typography>
                  </Box>

                  <Box sx={{ p: 2, borderRadius: 3, backgroundColor: 'grey.50', textAlign: 'center', border: '1px solid #eee' }}>
                    <Typography variant="h4" fontWeight="800" color="text.secondary">{notStartedOnTimeArr.length}</Typography>
                    <Typography variant="body2" color="text.secondary" fontWeight="bold">לא התחילו ○</Typography>
                  </Box>

                  <Box sx={{ p: 2, borderRadius: 3, backgroundColor: '#fff4e5', textAlign: 'center', border: '1px solid #ffe0b2' }}>
                    <Typography variant="h4" fontWeight="800" color="#ed6c02">{blockedTasksArr.length}</Typography>
                    <Typography variant="body2" color="#ed6c02" fontWeight="bold">חסומות ⚠</Typography>
                  </Box>

                  <Box sx={{ p: 2, borderRadius: 3, backgroundColor: '#fff0f0', textAlign: 'center', border: '1px solid #ffcdd2' }}>
                    <Typography variant="h4" fontWeight="800" color="error.main">{overdueNotInProgressArr.length}</Typography>
                    <Typography variant="body2" color="error.main" fontWeight="bold">באיחור ❗</Typography>
                  </Box>

                  <Box sx={{ p: 2, borderRadius: 3, backgroundColor: '#fce4ec', textAlign: 'center', border: '1px solid #f8bbd0' }}>
                    <Typography variant="h4" fontWeight="800" color="#c2185b">{inProgressOverdueArr.length}</Typography>
                    <Typography variant="body2" color="#c2185b" fontWeight="bold">בביצוע באיחור ⚠️</Typography>
                  </Box>

                </Box>
              </CardContent>
            </Card>

            {/* התקדמות חדרים - הוסר הסקרול הפנימי וכל החדרים יוצגו באופן מלא */}
            <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Typography variant="h6" fontWeight="800" gutterBottom mb={3}>
                  🏠 התקדמות לפי חדרים
                </Typography>
                
                <List disablePadding>
                  {roomsWithProgress.map((roomProgress, index) => {
                    const isLast = index === roomsWithProgress.length - 1;
                    return (
                      <Box key={roomProgress.roomId} sx={{ mb: isLast ? 0 : 2.5 }}> 
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="body1" fontWeight="bold">{roomProgress.roomName}</Typography>
                          <Chip size="small" label={`${roomProgress.progress}%`} color={roomProgress.progress === 100 ? "success" : "default"} sx={{ fontWeight: 'bold' }} />
                        </Box>
                        <LinearProgress variant="determinate" value={roomProgress.progress} sx={{ height: 8, borderRadius: 4, backgroundColor: 'grey.100', '& .MuiLinearProgress-bar': { borderRadius: 4 } }} color={roomProgress.progress === 100 ? "success" : "primary"} />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          {roomProgress.completedTasks} מתוך {roomProgress.totalTasks} משימות הושלמו
                        </Typography>
                      </Box>
                    );
                  })}
                </List>
              </CardContent>
            </Card>
          </Stack>

          {/* עמודה שמאלית: תקציב וספקים */}
          {permissions.canViewBudget && (
            <Stack spacing={4}>
              <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight="800" gutterBottom mb={3}>
                    💸 ניתוח ספקים והוצאות
                  </Typography>
                  
                  <Box display="flex" gap={2} mb={4}>
                     <Box sx={{ flex: 1, p: 2, borderRadius: 3, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">סך התחייבויות (חוזים)</Typography>
                        <Typography variant="h5" fontWeight="800" color="#334155" mt={0.5}>₪{totalContracts.toLocaleString()}</Typography>
                     </Box>
                     <Box sx={{ flex: 1, p: 2, borderRadius: 3, backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight="bold">סך הכל שולם</Typography>
                        <Typography variant="h5" fontWeight="800" color="success.main" mt={0.5}>₪{totalPaid.toLocaleString()}</Typography>
                     </Box>
                  </Box>

                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="text.secondary">
                    ספקים מרכזיים
                  </Typography>
                  <Stack spacing={2} mb={4}>
                    {vendorsWithPayments.slice(0, 4).map((vendor, index) => (
                      <Box key={vendor.id} sx={{ p: 2, border: '1px solid #f1f5f9', borderRadius: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: index === 0 ? '#fffbeb' : '#ffffff' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: index === 0 ? '#fde68a' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <PeopleAltIcon sx={{ color: index === 0 ? '#d97706' : '#94a3b8' }} />
                          </Box>
                          <Box>
                            <Typography variant="body1" fontWeight="bold">{vendor.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{vendor.category || 'כללי'}</Typography>
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: 'left' }}>
                          <Typography variant="body1" fontWeight="800">₪{vendor.totalAmount.toLocaleString()}</Typography>
                          {vendor.totalPending > 0 ? (
                             <Typography variant="caption" color="warning.main" fontWeight="bold">₪{vendor.totalPending.toLocaleString()} להשלמה</Typography>
                          ) : (
                             <Typography variant="caption" color="success.main" fontWeight="bold">שולם במלואו</Typography>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Stack>

                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="text.secondary">
                    חלוקת תקציב לפי קטגוריות
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {categoriesSorted.slice(0, 5).map(([category, data]) => {
                      const percentage = totalPaid > 0 ? (data.total / totalPaid) * 100 : 0;
                      return (
                        <Box key={category}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" fontWeight="bold">
                              {category}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              ₪{data.total.toLocaleString()}
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={Math.min(percentage, 100)} 
                            sx={{ height: 6, borderRadius: 2 }}
                            color="info"
                          />
                        </Box>
                      );
                    })}
                  </Box>
                </CardContent>
              </Card>
            </Stack>
          )}
        </Box>
      </Box>
    </DashboardLayout>
  );
}