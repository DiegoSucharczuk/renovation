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
  ListItem,
  ListItemText,
  CircularProgress,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import { doc, getDoc, collection, query, where, getDocs, getDocsFromServer, getDocFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectRole } from '@/hooks/useProjectRole';
import AccessDenied from '@/components/AccessDenied';
import { hebrewLabels } from '@/lib/labels';
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
          } as unknown as Task;
        });
        setTasks(tasksData);

        // טעינת ספקים
        const vendorsQuery = query(collection(db, 'vendors'), where('projectId', '==', projectId));
        const vendorsSnapshot = await getDocsFromServer(vendorsQuery);
        const vendorsData = vendorsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Vendor));
        setVendors(vendorsData);

        // טעינת תשלומים
        const paymentsQuery = query(collection(db, 'payments'), where('projectId', '==', projectId));
        const paymentsSnapshot = await getDocsFromServer(paymentsQuery);
        const paymentsData = paymentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Payment));
        setPayments(paymentsData);

        console.log('Dashboard data loaded:', {
          project: projectDoc.exists(),
          roomsCount: roomsData.length,
          tasksCount: tasksData.length,
          vendorsCount: vendorsData.length,
          paymentsCount: paymentsData.length,
          budgetPlanned: projectDoc.data()?.budgetPlanned,
        });
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

    // רענון נתונים כשחוזרים לטאב
    const handleFocus = () => {
      console.log('Dashboard focus - refreshing data');
      fetchData();
    };

    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, router, fetchData]);

  // בדיקת טעינת הרשאות
  if (roleLoading || loading) {
    return (
      <DashboardLayout projectId={projectId} project={project || undefined}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  // בדיקת הרשאות
  if (!role || !permissions) {
    return (
      <DashboardLayout projectId={projectId} project={project || undefined}>
        <AccessDenied message="אין לך הרשאה לצפות בפרויקט זה" />
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout projectId={projectId} project={project || undefined}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  // חישוב נתונים אמיתיים - לא כולל משימות לא רלוונטיות
  const relevantTasks = tasks;
  const totalTasks = relevantTasks.length;
  const completedTasks = relevantTasks.filter(t => t.status === 'DONE').length;
  const inProgressTasks = relevantTasks.filter(t => t.status === 'IN_PROGRESS').length;
  const blockedTasks = relevantTasks.filter(t => t.status === 'WAITING').length;
  const notStartedTasks = relevantTasks.filter(t => t.status === 'NOT_STARTED').length;
  const tasksCompletedPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  console.log('Dashboard calculations:', {
    totalTasks,
    completedTasks,
    inProgressTasks,
    blockedTasks,
    notStartedTasks,
    roomsCount: rooms.length,
    vendorsCount: vendors.length,
    paymentsCount: payments.length,
    budgetPlanned: project?.budgetPlanned,
  });
  
  // בדיקת סטטוסים של כל המשימות
  console.log('Task statuses:', relevantTasks.map(t => ({ 
    title: t.title, 
    status: t.status, 
    category: t.category 
  })));

  // חישוב התקדמות חדרים - לפי ממוצע progress (כמו במסך חדרים)
  const roomsWithProgress = rooms.map(room => {
    const roomTasks = tasks.filter(t => t.roomId === room.id && t.status !== 'NOT_RELEVANT');
    const totalRoomTasks = roomTasks.length;
    
    // חישוב progress לפי סטטוס המשימות
    const completedTasksCount = roomTasks.filter(t => t.status === 'DONE').length;
    const averageProgress = totalRoomTasks > 0 
      ? (completedTasksCount / totalRoomTasks) * 100
      : 0;
    
    const roomCompletedTasks = completedTasksCount;
    
    console.log(`חדר: ${room.name}`, {
      totalTasks: totalRoomTasks,
      completed: roomCompletedTasks,
      averageProgress: Math.round(averageProgress)
    });
    
    return {
      roomId: room.id,
      roomName: room.name,
      completedTasks: roomCompletedTasks,
      totalTasks: totalRoomTasks,
      progress: Math.round(averageProgress),
    };
  });

  // תקציב - חישוב לפי חוזים ותשלומים אמיתיים
  const budgetPlanned = project?.budgetPlanned || 0;
  
  // סך חוזים עם ספקים
  const totalContracts = vendors.reduce((sum, vendor) => sum + (vendor.contractAmount || 0), 0);
  
  // סך תשלומים ששולמו בפועל (רק status === 'שולם')
  const totalPaid = payments
    .filter(payment => payment.status === 'שולם')
    .reduce((sum, payment) => sum + (payment.amount || 0), 0);
  
  // סך תשלומים מתוכננים ובהמתנה
  const totalPlanned = payments
    .filter(payment => payment.status === 'מתוכנן' || payment.status === 'ממתין')
    .reduce((sum, payment) => sum + (payment.amount || 0), 0);
  
  // יתרה אמיתית (תקציב - תשלומים ששולמו)
  const budgetRemaining = budgetPlanned - totalPaid;
  
  // אחוז ניצול (לפי תשלומים ששולמו)
  const budgetUsedPercent = budgetPlanned > 0 ? (totalPaid / budgetPlanned) * 100 : 0;
  
  // אחוז התחייבויות (חוזים / תקציב)
  const contractsPercent = budgetPlanned > 0 ? (totalContracts / budgetPlanned) * 100 : 0;
  
  const budgetAllowedOverflow = project?.budgetAllowedOverflowPercent || 0;

  // ניתוח תקציב לפי קטגוריות
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

  // מיון לפי סכום
  const categoriesSorted = Object.entries(budgetByCategory)
    .sort((a, b) => b[1].total - a[1].total)
    .filter(([_, data]) => data.total > 0);

  // ספקים לפי סכום תשלומים (ששולמו + ממתינים)
  const vendorsWithPayments = vendors
    .map(vendor => {
      const vendorPaymentsPaid = payments.filter(p => p.vendorId === vendor.id && p.status === 'שולם');
      const vendorPaymentsPending = payments.filter(p => p.vendorId === vendor.id && p.status === 'ממתין');
      const totalPaid = vendorPaymentsPaid.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalPending = vendorPaymentsPending.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalAmount = totalPaid + totalPending;
      return { 
        id: vendor.id,
        name: vendor.name,
        category: vendor.category,
        totalPaid, 
        totalPending,
        totalAmount
      };
    })
    .filter(v => v.totalAmount > 0)
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 5);

  // התראות ועדכונים
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // משימות שחרגו מתאריך יעד
  const overdueTasks = relevantTasks.filter(task => {
    if (!task.endPlanned || task.status === 'DONE') return false;
    const dueDate = task.endPlanned instanceof Date ? task.endPlanned : new Date(task.endPlanned);
    return dueDate < now;
  });

  // תשלומים שצריך לשלם בקרוב (שבוע-שבועיים)
  const upcomingPayments = payments.filter(payment => {
    if (payment.status === 'שולם') return false;
    const paymentDateStr = (payment as any).estimatedDate || (payment as any).date;
    if (!paymentDateStr) return false;
    const paymentDate = typeof paymentDateStr === 'string' ? new Date(paymentDateStr) : paymentDateStr;
    return paymentDate >= now && paymentDate <= twoWeeksFromNow;
  });

  // משימות שהושלמו השבוע
  const recentlyCompletedTasks = relevantTasks.filter(task => {
    if (task.status !== 'DONE') return false;
    const completedDate = task.endActual || task.updatedAt;
    if (!completedDate) return false;
    const date = completedDate instanceof Date ? completedDate : new Date(completedDate);
    return date >= weekAgo;
  });

  return (
    <DashboardLayout projectId={projectId} project={project || undefined}>
      <Box sx={{ px: 3, py: 4, backgroundColor: '#fafafa', minHeight: '100vh' }}>
        
        {/* ========== ZONE 1: OVERVIEW (Header) ========== */}
        <Card sx={{ mb: 4, backgroundColor: 'white', borderRadius: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  {project?.name || 'טוען...'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  דשבורד ניהול פרויקט
                </Typography>
              </Box>
              <Tooltip title="רענון נתונים">
                <IconButton onClick={fetchData} disabled={refreshing}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>

            {/* KPI Cards Row */}
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
              {/* אחוז התקדמות */}
              <Box sx={{ p: 2, border: 1, borderColor: '#eee', borderRadius: 2, textAlign: 'center', backgroundColor: '#fafafa' }}>
                <Typography variant="caption" color="#666" gutterBottom display="block">
                  התקדמות כוללת
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {tasksCompletedPercent.toFixed(0)}%
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={tasksCompletedPercent} 
                  sx={{ mt: 1, height: 4, borderRadius: 2 }}
                />
              </Box>

              {/* תקציב מתוכנן - רק למורשים */}
              {permissions.canViewBudget && (
                <Box sx={{ p: 2, border: 1, borderColor: '#eee', borderRadius: 2, textAlign: 'center', backgroundColor: '#fafafa' }}>
                  <Typography variant="caption" color="#666" gutterBottom display="block">
                    תקציב מתוכנן
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    ₪{budgetPlanned.toLocaleString()}
                  </Typography>
                </Box>
              )}

              {/* שולם בפועל - רק למורשים */}
              {permissions.canViewPayments && (
                <Box sx={{ p: 2, border: 1, borderColor: '#eee', borderRadius: 2, textAlign: 'center', backgroundColor: '#fafafa' }}>
                  <Typography variant="caption" color="#666" gutterBottom display="block">
                    שולם בפועל
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    ₪{totalPaid.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="#666">
                    {budgetUsedPercent.toFixed(0)}% מהתקציב
                  </Typography>
                </Box>
              )}

              {/* יתרה - רק למורשים */}
              {permissions.canViewBudget && (
                <Box sx={{ p: 2, border: 1, borderColor: '#eee', borderRadius: 2, textAlign: 'center', backgroundColor: budgetRemaining >= 0 ? '#f0f9ff' : '#fff0f0' }}>
                  <Typography variant="caption" color="#666" gutterBottom display="block">
                    יתרה
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color={budgetRemaining >= 0 ? "success.main" : "error.main"}>
                    ₪{budgetRemaining.toLocaleString()}
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* ========== ZONE 2: ALERTS ========== */}
        {(blockedTasks > 0 || overdueTasks.length > 0 || (permissions.canViewPayments && upcomingPayments.length > 0) || recentlyCompletedTasks.length > 0) && (
          <Card sx={{ mb: 4, backgroundColor: 'white', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                🔔 התראות ועדכונים
              </Typography>
              <Stack spacing={1.5} mt={2}>
                {overdueTasks.length > 0 && (
                  <Alert severity="error" sx={{ py: 1 }}>
                    יש {overdueTasks.length} משימות שחרגו מתאריך היעד
                  </Alert>
                )}
                {blockedTasks > 0 && (
                  <Alert severity="warning" sx={{ py: 1 }}>
                    {blockedTasks} משימות חסומות הדורשות טיפול
                  </Alert>
                )}
                {permissions.canViewPayments && upcomingPayments.length > 0 && (
                  <Alert severity="info" sx={{ py: 1 }}>
                    {upcomingPayments.length} תשלומים בשבועיים הקרובים (₪{upcomingPayments.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()})
                  </Alert>
                )}
                {recentlyCompletedTasks.length > 0 && (
                  <Alert severity="success" sx={{ py: 1 }}>
                    הושלמו {recentlyCompletedTasks.length} משימות השבוע! 🎉
                  </Alert>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* ========== ZONE 3: FINANCIAL DATA (Only for authorized roles) ========== */}
        {permissions.canViewBudget && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom mb={2}>
            💰 תקציב ונתונים פיננסיים
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' } }}>
            {/* סך חוזים */}
            <Card sx={{ backgroundColor: 'white' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body2" color="#666" gutterBottom>
                  סך חוזים
                </Typography>
                <Typography variant="h4" fontWeight="bold" color={contractsPercent > 100 ? "error" : "primary"}>
                  ₪{totalContracts.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="#666">
                  {contractsPercent.toFixed(1)}% מהתקציב
                </Typography>
              </CardContent>
            </Card>

            {/* תשלומים ממתינים */}
            <Card sx={{ backgroundColor: 'white' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body2" color="#666" gutterBottom>
                  ממתין לתשלום
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="info.main">
                  ₪{totalPlanned.toLocaleString()}
                </Typography>
                <Typography variant="caption" color="#666">
                  {payments.filter(p => p.status === 'מתוכנן' || p.status === 'ממתין').length} תשלומים
                </Typography>
              </CardContent>
            </Card>

            {/* מספר ספקים */}
            <Card sx={{ backgroundColor: 'white' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body2" color="#666" gutterBottom>
                  ספקים פעילים
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {vendors.length}
                </Typography>
                <Typography variant="caption" color="#666">
                  ספקים רשומים
                </Typography>
              </CardContent>
            </Card>

            {/* ניצול תקציב */}
            <Card sx={{ backgroundColor: 'white' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="body2" color="#666" gutterBottom>
                  ניצול תקציב
                </Typography>
                <Typography variant="h4" fontWeight="bold" color={budgetUsedPercent > 100 ? 'error' : 'success.main'}>
                  {budgetUsedPercent.toFixed(0)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(budgetUsedPercent, 100)}
                  sx={{ mt: 1, height: 6, borderRadius: 3 }}
                  color={budgetUsedPercent > 100 ? 'error' : 'success'}
                />
              </CardContent>
            </Card>
          </Box>
        </Box>
        )}

        {/* ========== ZONE 4: PROJECT DETAILS ========== */}
        <Box sx={{ display: 'grid', gap: 4, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' } }}>
            {/* Vendors & Payments Summary - Only for authorized roles */}
            {permissions.canViewPayments && (
            <Card>
              <CardContent>
                <Typography variant="h5" fontWeight="bold" gutterBottom mb={3}>
                  ספקים ותשלומים
                </Typography>
                {vendors.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    אין ספקים מוגדרים
                  </Typography>
                ) : (
                  <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={2}>
                    {/* מספר ספקים */}
                    <Box sx={{ p: 2.5, border: 1, borderColor: 'divider', borderRadius: 2, backgroundColor: 'primary.50', textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        מספר ספקים
                      </Typography>
                      <Typography variant="h3" color="primary" fontWeight="bold">
                        {vendors.length}
                      </Typography>
                    </Box>

                    {/* סך חוזים */}
                    <Box sx={{ p: 2.5, border: 1, borderColor: 'divider', borderRadius: 2, backgroundColor: '#f5f5f5', textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        סך חוזים
                      </Typography>
                      <Typography variant="h4" color="primary" fontWeight="bold">
                        ₪{totalContracts.toLocaleString()}
                      </Typography>
                    </Box>

                    {/* שולם */}
                    <Box sx={{ p: 2.5, border: 2, borderColor: 'success.main', borderRadius: 2, backgroundColor: 'success.50', textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        שולם בפועל
                      </Typography>
                      <Typography variant="h4" color="success.main" fontWeight="bold">
                        ₪{totalPaid.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                        {payments.filter(p => p.status === 'שולם').length} תשלומים
                      </Typography>
                    </Box>

                    {/* מתוכנן */}
                    <Box sx={{ p: 2.5, border: 1, borderColor: 'info.main', borderRadius: 2, backgroundColor: 'info.50', textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        מתוכנן לתשלום
                      </Typography>
                      <Typography variant="h4" color="info.main" fontWeight="bold">
                        ₪{totalPlanned.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                        {payments.filter(p => p.status === 'מתוכנן' || p.status === 'ממתין').length} תשלומים
                      </Typography>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
            )}

            {/* Tasks Progress */}
            {/* Tasks Progress */}
            <Card>
              <CardContent>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  התקדמות משימות
                </Typography>
                {totalTasks === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    אין עדיין משימות בפרויקט
                  </Typography>
                ) : (
                  <>
                    <Box mb={3}>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">
                          {completedTasks} מתוך {totalTasks} משימות הושלמו
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {tasksCompletedPercent.toFixed(0)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={tasksCompletedPercent}
                        sx={{ height: 10, borderRadius: 4 }}
                      />
                    </Box>
                    
                    <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(140px, 1fr))" gap={2}>
                      <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2, backgroundColor: '#f5f5f5', textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          לא התחיל
                        </Typography>
                        <Typography variant="h4" color="text.secondary">
                          {notStartedTasks}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 2, border: 2, borderColor: 'primary.main', borderRadius: 2, backgroundColor: 'primary.50', textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          בביצוע
                        </Typography>
                        <Typography variant="h4" color="primary">
                          {inProgressTasks}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 2, border: 1, borderColor: 'error.main', borderRadius: 2, backgroundColor: 'error.50', textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          חסומות
                        </Typography>
                        <Typography variant="h4" color="error">
                          {blockedTasks}
                        </Typography>
                      </Box>
                      <Box sx={{ p: 2, border: 2, borderColor: 'success.main', borderRadius: 2, backgroundColor: 'success.50', textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          הושלמו
                        </Typography>
                        <Typography variant="h4" color="success.main">
                          {completedTasks}
                        </Typography>
                      </Box>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Budget Analysis - Only for authorized roles */}
            {permissions.canViewBudget && (
            <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' } }}>
              {/* Budget by Category */}
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    💰 תקציב לפי קטגוריות
                  </Typography>
                  {categoriesSorted.length === 0 ? (
                    <Typography color="text.secondary">אין עדיין תשלומים</Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                      {categoriesSorted.slice(0, 7).map(([category, data]) => {
                  const percentage = totalPaid > 0 ? (data.total / totalPaid) * 100 : 0;
                  return (
                    <Box key={category}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {category}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ₪{data.total.toLocaleString()} ({percentage.toFixed(1)}%)
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.min(percentage, 100)} 
                        sx={{ height: 8, borderRadius: 1 }}
                      />
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          {data.count} {data.count === 1 ? 'ספק' : 'ספקים'}
                        </Typography>
                        {data.paid > 0 && data.pending > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            שולם: ₪{data.paid.toLocaleString()} | ממתין: ₪{data.pending.toLocaleString()}
                          </Typography>
                        )}
                        {data.paid > 0 && data.pending === 0 && (
                          <Typography variant="caption" color="success.main">
                            ✓ שולם במלואו
                          </Typography>
                        )}
                        {data.paid === 0 && data.pending > 0 && (
                          <Typography variant="caption" color="warning.main">
                            ⏰ ממתין לתשלום
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })}
                {categoriesSorted.length > 7 && (
                  <Box sx={{ textAlign: 'center', pt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      ועוד {categoriesSorted.length - 7} קטגוריות...
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </CardContent>
        </Card>

              {/* Top Vendors */}
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    💸 ספקים מובילים
                  </Typography>
            {vendorsWithPayments.length === 0 ? (
              <Typography color="text.secondary">אין עדיין תשלומים</Typography>
            ) : (
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr', mt: 2 }}>
                {vendorsWithPayments.map((vendor, index) => (
                  <Box 
                    key={vendor.id}
                    sx={{ 
                      p: 2, 
                      border: 1, 
                      borderColor: index === 0 ? 'warning.main' : 'divider',
                      borderRadius: 1, 
                      backgroundColor: index === 0 ? 'warning.50' : 'grey.50',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6" color={index === 0 ? 'warning.main' : 'text.secondary'}>
                        #{index + 1}
                      </Typography>
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          {vendor.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {vendor.category || 'אחר'}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="h6" color={index === 0 ? 'warning.main' : 'text.primary'}>
                        ₪{vendor.totalAmount.toLocaleString()}
                      </Typography>
                      {vendor.totalPaid > 0 && vendor.totalPending > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          שולם: ₪{vendor.totalPaid.toLocaleString()} | ממתין: ₪{vendor.totalPending.toLocaleString()}
                        </Typography>
                      )}
                      {vendor.totalPaid > 0 && vendor.totalPending === 0 && (
                        <Typography variant="caption" color="success.main">
                          שולם במלואו
                        </Typography>
                      )}
                      {vendor.totalPaid === 0 && vendor.totalPending > 0 && (
                        <Typography variant="caption" color="warning.main">
                          ממתין לתשלום
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
            </Box>
            )}

            {/* Room Progress */}
            <Card>
              <CardContent>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  התקדמות לפי חדרים
                </Typography>
                {roomsWithProgress.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    אין חדרים מוגדרים
                  </Typography>
                ) : (
                  <List>
                    {roomsWithProgress.slice(0, 7).map((roomProgress) => (
                <ListItem key={roomProgress.roomId} divider>
                  <Box sx={{ width: '100%' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body1">{roomProgress.roomName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {roomProgress.completedTasks}/{roomProgress.totalTasks} משימות
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={roomProgress.progress}
                      sx={{ height: 8, borderRadius: 3, mb: 0.5 }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {roomProgress.progress.toFixed(0)}%
                    </Typography>
                  </Box>
                </ListItem>
              ))}
              {roomsWithProgress.length > 7 && (
                <ListItem>
                  <Typography variant="caption" color="text.secondary" sx={{ width: '100%', textAlign: 'center' }}>
                    ועוד {roomsWithProgress.length - 7} חדרים...
                  </Typography>
                </ListItem>
              )}
            </List>
          )}
        </CardContent>
      </Card>
        </Box>
      </Box>
    </DashboardLayout>
  );
}
