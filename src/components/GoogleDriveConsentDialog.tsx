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
} from '@mui/material';
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
      maxWidth="sm"
      fullWidth
      dir="rtl"
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CloudIcon color="primary" />
        <Typography variant="h6">
          חיבור ל-Google Drive
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 2 }}>
          <Typography variant="body1" fontWeight="500">
            חיבור ל-Google Drive נדרש רק לצורך העלאה והורדה של קבצים (לוגואים, חשבוניות, חוזים)
          </Typography>
        </Alert>

        <Typography variant="body2" color="text.secondary" paragraph>
          <strong>לצפייה בפרויקט אין צורך בחיבור.</strong> הקבצים יישמרו ב-Google Drive האישי שלך, לא בשרתים חיצוניים.
        </Typography>

        <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LockIcon fontSize="small" color="primary" />
            אבטחה:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • האפליקציה רואה רק קבצים שהיא יצרה<br/>
            • הקבצים בחשבון שלך, מוצפנים ע"י Google<br/>
            • ניתן לבטל הרשאה בכל עת דרך <Link href="https://myaccount.google.com/permissions" target="_blank">הגדרות Google</Link>
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined">
          ביטול
        </Button>
        <Button onClick={onAccept} variant="contained" color="primary">
          אשר והמשך
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GoogleDriveConsentDialog;
