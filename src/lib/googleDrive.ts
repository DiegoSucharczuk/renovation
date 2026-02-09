// Google Drive Integration for File Storage
// Files are stored in the user's personal Google Drive

import { auth } from './firebase';

const DRIVE_TOKEN_KEY = 'drive_access_token';

// Store OAuth Access Token (persisted in localStorage)
let cachedAccessToken: string | null = null;

// Load token from localStorage on module initialization
if (typeof window !== 'undefined') {
  const savedToken = localStorage.getItem(DRIVE_TOKEN_KEY);
  if (savedToken) {
    cachedAccessToken = savedToken;
    console.log('Drive access token loaded from storage');
  }
}

// Set the OAuth Access Token (called after Google Sign-In)
export const setDriveAccessToken = (token: string) => {
  cachedAccessToken = token;
  if (typeof window !== 'undefined') {
    localStorage.setItem(DRIVE_TOKEN_KEY, token);
  }
  console.log('Drive access token stored successfully');
};

// Clear the OAuth Access Token (called on sign out)
export const clearDriveAccessToken = () => {
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DRIVE_TOKEN_KEY);
  }
  console.log('Drive access token cleared');
};

// Get the stored Access Token
const getAccessToken = async (): Promise<string> => {
  // Try to load from localStorage if not in memory
  if (!cachedAccessToken && typeof window !== 'undefined') {
    const savedToken = localStorage.getItem(DRIVE_TOKEN_KEY);
    if (savedToken) {
      cachedAccessToken = savedToken;
    }
  }
  
  if (cachedAccessToken) {
    return cachedAccessToken;
  }
  
  // If no token, user needs to sign in again with Drive scope
  throw new Error('No Drive access token. Please sign in again.');
};

// Request Google Drive permission from user
export const requestDriveAccess = async (): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if we have an access token
    const hasToken = cachedAccessToken !== null;
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
      await shareFileWithUsers(data.id, userEmails, token);
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
export const fetchFileAsBlob = async (fileId: string): Promise<string> => {
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
  } catch (error) {
    console.error('Error fetching file as blob:', error);
    throw error;
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
          console.error(`Failed to share with ${email}:`, response.statusText);
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
