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
import EventNoteIcon from '@mui/icons-material/EventNote';
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
    { text: 'סיכומי פגישות', icon: <EventNoteIcon />, path: `/dashboard/${projectId}/meetings` },
  ];

  const drawer = (
    <div>
      <Toolbar sx={{ 
        background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
        color: 'white',
        py: 2.5,
      }}>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
          ניהול שיפוצים
        </Typography>
      </Toolbar>
      <Divider sx={{ backgroundColor: '#e0e0e0' }} />
      <List sx={{ pt: 1.5, pb: 1.5 }}>
        {menuItems.filter(item => !item.hidden).map((item) => {
          const isSelected = pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.75 }}>
              <ListItemButton
                selected={isSelected}
                onClick={() => router.push(item.path)}
                sx={{
                  mx: 1,
                  borderRadius: 1.5,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
                  color: isSelected ? '#1565c0' : '#424242',
                  '& .MuiListItemIcon-root': {
                    color: isSelected ? '#1565c0' : '#666',
                    transition: 'color 0.3s ease',
                    minWidth: 40,
                  },
                  '& .MuiListItemText-primary': {
                    fontSize: '0.95rem',
                    fontWeight: isSelected ? 600 : 500,
                    transition: 'font-weight 0.3s ease',
                  },
                  '&:hover': {
                    backgroundColor: isSelected ? '#e3f2fd' : '#f5f5f5',
                    color: '#1565c0',
                    '& .MuiListItemIcon-root': {
                      color: '#1565c0',
                    },
                  },
                  paddingLeft: '12px',
                  paddingRight: '12px',
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}
        
        {/* הגדרות עם תת-תפריט */}
        {canManageUsers && (
          <>
            <ListItem disablePadding sx={{ mb: 0.75 }}>
              <ListItemButton 
                onClick={() => setSettingsOpen(!settingsOpen)}
                sx={{
                  mx: 1,
                  borderRadius: 1.5,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backgroundColor: settingsOpen ? '#f5f5f5' : 'transparent',
                  color: '#424242',
                  '& .MuiListItemIcon-root': {
                    color: '#666',
                    minWidth: 40,
                    transition: 'color 0.3s ease',
                  },
                  '& .MuiListItemText-primary': {
                    fontSize: '0.95rem',
                    fontWeight: 500,
                  },
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                    color: '#1565c0',
                    '& .MuiListItemIcon-root': {
                      color: '#1565c0',
                    },
                  },
                  paddingLeft: '12px',
                  paddingRight: '12px',
                }}
              >
                <ListItemIcon><SettingsIcon /></ListItemIcon>
                <ListItemText primary="הגדרות" />
                {settingsOpen ? <ExpandLess sx={{ color: '#1565c0' }} /> : <ExpandMore />}
              </ListItemButton>
            </ListItem>
            <Collapse in={settingsOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding sx={{ pl: 1, mt: 0.5 }}>
                <ListItemButton
                  sx={{ 
                    pl: 3.5,
                    pr: 2,
                    mx: 1,
                    my: 0.5,
                    borderRadius: 1.5,
                    backgroundColor: pathname === `/dashboard/${projectId}/settings` ? '#e3f2fd' : 'transparent',
                    color: pathname === `/dashboard/${projectId}/settings` ? '#1565c0' : '#666',
                    fontSize: '0.9rem',
                    '& .MuiListItemIcon-root': {
                      color: pathname === `/dashboard/${projectId}/settings` ? '#1565c0' : '#999',
                      minWidth: 36,
                    },
                    '&:hover': {
                      backgroundColor: pathname === `/dashboard/${projectId}/settings` ? '#e3f2fd' : '#f9f9f9',
                      color: '#1565c0',
                    },
                    transition: 'all 0.2s ease',
                  }}
                  selected={pathname === `/dashboard/${projectId}/settings`}
                  onClick={() => router.push(`/dashboard/${projectId}/settings`)}
                >
                  <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="פרטי פרויקט" primaryTypographyProps={{ fontSize: '0.9rem' }} />
                </ListItemButton>
                <ListItemButton
                  sx={{ 
                    pl: 3.5,
                    pr: 2,
                    mx: 1,
                    my: 0.5,
                    borderRadius: 1.5,
                    backgroundColor: pathname === `/dashboard/${projectId}/settings/users` ? '#e3f2fd' : 'transparent',
                    color: pathname === `/dashboard/${projectId}/settings/users` ? '#1565c0' : '#666',
                    fontSize: '0.9rem',
                    '& .MuiListItemIcon-root': {
                      color: pathname === `/dashboard/${projectId}/settings/users` ? '#1565c0' : '#999',
                      minWidth: 36,
                    },
                    '&:hover': {
                      backgroundColor: pathname === `/dashboard/${projectId}/settings/users` ? '#e3f2fd' : '#f9f9f9',
                      color: '#1565c0',
                    },
                    transition: 'all 0.2s ease',
                  }}
                  selected={pathname === `/dashboard/${projectId}/settings/users`}
                  onClick={() => router.push(`/dashboard/${projectId}/settings/users`)}
                >
                  <ListItemIcon><GroupIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="ניהול משתמשים" primaryTypographyProps={{ fontSize: '0.9rem' }} />
                </ListItemButton>
                <ListItemButton
                  sx={{ 
                    pl: 3.5,
                    pr: 2,
                    mx: 1,
                    my: 0.5,
                    borderRadius: 1.5,
                    backgroundColor: pathname === `/dashboard/${projectId}/settings/owners` ? '#e3f2fd' : 'transparent',
                    color: pathname === `/dashboard/${projectId}/settings/owners` ? '#1565c0' : '#666',
                    fontSize: '0.9rem',
                    '& .MuiListItemIcon-root': {
                      color: pathname === `/dashboard/${projectId}/settings/owners` ? '#1565c0' : '#999',
                      minWidth: 36,
                    },
                    '&:hover': {
                      backgroundColor: pathname === `/dashboard/${projectId}/settings/owners` ? '#e3f2fd' : '#f9f9f9',
                      color: '#1565c0',
                    },
                    transition: 'all 0.2s ease',
                  }}
                  selected={pathname === `/dashboard/${projectId}/settings/owners`}
                  onClick={() => router.push(`/dashboard/${projectId}/settings/owners`)}
                >
                  <ListItemIcon><PeopleIcon fontSize="small" /></ListItemIcon>
                  <ListItemText primary="בעלי הבית" primaryTypographyProps={{ fontSize: '0.9rem' }} />
                </ListItemButton>
              </List>
            </Collapse>
          </>
        )}
      </List>
      <Divider sx={{ backgroundColor: '#e0e0e0', my: 2 }} />
      <List>
        <ListItem disablePadding sx={{ mb: 0.75 }}>
          <ListItemButton 
            onClick={() => router.push('/projects')}
            sx={{
              mx: 1,
              borderRadius: 1.5,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              backgroundColor: 'transparent',
              color: '#666',
              '& .MuiListItemText-primary': {
                fontSize: '0.95rem',
                fontWeight: 500,
              },
              '&:hover': {
                backgroundColor: '#f5f5f5',
                color: '#1565c0',
              },
              paddingLeft: '12px',
              paddingRight: '12px',
            }}
          >
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
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: drawerWidth,
            backgroundColor: '#fafafa',
            borderLeft: '1px solid #e0e0e0',
          },
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
            backgroundColor: '#fafafa',
            borderLeft: '1px solid #e0e0e0',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
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
