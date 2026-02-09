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
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '@/contexts/AuthContext';
import { isSuperAdmin } from '@/lib/adminConfig';

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

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!isSuperAdmin(user.email)) {
      router.push('/projects');
      return;
    }

    setLoading(false);
  }, [user, router]);

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
        <Typography variant="h6">סטטיסטיקות כלליות</Typography>
        <Typography color="text.secondary">בקרוב...</Typography>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6">ניהול פרויקטים</Typography>
        <Typography color="text.secondary">בקרוב...</Typography>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Typography variant="h6">ניהול משתמשים</Typography>
        <Typography color="text.secondary">בקרוב...</Typography>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Typography variant="h6">רשימת ספקים וקבלנים</Typography>
        <Typography color="text.secondary">בקרוב...</Typography>
      </TabPanel>

      <TabPanel value={tabValue} index={4}>
        <Typography variant="h6">הגדרות מערכת</Typography>
        <Typography color="text.secondary">בקרוב...</Typography>
      </TabPanel>
    </Container>
  );
}
