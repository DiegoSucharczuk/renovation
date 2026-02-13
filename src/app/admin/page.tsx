'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  CircularProgress,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Stack,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useAuth } from '@/contexts/AuthContext';
import { isSuperAdmin } from '@/lib/adminConfig';
import { collection, getDocsFromServer, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Project } from '@/types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [projectUsers, setProjectUsers] = useState<any[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    activeProjectUsers: 0,
    totalVendors: 0,
    totalBudget: 0,
  });

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!isSuperAdmin(user.email)) {
      router.push('/projects');
      return;
    }

    // Update current user's lastLoginAt if needed
    const updateCurrentUser = async () => {
      try {
        await updateDoc(doc(db, 'users', user.id), {
          lastLoginAt: new Date(),
        });
        console.log('Current user lastLoginAt updated');
      } catch (error) {
        console.error('Error updating current user:', error);
      }
    };
    
    updateCurrentUser();
    fetchAllData();
  }, [user, router]);

  const updateAllUsersLastLogin = async () => {
    try {
      const usersSnapshot = await getDocsFromServer(collection(db, 'users'));
      let updated = 0;
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        if (!userData.lastLoginAt) {
          // Set lastLoginAt to createdAt for existing users
          await updateDoc(doc(db, 'users', userDoc.id), {
            lastLoginAt: userData.createdAt || new Date(),
          });
          updated++;
        }
      }
      
      alert(`עודכנו ${updated} משתמשים`);
      fetchAllData();
    } catch (error) {
      console.error('Error updating users:', error);
      alert('שגיאה בעדכון משתמשים');
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);

      // Fetch all projects
      const projectsSnapshot = await getDocsFromServer(collection(db, 'projects'));
      const projectsData = projectsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      } as Project));
      setProjects(projectsData);

      // Fetch all users
      const usersSnapshot = await getDocsFromServer(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        lastLoginAt: doc.data().lastLoginAt?.toDate(),
      }));
      setUsers(usersData);

      // Fetch all vendors (aggregate from all projects)
      const vendorsSnapshot = await getDocsFromServer(collection(db, 'vendors'));
      const vendorsData = vendorsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));
      setVendors(vendorsData);

      // Fetch all project users
      const projectUsersSnapshot = await getDocsFromServer(collection(db, 'projectUsers'));
      const projectUsersData = projectUsersSnapshot.docs.map(doc => doc.data());
      setProjectUsers(projectUsersData);

      // Fetch all pending invitations
      const pendingInvitationsSnapshot = await getDocsFromServer(collection(db, 'pendingInvitations'));
      const pendingInvitationsData = pendingInvitationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      }));
      setPendingInvitations(pendingInvitationsData);

      // Calculate stats
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Active projects are those updated in the last 30 days
      const activeProjects = projectsData.filter(p => {
        const projectData = p as any;
        const updatedAt = projectData.updatedAt ? projectData.updatedAt.toDate() : p.createdAt;
        return updatedAt >= thirtyDaysAgo;
      });
      
      console.log('Admin stats calculation:', {
        totalProjects: projectsData.length,
        activeProjectsCount: activeProjects.length,
        thirtyDaysAgo: thirtyDaysAgo.toISOString(),
        projectsWithUpdates: projectsData.map(p => ({
          id: p.id,
          name: p.name,
          createdAt: p.createdAt,
          updatedAt: (p as any).updatedAt,
        })),
      });

      const totalBudget = projectsData.reduce((sum, p) => sum + (p.budgetPlanned || 0), 0);

      // Count unique users across all projects (active in projects)
      const uniqueUserIds = new Set<string>();
      projectUsersData.forEach(pu => uniqueUserIds.add(pu.userId));
      // Add project owners
      projectsData.forEach(p => {
        if (p.ownerId) uniqueUserIds.add(p.ownerId);
      });
      const activeProjectUsersCount = uniqueUserIds.size;

      // Active users = all registered users (in users collection)
      // Pending users = invitations that haven't been accepted yet (in pendingInvitations collection)
      const activeUsersCount = usersData.length;
      const pendingUsersCount = pendingInvitationsData.length;

      setStats({
        totalProjects: projectsData.length,
        activeProjects: activeProjects.length,
        totalUsers: usersData.length,
        activeUsers: activeUsersCount,
        pendingUsers: pendingUsersCount,
        activeProjectUsers: activeProjectUsersCount,
        totalVendors: vendorsData.length,
        totalBudget,
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setLoading(false);
    }
  };

  if (!isClient || loading) {
    return (
      <Container>
        <Box 
          display="flex" 
          flexDirection="column"
          justifyContent="center" 
          alignItems="center" 
          minHeight="100vh"
        >
          <CircularProgress size={60} color="primary" />
          <Typography variant="h6" sx={{ mt: 2, color: 'text.secondary' }}>
            טוען נתונים...
          </Typography>
        </Box>
      </Container>
    );
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          🔧 ניהול מערכת
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/projects')}
        >
          חזרה לפרויקטים
        </Button>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="admin tabs">
          <Tab label="📊 סטטיסטיקות" />
          <Tab label="📁 פרויקטים" />
          <Tab label="👥 משתמשים" />
          <Tab label="🔨 ספקים וקבלנים" />
          <Tab label="⚙️ הגדרות" />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Typography variant="h6" gutterBottom>סטטיסטיקות כלליות</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
          <Card sx={{ cursor: 'pointer' }} onClick={() => setTabValue(1)}>
            <CardContent sx={{ p: 2 }}>
              <Typography color="text.secondary" gutterBottom fontSize="0.875rem">
                סה"כ פרויקטים
              </Typography>
              <Typography variant="h5" component="div">
                {stats.totalProjects}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ backgroundColor: '#e8f5e9', cursor: 'pointer' }} onClick={() => setTabValue(1)}>
            <CardContent sx={{ p: 2 }}>
              <Typography color="text.secondary" gutterBottom fontSize="0.875rem">
                פרויקטים פעילים
              </Typography>
              <Typography variant="h5" component="div" color="success.main">
                {stats.activeProjects}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontSize="0.75rem">
                עדכון ב-30 הימים האחרונים
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ cursor: 'pointer' }} onClick={() => {
            const firstProject = projects[0];
            if (firstProject) {
              router.push(`/dashboard/${firstProject.id}/settings/users`);
            }
          }}>
            <CardContent sx={{ p: 2 }}>
              <Typography color="text.secondary" gutterBottom fontSize="0.875rem">
                משתמשים רשומים
              </Typography>
              <Typography variant="h5" component="div">
                {stats.activeUsers}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontSize="0.75rem">
                נרשמו למערכת
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ backgroundColor: '#fff3e0', cursor: 'pointer' }} onClick={() => {
            const firstProject = projects[0];
            if (firstProject) {
              router.push(`/dashboard/${firstProject.id}/settings/users`);
            }
          }}>
            <CardContent sx={{ p: 2 }}>
              <Typography color="text.secondary" gutterBottom fontSize="0.875rem">
                משתמשים ממתינים לאישור
              </Typography>
              <Typography variant="h5" component="div" color="warning.main">
                {stats.pendingUsers}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontSize="0.75rem">
                טרם התקבלו
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ backgroundColor: '#f3e5f5' }}>
            <CardContent sx={{ p: 2 }}>
              <Typography color="text.secondary" gutterBottom fontSize="0.875rem">
                תקציב כולל
              </Typography>
              <Typography variant="h5" component="div" color="warning.main">
                ₪{stats.totalBudget.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ cursor: 'pointer' }} onClick={() => {
            const firstProject = projects[0];
            if (firstProject) {
              router.push(`/dashboard/${firstProject.id}/vendors`);
            }
          }}>
            <CardContent sx={{ p: 2 }}>
              <Typography color="text.secondary" gutterBottom fontSize="0.875rem">
                ספקים וקבלנים
              </Typography>
              <Typography variant="h5" component="div">
                {stats.totalVendors}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">כל הפרויקטים</Typography>
          <TextField
            size="small"
            placeholder="חיפוש פרויקט..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>שם הפרויקט</TableCell>
                <TableCell>כתובת</TableCell>
                <TableCell>תקציב</TableCell>
                <TableCell>תאריך יצירה</TableCell>
                <TableCell>עדכון אחרון</TableCell>
                <TableCell>סטטוס</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {projects
                .filter(p => 
                  searchTerm === '' || 
                  p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  p.address.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((project) => {
                  const projectData = project as any;
                  const updatedAt = projectData.updatedAt ? new Date(projectData.updatedAt.seconds * 1000) : project.createdAt;
                  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                  const isActive = updatedAt >= thirtyDaysAgo;
                  
                  return (
                    <TableRow 
                      key={project.id}
                      onClick={() => router.push(`/dashboard/${project.id}`)}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5' } }}
                    >
                      <TableCell>
                        <Typography fontWeight="medium">{project.name}</Typography>
                      </TableCell>
                      <TableCell>{project.address}</TableCell>
                      <TableCell>₪{project.budgetPlanned.toLocaleString()}</TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {project.createdAt.toLocaleDateString('he-IL')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {updatedAt.toLocaleDateString('he-IL')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={isActive ? 'פעיל' : 'לא פעיל'} 
                          color={isActive ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
        {projects.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography color="text.secondary">אין פרויקטים במערכת</Typography>
          </Box>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">כל המשתמשים והזמנות</Typography>
          <TextField
            size="small"
            placeholder="חיפוש משתמש..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>סטטוס</TableCell>
                <TableCell>שם</TableCell>
                <TableCell>אימייל</TableCell>
                <TableCell>תאריך</TableCell>
                <TableCell>פרויקטים</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Registered Users */}
              {users
                .filter(u => 
                  searchTerm === '' || 
                  u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  u.email?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((user) => {
                  // מצא פרויקטים שהמשתמש בעלים או חבר בהם
                  const userProjects = projects.filter(p => {
                    // בעל הפרויקט
                    if (p.ownerId === user.id) return true;
                    // חבר בפרויקט
                    const isMember = projectUsers.some(pu => pu.userId === user.id && pu.projectId === p.id);
                    return isMember;
                  });
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Chip 
                          label="פעיל" 
                          color="success"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="medium">{user.name || 'לא ידוע'}</Typography>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {user.createdAt?.toLocaleDateString('he-IL')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {userProjects.length > 0 ? (
                          <Box display="flex" flexDirection="column" gap={0.5}>
                            {userProjects.map(p => (
                              <Chip 
                                key={p.id}
                                label={p.name} 
                                size="small"
                                color="primary"
                                variant="outlined"
                                onClick={() => router.push(`/dashboard/${p.id}`)}
                                sx={{ cursor: 'pointer', width: 'fit-content' }}
                              />
                            ))}
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">אין פרויקטים</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              
              {/* Pending Invitations */}
              {pendingInvitations
                .filter(inv => 
                  searchTerm === '' || 
                  inv.email?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((invitation) => {
                  // מצא את שם הפרויקט
                  const project = projects.find(p => p.id === invitation.projectId);
                  
                  return (
                    <TableRow key={invitation.id} sx={{ bgcolor: '#fff3e0' }}>
                      <TableCell>
                        <Chip 
                          label="ממתין" 
                          color="warning"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="medium" color="text.secondary">
                          טרם נרשם
                        </Typography>
                      </TableCell>
                      <TableCell>{invitation.email}</TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {invitation.createdAt?.toLocaleDateString('he-IL')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {project && (
                          <Chip 
                            label={project.name} 
                            size="small"
                            color="warning"
                            variant="outlined"
                            sx={{ width: 'fit-content' }}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
        {users.length === 0 && pendingInvitations.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography color="text.secondary">אין משתמשים במערכת</Typography>
          </Box>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h6">כל הספקים והקבלנים</Typography>
          <TextField
            size="small"
            placeholder="חיפוש ספק..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>שם</TableCell>
                <TableCell>טלפון</TableCell>
                <TableCell>אימייל</TableCell>
                <TableCell>קטגוריה</TableCell>
                <TableCell>פרויקט</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {vendors
                .filter(v => 
                  searchTerm === '' || 
                  v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  v.category?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((vendor) => {
                  const project = projects.find(p => p.id === vendor.projectId);
                  return (
                    <TableRow key={vendor.id}>
                      <TableCell>
                        <Typography fontWeight="medium">{vendor.name}</Typography>
                      </TableCell>
                      <TableCell>{vendor.phone || '-'}</TableCell>
                      <TableCell>{vendor.email || '-'}</TableCell>
                      <TableCell>
                        <Chip label={vendor.category || 'כללי'} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {project?.name || 'לא ידוע'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
        {vendors.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography color="text.secondary">אין ספקים במערכת</Typography>
          </Box>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        <Typography variant="h6" gutterBottom>הגדרות מערכת</Typography>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              מנהלי מערכת
            </Typography>
            <Typography variant="body2" color="text.secondary">
              כרגע יש מנהל אחד: {user?.email}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
              להוספת מנהלים נוספים, ערוך את הקובץ adminConfig.ts
            </Typography>
          </CardContent>
        </Card>
      </TabPanel>
    </Container>
  );
}
