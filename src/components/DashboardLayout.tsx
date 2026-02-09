'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectRole } from '@/hooks/useProjectRole';
import { hebrewLabels } from '@/lib/labels';
import NavigationDrawer from './NavigationDrawer';
import type { Project } from '@/types';

const drawerWidth = 240;

interface DashboardLayoutProps {
  children: React.ReactNode;
  projectId: string;
  project?: Project;
}

export default function DashboardLayout({ children, projectId, project }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signOut, user, firebaseUser } = useAuth();
  const { permissions, loading } = useProjectRole(projectId, firebaseUser?.uid || null);
  const router = useRouter();
  const pathname = usePathname();

  // Stabilize permissions to prevent unnecessary re-renders
  const canManageUsers = permissions?.canManageUsers || false;
  const canViewPayments = permissions?.canViewPayments || false;

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <Box sx={{ display: 'flex', contain: 'layout style paint', willChange: 'auto' }}>
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
      
      <NavigationDrawer
        projectId={projectId}
        pathname={pathname || ''}
        canManageUsers={canManageUsers}
        canViewPayments={canViewPayments}
        mobileOpen={mobileOpen}
        onMobileClose={handleDrawerToggle}
      />
      
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
          minHeight: '100vh',
          transition: 'none',
          contain: 'layout style',
          willChange: 'auto',
          '& > *': {
            transition: 'none',
          }
        }}
      >
        <Toolbar />
        <Box sx={{ contain: 'layout', minHeight: 'calc(100vh - 64px)' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
