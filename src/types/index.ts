// User types
export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

// Role types
export type ProjectRole = 'OWNER' | 'ADMIN' | 'FAMILY' | 'CONTRACTOR' | 'DESIGNER' | 'VIEW_ONLY';

// Project types
export interface Project {
  id: string;
  name: string;
  address: string;
  ownerId: string;
  budgetPlanned: number;
  budgetAllowedOverflowPercent: number;
  createdAt: Date;
  designerName?: string;
  designerPhone?: string;
  designerEmail?: string;
}

export interface ProjectUser {
  id: string;
  projectId: string;
  userId: string;
  roleInProject: ProjectRole;
}

// Room types
export type RoomType = 'BEDROOM' | 'BATHROOM' | 'KITCHEN' | 'LIVING_ROOM' | 'OTHER';
export type RoomStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';

export interface Room {
  id: string;
  projectId: string;
  name: string;
  type: RoomType;
  status: RoomStatus;
  isUsable: boolean;
  icon?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Task types
export type TaskCategory = 'PLUMBING' | 'ELECTRICITY' | 'PAINT' | 'FLOORING' | 'CARPENTRY' | 'GENERAL' | 'OTHER';
export type TaskStatus = 'NO_STATUS' | 'NOT_STARTED' | 'IN_PROGRESS' | 'WAITING' | 'DONE' | 'NOT_RELEVANT' | 'BLOCKED';

export interface Task {
  id: string;
  projectId: string;
  roomId?: string;
  title: string;
  description?: string;
  category: TaskCategory | string;
  status: TaskStatus | string;
  startPlanned?: Date;
  endPlanned?: Date;
  startActual?: Date;
  endActual?: Date;
  assignedToVendorId?: string;
  dependencies?: string[];
  budgetAllocated?: number;
  createdAt?: Date;
  updatedAt?: Date;
  // Additional fields used in rooms page
  startDate?: string;
  endDate?: string;
  dueDate?: string | null;
  progress?: number;
  autoUpdateStatus?: boolean;
  completed?: boolean;
}

// Project Owner/Contact types
export interface ProjectOwner {
  id: string;
  projectId: string;
  name: string;
  phone: string;
  email: string;
  role: 'PRIMARY_OWNER' | 'CO_OWNER' | 'OTHER_CONTACT';
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Vendor types
export type VendorType = 'CONTRACTOR' | 'FLOORING' | 'CARPENTER' | 'SANITARY' | 'DOORS' | 'ELECTRICIAN' | 'OTHER';

export interface Vendor {
  id: string;
  projectId: string;
  name: string;
  type: VendorType;
  phone: string;
  email: string;
  notes?: string;
}

// Meeting types
export type MeetingType = 'SITE_VISIT' | 'PLANNING' | 'SUPPLIER' | 'HANDOVER' | 'OTHER';

export interface MeetingActionItem {
  id: string;
  description: string;
  assigneeVendorId: string;
  dueDate: Date | null;
  status: 'PENDING' | 'COMPLETED';
  createdAsTaskId?: string;
}

export interface Meeting {
  id: string;
  projectId: string;
  createdAt: Date;
  updatedAt?: Date;
  meetingDate: Date;
  dueDate?: Date | null;
  meetingType: MeetingType;
  title: string;
  description: string;
  completed?: boolean;
  
  participantVendorIds: string[];
  relatedRoomId?: string;
  relatedVendorId?: string;
  
  decisions: string[];
  actionItems: MeetingActionItem[];
  
  attachments: Array<{
    url: string;
    fileName: string;
  }>;
  
  sharedWith: Array<{
    vendorId: string;
    sharedAt: Date;
    sharedVia: 'EMAIL' | 'WHATSAPP' | 'PDF_LINK';
  }>;
}

// Payment types
export type PaymentStatus = 'PLANNED' | 'DUE' | 'PAID' | 'OVERDUE';
export type PaymentMethod = 'CHEQUE' | 'BANK_TRANSFER' | 'CASH' | 'CREDIT_CARD';

export interface Payment {
  id: string;
  projectId: string;
  vendorId: string;
  category: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  chequeDueDate?: Date;
  paymentDate?: Date;
  relatedTaskId?: string;
  notes?: string;
}

// Contract types
export interface Contract {
  id: string;
  projectId: string;
  vendorId: string;
  title: string;
  fileUrl: string;
  termsSummary?: string;
  createdAt: Date;
}

// Notification types
export interface NotificationSettings {
  id: string;
  projectId: string;
  userId: string;
  notifyByEmail: boolean;
  notifyByWhatsApp: boolean;
  daysBeforePaymentDue: number;
}

// Helper type for role permissions
export interface RolePermissions {
  canViewBudget: boolean;
  canEditBudget: boolean;
  canViewPayments: boolean;
  canEditPayments: boolean;
  canManageUsers: boolean;
  canEditProject: boolean;
  canEditTasks: boolean;
  canEditRooms: boolean;
}
