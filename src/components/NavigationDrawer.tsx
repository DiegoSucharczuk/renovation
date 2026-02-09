'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Drawer,
  List,
  Typography,
  Divider,
  Toolbar,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import RoomIcon from '@mui/icons-material/Room';
import TaskIcon from '@mui/icons-material/Task';
import PeopleIcon from '@mui/icons-material/People';
import PaymentIcon from '@mui/icons-material/Payment';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupIcon from '@mui/icons-material/Group';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { hebrewLabels } from '@/lib/labels';

const drawerWidth = 240;

interface NavigationDrawerProps {
  projectId: string;
  pathname: string;
  canManageUsers: boolean;
  canViewPayments: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function NavigationDrawer({ 
  projectId,
  pathname,
  canManageUsers, 
  canViewPayments,
  mobileOpen,
  onMobileClose
}: NavigationDrawerProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const router = useRouter();

  // Open settings if we're on a settings page
  useEffect(() => {
    if (pathname?.includes('/settings')) {
      setSettingsOpen(true);
    }
  }, [pathname]);

  const menuItems = [
    { text: hebrewLabels.dashboard, icon: <DashboardIcon />, path: `/dashboard/${projectId}` },
    { text: hebrewLabels.rooms, icon: <RoomIcon />, path: `/dashboard/${projectId}/rooms` },
    { text: hebrewLabels.tasks, icon: <TaskIcon />, path: `/dashboard/${projectId}/tasks` },
    { text: hebrewLabels.vendors, icon: <PeopleIcon />, path: `/dashboard/${projectId}/vendors` },
    { text: hebrewLabels.payments, icon: <PaymentIcon />, path: `/dashboard/${projectId}/payments`, hidden: !canViewPayments },
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
        {canManageUsers && (
          <>
            <ListItem disablePadding>
              <ListItemButton onClick={() => setSettingsOpen(!settingsOpen)}>
                <ListItemIcon><SettingsIcon /></ListItemIcon>
                <ListItemText primary="הגדרות" />
                {settingsOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>
            <Collapse in={settingsOpen} timeout={0}>
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
    <>
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
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
      
      {/* Desktop Drawer */}
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
    </>
  );
}
