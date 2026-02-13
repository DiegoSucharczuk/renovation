// Google Drive Integration for File Storage
// Files are stored in the user's personal Google Drive
// Security: Token stored in memory only (not localStorage) with short TTL

import { auth } from './firebase';
import { GoogleAuthProvider } from 'firebase/auth';

// In-memory token cache with expiration
let cachedToken: { token: string; expiresAt: number } | null = null;

// Get Access Token with in-memory caching (expires after 50 minutes)
const getAccessToken = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Check if we have a valid cached token
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  // Check if user has Google provider
  const googleProvider = user.providerData.find(
    (provider: any) => provider.providerId === GoogleAuthProvider.PROVIDER_ID
  );
  
  if (!googleProvider) {
    throw new Error('Please sign in with Google to use file uploads');
  }

  // If no valid token, user needs to sign in again
  const error = new Error('Drive access expired. Please sign out and sign in again with Google.');
  (error as any).code = 'TOKEN_EXPIRED';
  throw error;
};

// Set the OAuth Access Token (called after Google Sign-In)
// Token is cached in memory only (not localStorage) for security
// Expires after 50 minutes (Google tokens expire after 1 hour)
// Note: Auto-refresh is not implemented because Google Drive tokens require user interaction
// Users will need to re-authenticate when the token expires
export const setDriveAccessToken = (token: string) => {
  cachedToken = {
    token,
    expiresAt: Date.now() + 50 * 60 * 1000 // 50 minutes
  };
  console.log('Drive access token cached securely (in-memory only, 50min TTL)');
  console.log('Token will expire at:', new Date(Date.now() + 50 * 60 * 1000).toLocaleTimeString());
};

// Clear the OAuth Access Token (called on sign out)
export const clearDriveAccessToken = () => {
  cachedToken = null;
  console.log('Drive access cleared');
};

// Request Google Drive permission from user
export const requestDriveAccess = async (): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if we have a valid access token
    const hasToken = cachedToken !== null && Date.now() < cachedToken.expiresAt;
    return hasToken;
  } catch (error) {
    console.error('Error requesting drive access:', error);
    return false;
  }
};

// Upload file to user's Google Drive and share with project members
export const uploadToDrive = async (
  file: File,
  folder: string = 'שיפוץ-קבצים',
  userEmails?: string[] // Optional: emails of users to share with
): Promise<{ id: string; webViewLink: string; webContentLink: string }> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const token = await getAccessToken();

    // Create folder if doesn't exist
    const folderId = await getOrCreateFolder(folder, token);

    // Upload file metadata
    const metadata = {
      name: file.name,
      parents: [folderId],
      mimeType: file.type,
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
      }
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Share with project members if emails provided
    if (userEmails && userEmails.length > 0) {
      console.log('Sharing file with users:', userEmails);
      await shareFileWithUsers(data.id, userEmails, token);
      console.log('File shared successfully with', userEmails.length, 'users');
    } else {
      console.log('No users to share with');
    }
    
    return data;
  } catch (error) {
    console.error('Error uploading to Drive:', error);
    throw error;
  }
};

// Get or create folder in Drive
const getOrCreateFolder = async (folderName: string, token: string): Promise<string> => {
  try {
    // Search for existing folder
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id)`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const searchData = await searchResponse.json();
    
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // Create new folder
    const metadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    const createResponse = await fetch(
      'https://www.googleapis.com/drive/v3/files?fields=id',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata),
      }
    );

    const createData = await createResponse.json();
    return createData.id;
  } catch (error) {
    console.error('Error getting/creating folder:', error);
    throw error;
  }
};

// Delete file from Drive
export const deleteFromDrive = async (fileId: string): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const token = await getAccessToken();

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting from Drive:', error);
    throw error;
  }
};

// Get file info from Drive
export const getFileInfo = async (fileId: string) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const token = await getAccessToken();

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,webViewLink,webContentLink,thumbnailLink`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get file info: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting file info:', error);
    throw error;
  }
};

// Fetch file as blob with authentication for displaying images
// Returns null if token expired or user not authenticated (silent fail)
export const fetchFileAsBlob = async (fileId: string): Promise<string | null> => {
  try {
    const token = await getAccessToken();

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error: any) {
    // Silently return null if token expired or user not authenticated
    // This allows viewing the app without Google Drive access
    if (error.code === 'TOKEN_EXPIRED' || error.message?.includes('not authenticated')) {
      return null;
    }
    console.error('Error fetching file as blob:', error);
    return null;
  }
};

// Share file with multiple users
export const shareFileWithUsers = async (
  fileId: string,
  userEmails: string[],
  token?: string
): Promise<void> => {
  try {
    const accessToken = token || await getAccessToken();
    
    console.log(`Starting to share file ${fileId} with ${userEmails.length} users:`, userEmails);
    
    // Share with each user
    for (const email of userEmails) {
      try {
        const permission = {
          type: 'user',
          role: 'reader', // Can view but not edit
          emailAddress: email,
        };

        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(permission),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to share with ${email}:`, response.statusText, errorText);
        } else {
          console.log(`Successfully shared with ${email}`);
        }
      } catch (error) {
        console.error(`Error sharing with ${email}:`, error);
      }
    }
  } catch (error) {
    console.error('Error sharing file:', error);
    throw error;
  }
};
