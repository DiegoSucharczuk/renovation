'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  Collapse,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import RoomIcon from '@mui/icons-material/Room';
import TaskIcon from '@mui/icons-material/Task';
import PeopleIcon from '@mui/icons-material/People';
import PaymentIcon from '@mui/icons-material/Payment';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import GroupIcon from '@mui/icons-material/Group';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectRole } from '@/hooks/useProjectRole';
import { hebrewLabels } from '@/lib/labels';
import type { Project } from '@/types';

const drawerWidth = 240;

interface DashboardLayoutProps {
  children: React.ReactNode;
  projectId: string;
  project?: Project;
}

export default function DashboardLayout({ children, projectId, project }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { signOut, user, firebaseUser } = useAuth();
  const { permissions } = useProjectRole(projectId, firebaseUser?.uid || null);
  const router = useRouter();
  const pathname = usePathname();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const menuItems = [
    { text: hebrewLabels.dashboard, icon: <DashboardIcon />, path: `/dashboard/${projectId}` },
    { text: hebrewLabels.rooms, icon: <RoomIcon />, path: `/dashboard/${projectId}/rooms` },
    { text: hebrewLabels.tasks, icon: <TaskIcon />, path: `/dashboard/${projectId}/tasks` },
    { text: hebrewLabels.vendors, icon: <PeopleIcon />, path: `/dashboard/${projectId}/vendors` },
    { text: hebrewLabels.payments, icon: <PaymentIcon />, path: `/dashboard/${projectId}/payments`, hidden: !permissions?.canViewPayments },
  ];

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          ניהול שיפוצים
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.filter(item => !item.hidden).map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={pathname === item.path}
              onClick={() => router.push(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
        
        {/* הגדרות עם תת-תפריט */}
        {permissions?.canManageUsers && (
          <>
            <ListItem disablePadding>
              <ListItemButton onClick={() => setSettingsOpen(!settingsOpen)}>
                <ListItemIcon><SettingsIcon /></ListItemIcon>
                <ListItemText primary="הגדרות" />
                {settingsOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>
            <Collapse in={settingsOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                <ListItemButton
                  sx={{ pl: 4 }}
                  selected={pathname === `/dashboard/${projectId}/settings`}
                  onClick={() => router.push(`/dashboard/${projectId}/settings`)}
                >
                  <ListItemIcon><SettingsIcon /></ListItemIcon>
                  <ListItemText primary="פרטי פרויקט" />
                </ListItemButton>
                <ListItemButton
                  sx={{ pl: 4 }}
                  selected={pathname === `/dashboard/${projectId}/settings/users`}
                  onClick={() => router.push(`/dashboard/${projectId}/settings/users`)}
                >
                  <ListItemIcon><GroupIcon /></ListItemIcon>
                  <ListItemText primary="ניהול משתמשים" />
                </ListItemButton>
              </List>
            </Collapse>
          </>
        )}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={() => router.push('/projects')}>
            <ListItemText primary="חזרה לפרויקטים" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mr: { sm: `${drawerWidth}px` },
          pr: { sm: 0 },
        }}
      >
        <Toolbar sx={{ pr: { sm: 1 } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ ml: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            {project && (
              <>
                <Typography variant="h6" noWrap component="div" fontWeight={700}>
                  {project.name}
                </Typography>
                <Typography variant="caption" noWrap component="div" sx={{ opacity: 0.9 }}>
                  {project.address}
                </Typography>
              </>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" noWrap sx={{ display: { xs: 'none', md: 'block' } }}>
              {user?.name}
            </Typography>
            <Button color="inherit" onClick={handleSignOut} startIcon={<LogoutIcon />}>
              {hebrewLabels.signOut}
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ 
          width: { sm: drawerWidth }, 
          flexShrink: { sm: 0 },
          position: { sm: 'fixed' },
          right: { sm: 0 },
          top: { sm: 0 },
          height: { sm: '100vh' },
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              position: 'fixed',
              right: 0,
            },
          }}
          open
          anchor="right"
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          pt: 3,
          pb: 3,
          pl: { xs: 2, sm: 1 },
          pr: 0,
          mr: { sm: `${drawerWidth}px` },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
