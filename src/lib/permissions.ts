import { ProjectRole, RolePermissions } from '@/types';

export function getRolePermissions(role: ProjectRole): RolePermissions {
  switch (role) {
    case 'OWNER':
    case 'ADMIN':
      return {
        canViewBudget: true,
        canEditBudget: true,
        canViewPayments: true,
        canEditPayments: true,
        canManageUsers: true,
        canEditProject: true,
        canEditTasks: true,
        canEditRooms: true,
      };
    case 'FAMILY':
      return {
        canViewBudget: true,
        canEditBudget: false,
        canViewPayments: true,
        canEditPayments: false,
        canManageUsers: false,
        canEditProject: false,
        canEditTasks: true,
        canEditRooms: true,
      };
    case 'CONTRACTOR':
    case 'DESIGNER':
      return {
        canViewBudget: false,
        canEditBudget: false,
        canViewPayments: false,
        canEditPayments: false,
        canManageUsers: false,
        canEditProject: false,
        canEditTasks: true,
        canEditRooms: false,
      };
    case 'VIEW_ONLY':
      return {
        canViewBudget: false,
        canEditBudget: false,
        canViewPayments: false,
        canEditPayments: false,
        canManageUsers: false,
        canEditProject: false,
        canEditTasks: false,
        canEditRooms: false,
      };
    default:
      return {
        canViewBudget: false,
        canEditBudget: false,
        canViewPayments: false,
        canEditPayments: false,
        canManageUsers: false,
        canEditProject: false,
        canEditTasks: false,
        canEditRooms: false,
      };
  }
}

export function canAccessFinancialData(role: ProjectRole): boolean {
  const permissions = getRolePermissions(role);
  return permissions.canViewBudget || permissions.canViewPayments;
}
