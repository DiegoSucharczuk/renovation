export interface Payment {
  id: string;
  vendorId?: string; // Added for Firestore queries
  date?: string; // תאריך תשלום בפועל (רק לתשלומים ששולמו)
  amount: number;
  method: 'מזומן' | 'העברה בנקאית' | 'צ׳ק' | 'אשראי' | 'ביט' | 'פייבוקס';
  status: 'שולם' | 'ממתין' | 'מתוכנן';
  description?: string;
  invoiceUrl?: string; // חשבונית
  invoiceDescription?: string;
  receiptUrl?: string; // קבלה
  receiptDescription?: string;
  notes?: string;
  progressPercentage?: number; // אחוז התקדמות צפוי (לתשלומים מתוכננים/ממתינים)
  estimatedDate?: string; // תאריך משוער (לתשלומים מתוכננים/ממתינים)
}

export interface Vendor {
  id: string;
  name: string;
  category: string; // קישור לקטגוריית משימה
  phone: string;
  email?: string;
  address?: string;
  businessId?: string; // ח.פ / ת.ז
  logoUrl?: string;
  contractFileUrl?: string;
  
  // פיננסי
  contractAmount?: number;
  payments: Payment[];
  
  // מידע נוסף
  contactPerson?: string;
  whatsappNumber?: string;
  licenseNumber?: string;
  warrantyMonths?: number;
  insuranceCompany?: string;
  rating?: number; // 1-5
  notes?: string;
  recommendedBy?: string;
  
  // בנק
  bankName?: string;
  bankAccount?: string;
  bankBranch?: string;
  
  // תאריכים
  startDate?: string;
  endDate?: string;
  
  createdAt: string;
  updatedAt: string;
}
