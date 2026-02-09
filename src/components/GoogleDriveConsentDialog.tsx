'use client';

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LockIcon from '@mui/icons-material/Lock';
import CloudIcon from '@mui/icons-material/Cloud';
import InfoIcon from '@mui/icons-material/Info';

interface GoogleDriveConsentDialogProps {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
}

const GoogleDriveConsentDialog: React.FC<GoogleDriveConsentDialogProps> = ({
  open,
  onClose,
  onAccept,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      dir="rtl"
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CloudIcon color="primary" />
        <Typography variant="h6">
          שמירת קבצים ב-Google Drive שלך
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" paragraph>
            כדי לשמור קבצים (לוגואים, חוזים, חשבוניות), האפליקציה תשתמש ב-<strong>Google Drive האישי שלך</strong>.
          </Typography>
          
          <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2 }}>
            <Typography variant="body2">
              הקבצים יישמרו <strong>בחשבון Google Drive שלך</strong>, לא בשרתים חיצוניים.
            </Typography>
          </Alert>
        </Box>

        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          מה יקרה עכשיו:
        </Typography>
        
        <List dense>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="תיפתח חלון אישור מ-Google"
              secondary="תתבקש לאשר גישה ל-Google Drive שלך"
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="תיווצר תיקייה בשם 'שיפוץ-קבצים'"
              secondary="כל הקבצים שלך יישמרו בתיקייה הזו ב-Drive שלך"
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon color="success" />
            </ListItemIcon>
            <ListItemText 
              primary="אתה שולט על הקבצים שלך"
              secondary="תוכל לראות, לערוך ולמחוק את הקבצים ישירות מה-Drive שלך"
            />
          </ListItem>
        </List>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon fontSize="small" color="primary" />
            אבטחה ופרטיות:
          </Typography>
          <List dense>
            <ListItem sx={{ py: 0.5 }}>
              <ListItemText 
                primary="• האפליקציה רואה רק את הקבצים שהיא יצרה (לא את כל ה-Drive שלך)"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem sx={{ py: 0.5 }}>
              <ListItemText 
                primary="• הקבצים נשמרים בחשבון שלך, לא בשרתים חיצוניים"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
            <ListItem sx={{ py: 0.5 }}>
              <ListItemText 
                primary="• Google מצפין את כל הקבצים אוטומטית"
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          </List>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            איך לבטל את ההרשאה?
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            בכל רגע תוכל לבטל את גישת האפליקציה ל-Drive שלך דרך:
          </Typography>
          <Link 
            href="https://myaccount.google.com/permissions" 
            target="_blank"
            rel="noopener noreferrer"
            sx={{ display: 'block', mb: 1 }}
          >
            🔗 הגדרות Google → אפליקציות עם גישה לחשבון שלך
          </Link>
          <Typography variant="caption" color="text.secondary">
            או גש ל: https://myaccount.google.com/permissions
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined">
          ביטול
        </Button>
        <Button onClick={onAccept} variant="contained" color="primary">
          הבנתי, בואו נמשיך
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GoogleDriveConsentDialog;
