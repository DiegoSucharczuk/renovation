import { Box, Card, CardContent, Typography, Button } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useRouter } from 'next/navigation';

interface AccessDeniedProps {
  message?: string;
  showBackButton?: boolean;
}

export default function AccessDenied({ 
  message = 'אין לך הרשאה לצפות בדף זה', 
  showBackButton = true 
}: AccessDeniedProps) {
  const router = useRouter();

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '60vh' 
      }}
    >
      <Card sx={{ maxWidth: 400, textAlign: 'center' }}>
        <CardContent sx={{ p: 4 }}>
          <LockIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            אין הרשאה
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {message}
          </Typography>
          {showBackButton && (
            <Button 
              variant="contained" 
              onClick={() => router.back()}
            >
              חזור
            </Button>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
