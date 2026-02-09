'use client';

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
import { collection, getDocsFromServer, query, where } from 'firebase/firestore';
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
  const [tabValue, setTabValue] = useState(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [projectUsers, setProjectUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalUsers: 0,
    totalVendors: 0,
    totalBudget: 0,
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!isSuperAdmin(user.email)) {
      router.push('/projects');
      return;
    }

    fetchAllData();
  }, [user, router]);

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

      // Calculate stats
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const activeProjects = projectsData.filter(p => {
        const projectData = p as any;
        const updatedAt = projectData.updatedAt || p.createdAt;
        return updatedAt >= thirtyDaysAgo;
      });

      const totalBudget = projectsData.reduce((sum, p) => sum + (p.budgetPlanned || 0), 0);

      setStats({
        totalProjects: projectsData.length,
        activeProjects: activeProjects.length,
        totalUsers: usersData.length,
        totalVendors: vendorsData.length,
        totalBudget,
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress />
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
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3 }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                סה"כ פרויקטים
              </Typography>
              <Typography variant="h4" component="div">
                {stats.totalProjects}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ backgroundColor: '#e8f5e9' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                פרויקטים פעילים
              </Typography>
              <Typography variant="h4" component="div" color="success.main">
                {stats.activeProjects}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                עדכון ב-30 הימים האחרונים
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                משתמשים במערכת
              </Typography>
              <Typography variant="h4" component="div">
                {stats.totalUsers}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ backgroundColor: '#fff3e0' }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                תקציב כולל
              </Typography>
              <Typography variant="h4" component="div" color="warning.main">
                ₪{stats.totalBudget.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                ספקים וקבלנים
              </Typography>
              <Typography variant="h4" component="div">
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
          <Typography variant="h6">כל המשתמשים</Typography>
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
                <TableCell>שם</TableCell>
                <TableCell>אימייל</TableCell>
                <TableCell>תאריך הצטרפות</TableCell>
                <TableCell>פרויקטים</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
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
                          <Stack direction="column" spacing={0.5}>
                            {userProjects.map(p => (
                              <Chip 
                                key={p.id}
                                label={p.name} 
                                size="small"
                                color="primary"
                                variant="outlined"
                                onClick={() => router.push(`/dashboard/${p.id}`)}
                                sx={{ cursor: 'pointer' }}
                              />
                            ))}
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.secondary">אין פרויקטים</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>
        {users.length === 0 && (
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
