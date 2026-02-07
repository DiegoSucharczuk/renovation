import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, getDocsFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ProjectRole, RolePermissions } from '@/types';
import { getRolePermissions } from '@/lib/permissions';

export function useProjectRole(projectId: string | null, userId: string | null) {
  const [role, setRole] = useState<ProjectRole | null>(null);
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!projectId || !userId) {
        setLoading(false);
        return;
      }

      try {
        // בדיקה אם המשתמש הוא הבעלים של הפרויקט
        const projectDoc = await getDocsFromServer(
          query(collection(db, 'projects'), where('__name__', '==', projectId))
        );
        
        if (!projectDoc.empty) {
          const projectData = projectDoc.docs[0].data();
          if (projectData.ownerId === userId) {
            setRole('OWNER');
            setPermissions(getRolePermissions('OWNER'));
            setIsOwner(true);
            setLoading(false);
            return;
          }
        }

        // אם לא בעלים, בדיקה בטבלת projectUsers
        const projectUsersQuery = query(
          collection(db, 'projectUsers'),
          where('projectId', '==', projectId),
          where('userId', '==', userId)
        );
        
        const projectUsersSnapshot = await getDocsFromServer(projectUsersQuery);
        
        if (!projectUsersSnapshot.empty) {
          const userRole = projectUsersSnapshot.docs[0].data().roleInProject as ProjectRole;
          setRole(userRole);
          setPermissions(getRolePermissions(userRole));
        } else {
          // אין הרשאה לפרויקט
          setRole(null);
          setPermissions(null);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
        setPermissions(null);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [projectId, userId]);

  return { role, permissions, isOwner, loading };
}
