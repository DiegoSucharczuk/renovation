'use client';

import { useState } from 'react';
import { Box, Button, Typography, CircularProgress, Alert } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

interface FileUploadProps {
  label: string;
  currentUrl?: string;
  onUploadComplete: (url: string) => void;
  onDelete?: () => void;
  accept?: string;
  folder?: string;
}

export default function FileUpload({
  label,
  currentUrl,
  onUploadComplete,
  onDelete,
  accept = 'image/*,application/pdf',
  folder = 'uploads',
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      // Create unique filename
      const timestamp = Date.now();
      const filename = `${folder}/${timestamp}_${file.name}`;
      const storageRef = ref(storage, filename);

      // Upload file
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(prog);
        },
        (error) => {
          console.error('Upload error:', error);
          setError('שגיאה בהעלאת הקובץ');
          setUploading(false);
        },
        async () => {
          // Get download URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          onUploadComplete(downloadURL);
          setUploading(false);
          setProgress(0);
        }
      );
    } catch (err) {
      console.error('Upload error:', err);
      setError('שגיאה בהעלאת הקובץ');
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentUrl) return;
    
    if (!confirm('האם למחוק את הקובץ?')) return;

    try {
      // Extract filename from URL and delete from storage
      const fileRef = ref(storage, currentUrl);
      await deleteObject(fileRef);
      if (onDelete) onDelete();
    } catch (err) {
      console.error('Delete error:', err);
      setError('שגיאה במחיקת הקובץ');
    }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={1}>
        {label}
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}

      {currentUrl ? (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button
            variant="outlined"
            size="small"
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            צפה בקובץ
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
          >
            מחק
          </Button>
        </Box>
      ) : (
        <Box>
          <input
            accept={accept}
            style={{ display: 'none' }}
            id={`file-upload-${label}`}
            type="file"
            onChange={handleFileSelect}
            disabled={uploading}
          />
          <label htmlFor={`file-upload-${label}`}>
            <Button
              variant="outlined"
              component="span"
              startIcon={uploading ? <CircularProgress size={20} /> : <UploadFileIcon />}
              disabled={uploading}
            >
              {uploading ? `מעלה... ${Math.round(progress)}%` : 'בחר קובץ'}
            </Button>
          </label>
        </Box>
      )}
    </Box>
  );
}
