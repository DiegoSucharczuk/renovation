'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Card,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  CircularProgress,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Rating,
  Divider,
  Tooltip,
  Collapse,
  Avatar,
  Grid,
  CardContent,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PaymentIcon from '@mui/icons-material/Payment';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import UploadIcon from '@mui/icons-material/Upload';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import { doc, getDoc, collection, addDoc, updateDoc, deleteDoc, getDocs, query, where, getDocsFromServer, getDocFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadToDrive, deleteFromDrive, fetchFileAsBlob } from '@/lib/googleDrive';
import DashboardLayout from '@/components/DashboardLayout';
import GoogleDriveConsentDialog from '@/components/GoogleDriveConsentDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectRole } from '@/hooks/useProjectRole';
import AccessDenied from '@/components/AccessDenied';
import { hebrewLabels } from '@/lib/labels';
import { getTaskCategories } from '@/lib/taskCategories';
import { Vendor, Payment } from '@/types/vendor';
import type { Project } from '@/types';

const paymentMethods = [
  'מזומן',
  'העברה בנקאית',
  'צ׳ק',
  'אשראי',
  'ביט',
  'פייבוקס'
];

const paymentStatuses = [
  { value: 'שולם', color: 'success' as const },
  { value: 'ממתין', color: 'warning' as const },
  { value: 'מתוכנן', color: 'default' as const },
];

const mockVendors: Vendor[] = [
  {
    id: '1',
    name: 'יוסי הצבע',
    category: 'צביעה',
    phone: '050-1234567',
    email: 'yossi@example.com',
    businessId: '123456789',
    contractAmount: 35000,
    rating: 5,
    payments: [
      {
        id: '1',
        date: '2026-01-15',
        amount: 15000,
        method: 'העברה בנקאית',
        status: 'שולם',
        description: 'מקדמה',
      },
      {
        id: '2',
        date: '2026-02-01',
        amount: 10000,
        method: 'צ׳ק',
        status: 'שולם',
        description: 'תשלום ביניים',
      },
      {
        id: '3',
        date: '2026-02-20',
        amount: 10000,
        method: 'העברה בנקאית',
        status: 'מתוכנן',
        description: 'תשלום סופי',
      },
    ],
    createdAt: '2026-01-10',
    updatedAt: '2026-02-01',
  },
  {
    id: '2',
    name: 'דוד החשמלאי',
    category: 'חשמל',
    phone: '052-9876543',
    businessId: '987654321',
    contractAmount: 28000,
    rating: 4,
    payments: [
      {
        id: '1',
        date: '2026-01-20',
        amount: 14000,
        method: 'מזומן',
        status: 'שולם',
        description: 'מקדמה 50%',
      },
      {
        id: '2',
        date: '2026-02-15',
        amount: 14000,
        method: 'העברה בנקאית',
        status: 'ממתין',
        description: 'יתרת סיום',
      },
    ],
    createdAt: '2026-01-15',
    updatedAt: '2026-01-20',
  },
];

export default function VendorsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { user, firebaseUser } = useAuth();
  const router = useRouter();
  const { role, permissions, loading: roleLoading } = useProjectRole(projectId, firebaseUser?.uid || null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [taskCategories, setTaskCategories] = useState(getTaskCategories());
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  
  // Blob URLs for Drive images (cached)
  const [imageBlobUrls, setImageBlobUrls] = useState<Record<string, string>>({});
  
  // Google Drive Consent Dialog
  const [showDriveConsent, setShowDriveConsent] = useState(false);
  const [pendingFileUpload, setPendingFileUpload] = useState<{
    file: File;
    type: 'logo' | 'contract' | 'invoice' | 'receipt';
  } | null>(null);
  
  // Collapse state
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);
  
  // Files Dialog
  const [openFilesDialog, setOpenFilesDialog] = useState(false);
  const [selectedVendorForFiles, setSelectedVendorForFiles] = useState<Vendor | null>(null);
  
  // Single File Viewer Dialog
  const [openFileViewerDialog, setOpenFileViewerDialog] = useState(false);
  const [viewingFile, setViewingFile] = useState<{
    type: 'invoice' | 'receipt' | 'contract';
    url: string;
    description?: string;
    payment?: Payment;
    vendor?: Vendor;
  } | null>(null);
  
  // Vendor Dialog
  const [openVendorDialog, setOpenVendorDialog] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [vendorFormData, setVendorFormData] = useState({
    name: '',
    category: '',
    phone: '',
    email: '',
    address: '',
    businessId: '',
    contractAmount: '',
    contactPerson: '',
    whatsappNumber: '',
    licenseNumber: '',
    warrantyMonths: '',
    insuranceCompany: '',
    rating: 0,
    notes: '',
    recommendedBy: '',
    bankName: '',
    bankAccount: '',
    bankBranch: '',
    startDate: '',
    endDate: '',
    logoUrl: '',
    contractFileUrl: '',
  });

  // Payments Dialog
  const [openPaymentsDialog, setOpenPaymentsDialog] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [paymentFormData, setPaymentFormData] = useState({
    date: '',
    amount: '',
    method: 'העברה בנקאית',
    status: 'שולם',
    description: '',
    notes: '',
    invoiceUrl: '',
    invoiceDescription: '',
    receiptUrl: '',
    receiptDescription: '',
    progressPercentage: '',
    estimatedDate: '',
  });

  useEffect(() => {
    setMounted(true);
    setTaskCategories(getTaskCategories());
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Load project
      const projectDoc = await getDocFromServer(doc(db, 'projects', projectId));
      if (projectDoc.exists()) {
        const projectData = {
          id: projectDoc.id,
          ...projectDoc.data(),
          createdAt: projectDoc.data().createdAt?.toDate() || new Date(),
        } as Project;
        setProject(projectData);
      }

      // Load vendors
      const vendorsQuery = query(
        collection(db, 'vendors'),
        where('projectId', '==', projectId)
      );
      const vendorsSnapshot = await getDocsFromServer(vendorsQuery);
      const vendorsData = vendorsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Vendor[];

      // Load payments
      const paymentsQuery = query(
        collection(db, 'payments'),
        where('projectId', '==', projectId)
      );
      const paymentsSnapshot = await getDocsFromServer(paymentsQuery);
      const paymentsData = paymentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: typeof doc.data().date === 'string' ? doc.data().date : doc.data().date?.toDate?.()?.toISOString().split('T')[0] || '',
      })) as Payment[];

      // Attach payments to vendors and sort alphabetically
      const vendorsWithPayments = vendorsData.map(vendor => ({
        ...vendor,
        payments: paymentsData.filter(p => p.vendorId === vendor.id),
      })).sort((a, b) => a.name.localeCompare(b.name, 'he'));

      setVendors(vendorsWithPayments);
      setPayments(paymentsData);
      
      // Update selectedVendor if it exists
      if (selectedVendor) {
        const updatedSelectedVendor = vendorsWithPayments.find(v => v.id === selectedVendor.id);
        if (updatedSelectedVendor) {
          setSelectedVendor(updatedSelectedVendor);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    fetchData();
  }, [user, router, mounted, projectId]);

  // Load Drive files as blobs when vendors/payments change
  useEffect(() => {
    const loadDriveFiles = async () => {
      const newBlobUrls: Record<string, string> = { ...imageBlobUrls };
      
      // Load vendor logos
      for (const vendor of vendors) {
        if (vendor.logoUrl) {
          try {
            const fileData = parseFileData(vendor.logoUrl);
            if (fileData?.id && !newBlobUrls[fileData.id]) {
              const blobUrl = await fetchFileAsBlob(fileData.id);
              newBlobUrls[fileData.id] = blobUrl;
            }
          } catch (error) {
            console.error('Error loading vendor logo:', error);
          }
        }
        
        // Load vendor contracts
        if (vendor.contractFileUrl) {
          try {
            const fileData = parseFileData(vendor.contractFileUrl);
            if (fileData?.id && !newBlobUrls[fileData.id]) {
              const blobUrl = await fetchFileAsBlob(fileData.id);
              newBlobUrls[fileData.id] = blobUrl;
            }
          } catch (error) {
            console.error('Error loading vendor contract:', error);
          }
        }
      }
      
      // Load payment invoices and receipts
      for (const payment of payments) {
        if (payment.invoiceUrl) {
          try {
            const fileData = parseFileData(payment.invoiceUrl);
            if (fileData?.id && !newBlobUrls[fileData.id]) {
              const blobUrl = await fetchFileAsBlob(fileData.id);
              newBlobUrls[fileData.id] = blobUrl;
            }
          } catch (error) {
            console.error('Error loading payment invoice:', error);
          }
        }
        
        if (payment.receiptUrl) {
          try {
            const fileData = parseFileData(payment.receiptUrl);
            if (fileData?.id && !newBlobUrls[fileData.id]) {
              const blobUrl = await fetchFileAsBlob(fileData.id);
              newBlobUrls[fileData.id] = blobUrl;
            }
          } catch (error) {
            console.error('Error loading payment receipt:', error);
          }
        }
      }
      
      setImageBlobUrls(newBlobUrls);
    };

    if (vendors.length > 0 || payments.length > 0) {
      loadDriveFiles();
    }

    // Cleanup blob URLs on unmount
    return () => {
      Object.values(imageBlobUrls).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [vendors, payments]);

  const handleOpenVendorDialog = (vendor?: Vendor) => {
    if (vendor) {
      setEditingVendor(vendor);
      setVendorFormData({
        name: vendor.name,
        category: vendor.category,
        phone: vendor.phone,
        email: vendor.email || '',
        address: vendor.address || '',
        businessId: vendor.businessId || '',
        contractAmount: vendor.contractAmount?.toString() || '',
        contactPerson: vendor.contactPerson || '',
        whatsappNumber: vendor.whatsappNumber || '',
        licenseNumber: vendor.licenseNumber || '',
        warrantyMonths: vendor.warrantyMonths?.toString() || '',
        insuranceCompany: vendor.insuranceCompany || '',
        rating: vendor.rating || 0,
        notes: vendor.notes || '',
        recommendedBy: vendor.recommendedBy || '',
        bankName: vendor.bankName || '',
        bankAccount: vendor.bankAccount || '',
        bankBranch: vendor.bankBranch || '',
        startDate: vendor.startDate || '',
        endDate: vendor.endDate || '',
        logoUrl: vendor.logoUrl || '',
        contractFileUrl: vendor.contractFileUrl || '',
      });
    } else {
      setEditingVendor(null);
      setVendorFormData({
        name: '',
        category: '',
        phone: '',
        email: '',
        address: '',
        businessId: '',
        contractAmount: '',
        contactPerson: '',
        whatsappNumber: '',
        licenseNumber: '',
        warrantyMonths: '',
        insuranceCompany: '',
        rating: 0,
        notes: '',
        recommendedBy: '',
        bankName: '',
        bankAccount: '',
        bankBranch: '',
        startDate: '',
        endDate: '',
        logoUrl: '',
        contractFileUrl: '',
      });
    }
    setOpenVendorDialog(true);
  };

  const handleCloseVendorDialog = () => {
    setOpenVendorDialog(false);
    setEditingVendor(null);
  };

  const handleSaveVendor = async () => {
    try {
      if (editingVendor) {
        // Update existing vendor
        await updateDoc(doc(db, 'vendors', editingVendor.id), {
          name: vendorFormData.name,
          category: vendorFormData.category,
          phone: vendorFormData.phone,
          email: vendorFormData.email || '',
          address: vendorFormData.address || '',
          businessId: vendorFormData.businessId || '',
          contractAmount: parseFloat(vendorFormData.contractAmount) || 0,
          contactPerson: vendorFormData.contactPerson || '',
          whatsappNumber: vendorFormData.whatsappNumber || '',
          licenseNumber: vendorFormData.licenseNumber || '',
          warrantyMonths: parseInt(vendorFormData.warrantyMonths) || 0,
          insuranceCompany: vendorFormData.insuranceCompany || '',
          rating: vendorFormData.rating || 0,
          notes: vendorFormData.notes || '',
          recommendedBy: vendorFormData.recommendedBy || '',
          bankName: vendorFormData.bankName || '',
          bankAccount: vendorFormData.bankAccount || '',
          bankBranch: vendorFormData.bankBranch || '',
          startDate: vendorFormData.startDate || '',
          endDate: vendorFormData.endDate || '',
          logoUrl: vendorFormData.logoUrl || '',
          contractFileUrl: vendorFormData.contractFileUrl || '',
          updatedAt: new Date(),
        });
      } else {
        // Create new vendor
        await addDoc(collection(db, 'vendors'), {
          projectId,
          name: vendorFormData.name,
          category: vendorFormData.category,
          phone: vendorFormData.phone,
          email: vendorFormData.email || '',
          address: vendorFormData.address || '',
          businessId: vendorFormData.businessId || '',
          contractAmount: parseFloat(vendorFormData.contractAmount) || 0,
          contactPerson: vendorFormData.contactPerson || '',
          whatsappNumber: vendorFormData.whatsappNumber || '',
          licenseNumber: vendorFormData.licenseNumber || '',
          warrantyMonths: parseInt(vendorFormData.warrantyMonths) || 0,
          insuranceCompany: vendorFormData.insuranceCompany || '',
          rating: vendorFormData.rating || 0,
          notes: vendorFormData.notes || '',
          recommendedBy: vendorFormData.recommendedBy || '',
          bankName: vendorFormData.bankName || '',
          bankAccount: vendorFormData.bankAccount || '',
          bankBranch: vendorFormData.bankBranch || '',
          startDate: vendorFormData.startDate || '',
          endDate: vendorFormData.endDate || '',
          logoUrl: vendorFormData.logoUrl || '',
          contractFileUrl: vendorFormData.contractFileUrl || '',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      await fetchData();
      handleCloseVendorDialog();
    } catch (error) {
      console.error('Error saving vendor:', error);
      alert('שגיאה בשמירת הספק');
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק ספק זה?')) {
      try {
        await deleteDoc(doc(db, 'vendors', vendorId));
        
        // Delete all payments for this vendor
        const vendorPayments = payments.filter(p => p.vendorId === vendorId);
        for (const payment of vendorPayments) {
          await deleteDoc(doc(db, 'payments', payment.id));
        }
        
        await fetchData();
      } catch (error) {
        console.error('Error deleting vendor:', error);
        alert('שגיאה במחיקת הספק');
      }
    }
  };

  const handleOpenPaymentsDialog = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setOpenPaymentsDialog(true);
  };

  const handleClosePaymentsDialog = () => {
    setOpenPaymentsDialog(false);
    setSelectedVendor(null);
  };

  const handleOpenPaymentDialog = (payment?: Payment) => {
    if (payment) {
      setEditingPayment(payment);
      setPaymentFormData({
        // Set date or estimatedDate based on what exists and status
        date: payment.date || (payment.status === 'שולם' ? new Date().toISOString().split('T')[0] : ''),
        amount: payment.amount.toString(),
        method: payment.method,
        status: payment.status,
        description: payment.description || '',
        notes: payment.notes || '',
        invoiceUrl: payment.invoiceUrl || '',
        invoiceDescription: payment.invoiceDescription || '',
        receiptUrl: payment.receiptUrl || '',
        receiptDescription: payment.receiptDescription || '',
        progressPercentage: payment.progressPercentage?.toString() || '',
        estimatedDate: payment.estimatedDate || (payment.status !== 'שולם' && !payment.estimatedDate && payment.date ? payment.date : ''),
      });
    } else {
      setEditingPayment(null);
      setPaymentFormData({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        method: 'העברה בנקאית',
        status: 'שולם',
        description: '',
        notes: '',
        invoiceUrl: '',
        invoiceDescription: '',
        receiptUrl: '',
        receiptDescription: '',
        progressPercentage: '',
        estimatedDate: '',
      });
    }
    setOpenPaymentDialog(true);
  };

  const handleClosePaymentDialog = () => {
    setOpenPaymentDialog(false);
    setEditingPayment(null);
    setPaymentFormData({
      date: '',
      amount: '',
      method: 'העברה בנקאית',
      status: 'שולם',
      description: '',
      notes: '',
      invoiceUrl: '',
      invoiceDescription: '',
      receiptUrl: '',
      receiptDescription: '',
      progressPercentage: '',
      estimatedDate: '',
    });
  };

  const handleSavePayment = async () => {
    if (!selectedVendor) return;

    // Prepare payment data based on status
    const paymentData = {
      amount: parseFloat(paymentFormData.amount),
      method: paymentFormData.method,
      status: paymentFormData.status,
      description: paymentFormData.description || '',
      notes: paymentFormData.notes || '',
      invoiceUrl: paymentFormData.invoiceUrl || '',
      invoiceDescription: paymentFormData.invoiceDescription || '',
      receiptUrl: paymentFormData.receiptUrl || '',
      receiptDescription: paymentFormData.receiptDescription || '',
      progressPercentage: paymentFormData.progressPercentage ? parseFloat(paymentFormData.progressPercentage) : null,
      // Set date or estimatedDate based on status
      date: paymentFormData.status === 'שולם' ? paymentFormData.date : null,
      estimatedDate: paymentFormData.status !== 'שולם' ? paymentFormData.estimatedDate : null,
    };

    try {
      if (editingPayment) {
        // Update existing payment
        await updateDoc(doc(db, 'payments', editingPayment.id), {
          ...paymentData,
          updatedAt: new Date(),
        });
      } else {
        // Create new payment
        await addDoc(collection(db, 'payments'), {
          projectId,
          vendorId: selectedVendor.id,
          ...paymentData,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
      await fetchData();
      handleClosePaymentDialog();
    } catch (error) {
      console.error('Error saving payment:', error);
      alert('שגיאה בשמירת התשלום');
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!selectedVendor) return;
    if (window.confirm('האם אתה בטוח שברצונך למחוק תשלום זה?')) {
      try {
        await deleteDoc(doc(db, 'payments', paymentId));
        await fetchData();
      } catch (error) {
        console.error('Error deleting payment:', error);
        alert('שגיאה במחיקת התשלום');
      }
    }
  };

  const getTotalPaid = (vendor: Vendor) => {
    return vendor.payments
      .filter(p => p.status === 'שולם')
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const getBalance = (vendor: Vendor) => {
    if (!vendor.contractAmount) return null;
    return vendor.contractAmount - getTotalPaid(vendor);
  };

  // File upload handlers
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      alert('יש להעלות קובץ תמונה בלבד');
      return;
    }

    // Show consent dialog on first upload
    setPendingFileUpload({ file, type: 'logo' });
    setShowDriveConsent(true);
  };

  const handleContractUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Show consent dialog
    setPendingFileUpload({ file, type: 'contract' });
    setShowDriveConsent(true);
  };

  const handleInvoiceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Show consent dialog
    setPendingFileUpload({ file, type: 'invoice' });
    setShowDriveConsent(true);
  };

  const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Show consent dialog
    setPendingFileUpload({ file, type: 'receipt' });
    setShowDriveConsent(true);
  };

  // Actually upload file to Google Drive after consent
  const performFileUpload = async () => {
    if (!pendingFileUpload) return;

    const { file, type } = pendingFileUpload;

    try {
      // Get project members' emails for sharing
      let memberEmails: string[] = [];
      if (project && projectId) {
        try {
          // Get project owner email
          const allUserIds: string[] = [];
          if (project.ownerId) {
            allUserIds.push(project.ownerId);
          }
          
          // Get project members from projectUsers collection
          const usersSnapshot = await getDocs(
            query(collection(db, 'projectUsers'), where('projectId', '==', projectId))
          );
          const memberUserIds = usersSnapshot.docs.map(doc => doc.data().userId).filter(Boolean);
          allUserIds.push(...memberUserIds);
          
          // Remove duplicates
          const uniqueUserIds = Array.from(new Set(allUserIds));
          
          // Get emails from users collection using userId
          const emailPromises = uniqueUserIds.map(async (userId) => {
            const userDoc = await getDoc(doc(db, 'users', userId));
            return userDoc.exists() ? userDoc.data().email : null;
          });
          
          const emails = await Promise.all(emailPromises);
          memberEmails = emails.filter(email => email && email !== user?.email) as string[]; // Exclude current user
        } catch (error) {
          console.error('Error fetching project members:', error);
        }
      }

      // Upload to user's Google Drive and share with project members
      const result = await uploadToDrive(file, 'שיפוץ-קבצים', memberEmails);
      
      // Store the file data with both view and download links
      const fileData = {
        id: result.id,
        name: file.name,
        url: result.webViewLink, // For viewing
        downloadUrl: result.webContentLink, // For downloading
      };

      // Load blob URL immediately after upload
      try {
        const blobUrl = await fetchFileAsBlob(result.id);
        setImageBlobUrls(prev => ({ ...prev, [result.id]: blobUrl }));
      } catch (error) {
        console.error('Error loading blob URL after upload:', error);
      }

      // Update form data based on type
      if (type === 'logo') {
        setVendorFormData({ ...vendorFormData, logoUrl: JSON.stringify(fileData) });
      } else if (type === 'contract') {
        setVendorFormData({ ...vendorFormData, contractFileUrl: JSON.stringify(fileData) });
      } else if (type === 'invoice') {
        setPaymentFormData({ ...paymentFormData, invoiceUrl: JSON.stringify(fileData) });
      } else if (type === 'receipt') {
        setPaymentFormData({ ...paymentFormData, receiptUrl: JSON.stringify(fileData) });
      }

      const sharedWith = memberEmails.length > 0 ? ` ושותף עם ${memberEmails.length} חברים` : '';
      alert(`הקובץ הועלה בהצלחה ל-Google Drive שלך${sharedWith}!`);
    } catch (error) {
      console.error('Error uploading to Drive:', error);
      alert('שגיאה בהעלאת הקובץ ל-Google Drive');
    } finally {
      setPendingFileUpload(null);
    }
  };

  // Parse file data (can be old URL string or new JSON object)
  const parseFileData = (data: string): { id?: string; name?: string; url: string; downloadUrl?: string } | null => {
    if (!data) return null;
    
    try {
      // Try to parse as JSON (new format)
      const parsed = JSON.parse(data);
      return parsed;
    } catch {
      // Old format - just a URL string
      return { url: data };
    }
  };

  // Extract storage path from full URL (for old Firebase Storage URLs)
  const getStoragePathFromUrl = (url: string): string => {
    try {
      // Firebase Storage URLs have format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?{query}
      if (url.includes('firebasestorage.googleapis.com')) {
        const urlObj = new URL(url);
        // Extract the encoded path after /o/
        const pathMatch = urlObj.pathname.match(/\/o\/(.+)/);
        if (pathMatch && pathMatch[1]) {
          // Decode twice: once for URL encoding, once for Firebase encoding
          return decodeURIComponent(decodeURIComponent(pathMatch[1]));
        }
      }
      // If not a Firebase URL, return as is
      return url;
    } catch (error) {
      console.error('Error parsing URL:', error);
      return url;
    }
  };

  const handleDeleteFile = async (dataStr: string, type: 'logo' | 'contract' | 'invoice' | 'receipt') => {
    console.log('handleDeleteFile called with:', { dataStr, type });
    
    if (!dataStr) {
      alert('לא נמצא קובץ למחיקה');
      return;
    }
    
    if (!confirm('האם אתה בטוח שברצונך למחוק קובץ זה?')) return;

    try {
      const fileData = parseFileData(dataStr);
      if (!fileData) {
        alert('שגיאה בפרסור נתוני הקובץ');
        return;
      }

      // If it's a Google Drive file (has id), delete from Drive
      if (fileData.id) {
        try {
          await deleteFromDrive(fileData.id);
          console.log('File deleted successfully from Google Drive');
        } catch (driveError) {
          console.warn('Could not delete from Drive (file might not exist):', driveError);
          // Continue anyway to clean up DB
        }
      } else {
        console.log('Old file format (not in Drive) - skipping Drive deletion');
      }

      // Update form data or database based on context
      if (type === 'logo') {
        setVendorFormData({ ...vendorFormData, logoUrl: '' });
        // If editing existing vendor, also update DB
        if (editingVendor) {
          console.log('Updating vendor in DB');
          await updateDoc(doc(db, 'vendors', editingVendor.id), { logoUrl: '' });
          await fetchData();
        }
      } else if (type === 'contract') {
        setVendorFormData({ ...vendorFormData, contractFileUrl: '' });
        // If editing existing vendor, also update DB
        if (editingVendor) {
          console.log('Updating contract in DB');
          await updateDoc(doc(db, 'vendors', editingVendor.id), { contractFileUrl: '' });
          await fetchData();
        }
      } else if (type === 'invoice') {
        setPaymentFormData({ ...paymentFormData, invoiceUrl: '', invoiceDescription: '' });
        // If editing existing payment, also update DB
        if (editingPayment) {
          console.log('Updating invoice in DB');
          await updateDoc(doc(db, 'payments', editingPayment.id), { invoiceUrl: '', invoiceDescription: '' });
          await fetchData();
        }
      } else if (type === 'receipt') {
        setPaymentFormData({ ...paymentFormData, receiptUrl: '', receiptDescription: '' });
        // If editing existing payment, also update DB
        if (editingPayment) {
          console.log('Updating receipt in DB');
          await updateDoc(doc(db, 'payments', editingPayment.id), { receiptUrl: '', receiptDescription: '' });
          await fetchData();
        }
      }

      alert('הקובץ נמחק בהצלחה');
    } catch (error) {
      console.error('Error deleting file:', error);
      const errorMessage = (error as any).message || 'שגיאה לא ידועה';
      alert('שגיאה במחיקת הקובץ: ' + errorMessage);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!mounted || roleLoading || loading) {
    return (
      <DashboardLayout projectId={projectId} project={project || undefined}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  // Check permissions - vendors page should be accessible to most roles, but financial data is hidden
  if (!role || !permissions) {
    return (
      <DashboardLayout projectId={projectId} project={project || undefined}>
        <AccessDenied message="אין לך הרשאה לצפות בדף זה" />
      </DashboardLayout>
    );
  }

  const canViewFinancials = permissions.canViewPayments || permissions.canViewBudget;
  const canEditVendors = permissions.canEditProject;

  if (!mounted || loading) {
    return (
      <DashboardLayout projectId={projectId} project={project || undefined}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout projectId={projectId} project={project || undefined}>
      <Box sx={{ pr: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} sx={{ px: 3 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h4">
              {hebrewLabels.vendors}
            </Typography>
            <Chip label={vendors.length} color="primary" size="medium" />
          </Box>
          {canEditVendors && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenVendorDialog()}
            >
              {hebrewLabels.addVendor}
            </Button>
          )}
        </Box>

        <Box sx={{ px: 3 }}>
          <Card>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 'bold', width: 50 }}></TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>שם הספק</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>קטגוריה</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>טלפון</TableCell>
                    {canViewFinancials && <TableCell sx={{ fontWeight: 'bold' }}>סה"כ חוזה</TableCell>}
                    {canViewFinancials && <TableCell sx={{ fontWeight: 'bold' }}>שולם</TableCell>}
                    {canViewFinancials && <TableCell sx={{ fontWeight: 'bold' }}>יתרה</TableCell>}
                    <TableCell sx={{ fontWeight: 'bold' }}>קבצים</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vendors.map((vendor) => {
                    const totalPaid = getTotalPaid(vendor);
                    const balance = getBalance(vendor);
                    const isExpanded = expandedVendorId === vendor.id;
                    
                    return (
                      <React.Fragment key={vendor.id}>
                        <TableRow 
                          hover
                          sx={{ cursor: 'pointer', backgroundColor: isExpanded ? '#f5f5f5' : 'inherit' }}
                          onClick={() => setExpandedVendorId(isExpanded ? null : vendor.id)}
                        >
                          <TableCell>
                            <IconButton size="small">
                              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {vendor.logoUrl && (() => {
                                const parsedData = parseFileData(vendor.logoUrl);
                                const logoSrc = parsedData?.id && imageBlobUrls[parsedData.id] ? imageBlobUrls[parsedData.id] : null;
                                return logoSrc ? <Avatar src={logoSrc} sx={{ width: 32, height: 32 }} /> : null;
                              })()}
                              <Typography fontWeight={500}>{vendor.name}</Typography>
                              {vendor.whatsappNumber && (
                                <IconButton
                                  size="small"
                                  color="success"
                                  href={`https://wa.me/${vendor.whatsappNumber.replace(/\D/g, '')}`}
                                  target="_blank"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <WhatsAppIcon fontSize="small" />
                                </IconButton>
                              )}
                            </Box>
                          </TableCell>
                        <TableCell>
                          <Chip label={vendor.category} size="small" />
                        </TableCell>
                        <TableCell>
                          <Typography 
                            component="a" 
                            href={`tel:${vendor.phone}`}
                            sx={{ textDecoration: 'none', color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {vendor.phone}
                          </Typography>
                        </TableCell>
                        {canViewFinancials && (
                          <TableCell>
                            {vendor.contractAmount ? formatCurrency(vendor.contractAmount) : '—'}
                          </TableCell>
                        )}
                        {canViewFinancials && (
                          <TableCell>
                            <Typography color="success.main" fontWeight={500}>
                              {formatCurrency(totalPaid)}
                            </Typography>
                          </TableCell>
                        )}
                        {canViewFinancials && (
                          <TableCell>
                            {balance !== null ? (
                              <Typography 
                                color={balance > 0 ? 'warning.main' : 'success.main'}
                                fontWeight={500}
                              >
                                {formatCurrency(balance)}
                              </Typography>
                            ) : '—'}
                          </TableCell>
                        )}
                        <TableCell>
                          {(() => {
                            const hasContract = !!vendor.contractFileUrl;
                            const invoicesCount = vendor.payments.filter(p => p.invoiceUrl).length;
                            const receiptsCount = vendor.payments.filter(p => p.receiptUrl).length;
                            const totalCount = (hasContract ? 1 : 0) + invoicesCount + receiptsCount;
                            
                            if (totalCount === 0) {
                              return <Typography variant="body2" color="text.secondary">—</Typography>;
                            }
                            
                            const parts = [];
                            if (hasContract) parts.push('חוזה');
                            if (invoicesCount > 0) parts.push(`${invoicesCount} חשבוניות`);
                            if (receiptsCount > 0) parts.push(`${receiptsCount} קבלות`);
                            
                            return (
                              <Tooltip title="לחץ לצפייה בכל הקבצים">
                                <Chip
                                  label={parts.join(' + ')}
                                  size="small"
                                  color="primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                              setSelectedVendorForFiles(vendor);
                              setOpenFilesDialog(true);
                            }}
                            sx={{ cursor: 'pointer' }}
                            icon={<AttachFileIcon />}
                          />
                              </Tooltip>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={0.5} justifyContent="center">
                            {canViewFinancials && (
                              <Tooltip title={hebrewLabels.viewPayments}>
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenPaymentsDialog(vendor);
                                  }}
                                >
                                  <PaymentIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {canEditVendors && (
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenVendorDialog(vendor);
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            )}
                            {canEditVendors && (
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteVendor(vendor.id);
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>

                      {/* Collapse Row עם פרטי הספק */}
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={canViewFinancials ? 9 : 6}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ p: 1.5, backgroundColor: '#fafafa' }}>
                              <Card variant="outlined">
                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                                    {/* לוגו + שם */}
                                    {vendor.logoUrl && (() => {
                                      const parsedData = parseFileData(vendor.logoUrl);
                                      // Use blob URL from cache if available
                                      const logoSrc = parsedData?.id && imageBlobUrls[parsedData.id] 
                                        ? imageBlobUrls[parsedData.id]
                                        : null; // Don't fallback to direct URL since it requires auth
                                      
                                      return logoSrc ? (
                                        <Box display="flex" justifyContent="center" pb={1} borderBottom="1px solid #e0e0e0">
                                          <Avatar 
                                            src={logoSrc} 
                                            sx={{ 
                                              width: 80, 
                                              height: 80,
                                              border: '3px solid #e0e0e0'
                                            }} 
                                          />
                                        </Box>
                                      ) : null;
                                    })()}
                                    
                                    {/* פרטי קשר */}
                                    <Box>
                                      <Typography variant="subtitle1" color="primary" sx={{ mb: 1.5, fontWeight: 700, fontSize: '1rem' }}>
                                        פרטי קשר
                                      </Typography>
                                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1.5 }}>
                                        <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, backgroundColor: 'grey.50', minHeight: 70 }}>
                                          <Typography variant="caption" color="text.secondary" fontWeight={600}>שם הספק</Typography>
                                          <Typography variant="body2" fontWeight={500} mt={0.5} sx={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{vendor.name}</Typography>
                                        </Box>
                                        <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, backgroundColor: 'grey.50', minHeight: 70 }}>
                                          <Typography variant="caption" color="text.secondary" fontWeight={600}>איש קשר</Typography>
                                          <Typography variant="body2" fontWeight={500} mt={0.5} sx={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{vendor.contactPerson || '—'}</Typography>
                                        </Box>
                                        <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, backgroundColor: 'grey.50', minHeight: 70 }}>
                                          <Typography variant="caption" color="text.secondary" fontWeight={600}>טלפון</Typography>
                                          <Typography variant="body2" fontWeight={500} mt={0.5} sx={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{vendor.phone}</Typography>
                                        </Box>
                                        <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, backgroundColor: 'grey.50', minHeight: 70 }}>
                                          <Typography variant="caption" color="text.secondary" fontWeight={600}>WhatsApp</Typography>
                                          <Typography variant="body2" fontWeight={500} mt={0.5} sx={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{vendor.whatsappNumber || '—'}</Typography>
                                        </Box>
                                        <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, backgroundColor: 'grey.50', minHeight: 70 }}>
                                          <Typography variant="caption" color="text.secondary" fontWeight={600}>אימייל</Typography>
                                          <Typography variant="body2" fontWeight={500} mt={0.5} sx={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{vendor.email || '—'}</Typography>
                                        </Box>
                                        <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, backgroundColor: 'grey.50', minHeight: 70 }}>
                                          <Typography variant="caption" color="text.secondary" fontWeight={600}>כתובת</Typography>
                                          <Typography variant="body2" fontWeight={500} mt={0.5} sx={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>{vendor.address || '—'}</Typography>
                                        </Box>
                                      </Box>
                                    </Box>

                                    <Divider />

                                    {/* פרטים עסקיים */}
                                    <Box>
                                      <Typography variant="subtitle1" color="primary" sx={{ mb: 1.5, fontWeight: 700, fontSize: '1rem' }}>
                                        פרטים עסקיים
                                      </Typography>
                                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1.5 }}>
                                        <Box sx={{ p: 1.5, border: 1, borderColor: 'primary.main', borderRadius: 1, backgroundColor: 'primary.50' }}>
                                          <Typography variant="caption" color="text.secondary" fontWeight={600}>קטגוריה</Typography>
                                          <Typography variant="body2" fontWeight={500} mt={0.5}>{vendor.category}</Typography>
                                        </Box>
                                        <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, backgroundColor: 'grey.50' }}>
                                          <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>דירוג</Typography>
                                          <Rating value={vendor.rating || 0} readOnly size="small" />
                                        </Box>
                                        <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, backgroundColor: 'grey.50' }}>
                                          <Typography variant="caption" color="text.secondary" fontWeight={600}>ח.פ / ת.ז</Typography>
                                          <Typography variant="body2" fontWeight={500} mt={0.5}>{vendor.businessId || '—'}</Typography>
                                        </Box>
                                        <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, backgroundColor: 'grey.50' }}>
                                          <Typography variant="caption" color="text.secondary" fontWeight={600}>מספר רישיון</Typography>
                                          <Typography variant="body2" fontWeight={500} mt={0.5}>{vendor.licenseNumber || '—'}</Typography>
                                        </Box>
                                        <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, backgroundColor: 'grey.50' }}>
                                          <Typography variant="caption" color="text.secondary" fontWeight={600}>תקופת אחריות</Typography>
                                          <Typography variant="body2" fontWeight={500} mt={0.5}>{vendor.warrantyMonths ? `${vendor.warrantyMonths} חודשים` : '—'}</Typography>
                                        </Box>
                                        <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, backgroundColor: 'grey.50' }}>
                                          <Typography variant="caption" color="text.secondary" fontWeight={600}>מקור המלצה</Typography>
                                          <Typography variant="body2" fontWeight={500} mt={0.5}>{vendor.recommendedBy || '—'}</Typography>
                                        </Box>
                                      </Box>
                                    </Box>

                                    <Divider />

                                    {/* פרטי בנק */}
                                    {canViewFinancials && (
                                      <Box>
                                        <Typography variant="subtitle1" color="primary" sx={{ mb: 1.5, fontWeight: 700, fontSize: '1rem' }}>
                                          פרטי בנק
                                        </Typography>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1.5 }}>
                                          <Box sx={{ p: 1.5, border: 1, borderColor: 'info.main', borderRadius: 1, backgroundColor: 'info.50' }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>בנק</Typography>
                                            <Typography variant="body2" fontWeight={500} mt={0.5}>{vendor.bankName || '—'}</Typography>
                                          </Box>
                                          <Box sx={{ p: 1.5, border: 1, borderColor: 'info.main', borderRadius: 1, backgroundColor: 'info.50' }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>סניף</Typography>
                                            <Typography variant="body2" fontWeight={500} mt={0.5}>{vendor.bankBranch || '—'}</Typography>
                                          </Box>
                                          <Box sx={{ p: 1.5, border: 1, borderColor: 'info.main', borderRadius: 1, backgroundColor: 'info.50' }}>
                                            <Typography variant="caption" color="text.secondary" fontWeight={600}>מספר חשבון</Typography>
                                            <Typography variant="body2" fontWeight={500} mt={0.5}>{vendor.bankAccount || '—'}</Typography>
                                          </Box>
                                        </Box>
                                      </Box>
                                    )}

                                    <Divider />

                                    {/* תאריכים */}
                                    <Box>
                                      <Typography variant="subtitle1" color="primary" sx={{ mb: 1.5, fontWeight: 700, fontSize: '1rem' }}>
                                        תאריכים
                                      </Typography>
                                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1.5 }}>
                                        <Box sx={{ p: 1.5, border: 1, borderColor: 'success.main', borderRadius: 1, backgroundColor: 'success.50' }}>
                                          <Typography variant="caption" color="text.secondary" fontWeight={600}>תאריך התחלה</Typography>
                                          <Typography variant="body2" fontWeight={500} mt={0.5}>{vendor.startDate || '—'}</Typography>
                                        </Box>
                                        <Box sx={{ p: 1.5, border: 1, borderColor: 'warning.main', borderRadius: 1, backgroundColor: 'warning.50' }}>
                                          <Typography variant="caption" color="text.secondary" fontWeight={600}>תאריך סיום</Typography>
                                          <Typography variant="body2" fontWeight={500} mt={0.5}>{vendor.endDate || '—'}</Typography>
                                        </Box>
                                      </Box>
                                    </Box>

                                    {/* חוזה */}
                                    {vendor.contractFileUrl && (
                                      <>
                                        <Divider />
                                        <Box>
                                          <Typography variant="subtitle1" color="primary" sx={{ mb: 0.8, fontWeight: 700, fontSize: '1rem' }}>
                                            חוזה
                                          </Typography>
                                          <Chip
                                            label={vendor.contractFileUrl.split('/').pop()}
                                            icon={<AttachFileIcon />}
                                            variant="outlined"
                                            size="small"
                                            onClick={() => {
                                              setViewingFile({
                                                type: 'contract',
                                                url: vendor.contractFileUrl!,
                                                vendor: vendor
                                              });
                                              setOpenFileViewerDialog(true);
                                            }}
                                            sx={{ cursor: 'pointer' }}
                                          />
                                        </Box>
                                      </>
                                    )}

                                    {/* הערות */}
                                    {vendor.notes && (
                                      <>
                                        <Divider />
                                        <Box>
                                          <Typography variant="subtitle1" color="primary" sx={{ mb: 1, fontWeight: 700, fontSize: '1rem' }}>
                                            הערות
                                          </Typography>
                                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                            {vendor.notes}
                                          </Typography>
                                        </Box>
                                      </>
                                    )}
                                  </Box>
                                </CardContent>
                              </Card>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>

        {/* Vendor Dialog */}
        <Dialog open={openVendorDialog} onClose={handleCloseVendorDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingVendor ? hebrewLabels.editVendor : hebrewLabels.addVendor}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Logo Upload */}
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  לוגו הספק
                </Typography>
                <Box display="flex" gap={2} alignItems="center">
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadIcon />}
                    size="small"
                    disabled={!!vendorFormData.logoUrl}
                  >
                    העלה לוגו
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleLogoUpload}
                    />
                  </Button>
                  {vendorFormData.logoUrl && (() => {
                    const parsedData = parseFileData(vendorFormData.logoUrl);
                    const logoSrc = parsedData?.id && imageBlobUrls[parsedData.id] ? imageBlobUrls[parsedData.id] : null;
                    const fileName = parsedData?.name || 'לוגו';
                    return (
                      <Box display="flex" gap={1} alignItems="center">
                        {logoSrc && <Avatar src={logoSrc} sx={{ width: 40, height: 40 }} />}
                        <Chip
                          label={fileName}
                          onDelete={() => handleDeleteFile(vendorFormData.logoUrl, 'logo')}
                          size="small"
                        />
                      </Box>
                    );
                  })()}
                </Box>
              </Box>

              <Divider />

              {/* Contract Upload */}
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  חוזה
                </Typography>
                <Box display="flex" gap={2} alignItems="center">
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<AttachFileIcon />}
                    size="small"
                    disabled={!!vendorFormData.contractFileUrl}
                  >
                    העלה חוזה
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.doc,.docx,image/*"
                      onChange={handleContractUpload}
                    />
                  </Button>
                  {vendorFormData.contractFileUrl && (
                    <Chip
                      label={decodeURIComponent(vendorFormData.contractFileUrl.split('/').pop()?.split('?')[0] || 'חוזה')}
                      onDelete={() => handleDeleteFile(vendorFormData.contractFileUrl, 'contract')}
                      size="small"
                      icon={<AttachFileIcon />}
                    />
                  )}
                </Box>
              </Box>

              <Divider />

              <TextField
                label="שם הספק"
                fullWidth
                required
                value={vendorFormData.name}
                onChange={(e) => setVendorFormData({ ...vendorFormData, name: e.target.value })}
              />

              <TextField
                label="קטגוריה"
                fullWidth
                required
                select
                value={vendorFormData.category}
                onChange={(e) => setVendorFormData({ ...vendorFormData, category: e.target.value })}
              >
                {taskCategories.map((cat) => (
                  <MenuItem key={cat.name} value={cat.name}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography>{cat.icon}</Typography>
                      <Typography>{cat.name}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>

              <Box display="flex" gap={2}>
                <TextField
                  label="טלפון"
                  fullWidth
                  required
                  value={vendorFormData.phone}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, phone: e.target.value })}
                />
                <TextField
                  label="WhatsApp"
                  fullWidth
                  value={vendorFormData.whatsappNumber}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, whatsappNumber: e.target.value })}
                />
              </Box>

              <TextField
                label="אימייל"
                fullWidth
                type="email"
                value={vendorFormData.email}
                onChange={(e) => setVendorFormData({ ...vendorFormData, email: e.target.value })}
              />

              <TextField
                label="כתובת"
                fullWidth
                value={vendorFormData.address}
                onChange={(e) => setVendorFormData({ ...vendorFormData, address: e.target.value })}
              />

              <Box display="flex" gap={2}>
                <TextField
                  label="ח.פ / ת.ז"
                  fullWidth
                  value={vendorFormData.businessId}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, businessId: e.target.value })}
                />
                <TextField
                  label="סכום חוזה"
                  fullWidth
                  type="number"
                  value={vendorFormData.contractAmount}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, contractAmount: e.target.value })}
                />
              </Box>

              <TextField
                label="איש קשר"
                fullWidth
                value={vendorFormData.contactPerson}
                onChange={(e) => setVendorFormData({ ...vendorFormData, contactPerson: e.target.value })}
              />

              <Divider />

              <Box display="flex" gap={2}>
                <TextField
                  label="מספר רישיון"
                  fullWidth
                  value={vendorFormData.licenseNumber}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, licenseNumber: e.target.value })}
                />
                <TextField
                  label="תקופת אחריות (חודשים)"
                  fullWidth
                  type="number"
                  value={vendorFormData.warrantyMonths}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, warrantyMonths: e.target.value })}
                />
              </Box>

              <Box>
                <Typography component="legend" gutterBottom>דירוג</Typography>
                <Rating
                  value={vendorFormData.rating}
                  onChange={(e, newValue) => setVendorFormData({ ...vendorFormData, rating: newValue || 0 })}
                />
              </Box>

              <Divider />

              <Box display="flex" gap={2}>
                <TextField
                  label="בנק"
                  fullWidth
                  value={vendorFormData.bankName}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, bankName: e.target.value })}
                />
                <TextField
                  label="סניף"
                  fullWidth
                  value={vendorFormData.bankBranch}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, bankBranch: e.target.value })}
                />
              </Box>

              <TextField
                label="מספר חשבון"
                fullWidth
                value={vendorFormData.bankAccount}
                onChange={(e) => setVendorFormData({ ...vendorFormData, bankAccount: e.target.value })}
              />

              <Divider />

              <Box display="flex" gap={2}>
                <TextField
                  label="תאריך התחלה"
                  fullWidth
                  type="date"
                  value={vendorFormData.startDate}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, startDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="תאריך סיום"
                  fullWidth
                  type="date"
                  value={vendorFormData.endDate}
                  onChange={(e) => setVendorFormData({ ...vendorFormData, endDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>

              <TextField
                label="מקור המלצה"
                fullWidth
                value={vendorFormData.recommendedBy}
                onChange={(e) => setVendorFormData({ ...vendorFormData, recommendedBy: e.target.value })}
              />

              <TextField
                label="הערות"
                fullWidth
                multiline
                rows={3}
                value={vendorFormData.notes}
                onChange={(e) => setVendorFormData({ ...vendorFormData, notes: e.target.value })}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseVendorDialog}>ביטול</Button>
            <Button
              onClick={handleSaveVendor}
              variant="contained"
              disabled={!vendorFormData.name || !vendorFormData.category || !vendorFormData.phone}
            >
              שמור
            </Button>
          </DialogActions>
        </Dialog>

        {/* Payments Dialog */}
        <Dialog open={openPaymentsDialog} onClose={handleClosePaymentsDialog} maxWidth="lg" fullWidth>
          <DialogTitle>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">תשלומים - {selectedVendor?.name}</Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => handleOpenPaymentDialog()}
              >
                {hebrewLabels.addPayment}
              </Button>
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedVendor && (
              <>
                {/* Remaining Balance Card */}
                {selectedVendor.contractAmount && (
                  <Card sx={{ mb: 2, p: 3, bgcolor: '#e3f2fd', borderRight: '4px solid #1976d2' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Box sx={{ color: '#1976d2', fontSize: '3rem' }}>💰</Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="text.secondary">
                          יתרה אמיתית לתשלום
                        </Typography>
                        <Typography variant="h3" fontWeight="bold" color="primary.main">
                          {formatCurrency(
                            selectedVendor.contractAmount - 
                            selectedVendor.payments.filter(p => p.status === 'שולם').reduce((sum, p) => sum + p.amount, 0)
                          )}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          סכום חוזה: {formatCurrency(selectedVendor.contractAmount)} | שולם בפועל: {formatCurrency(selectedVendor.payments.filter(p => p.status === 'שולם').reduce((sum, p) => sum + p.amount, 0))}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                )}

                {/* Summary with validation */}
                <Card sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom mb={2}>סיכום תשלומים</Typography>
                    <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(140px, 1fr))" gap={2}>
                      {/* סכום חוזה */}
                      <Box 
                        sx={{ 
                          p: 2, 
                          border: 1, 
                          borderColor: 'divider', 
                          borderRadius: 2,
                          backgroundColor: 'grey.50',
                          textAlign: 'center'
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                          סכום חוזה
                        </Typography>
                        <Typography variant="h5" fontWeight="bold">
                          {selectedVendor.contractAmount ? formatCurrency(selectedVendor.contractAmount) : '—'}
                        </Typography>
                      </Box>

                      {/* שולם */}
                      <Box 
                        sx={{ 
                          p: 2, 
                          border: 2, 
                          borderColor: 'success.main', 
                          borderRadius: 2,
                          backgroundColor: 'success.50',
                          textAlign: 'center'
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                          שולם בפועל
                        </Typography>
                        <Typography variant="h5" fontWeight="bold" color="success.main">
                          {formatCurrency(getTotalPaid(selectedVendor))}
                        </Typography>
                      </Box>

                      {/* מתוכנן */}
                      <Box 
                        sx={{ 
                          p: 2, 
                          border: 1, 
                          borderColor: 'info.main', 
                          borderRadius: 2,
                          backgroundColor: 'info.50',
                          textAlign: 'center'
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                          מתוכנן
                        </Typography>
                        <Typography variant="h5" fontWeight="bold" color="info.main">
                          {formatCurrency(selectedVendor.payments.filter(p => p.status === 'מתוכנן' || p.status === 'ממתין').reduce((sum, p) => sum + p.amount, 0))}
                        </Typography>
                      </Box>

                      {/* סה"כ תשלומים */}
                      <Box 
                        sx={{ 
                          p: 2, 
                          border: 1, 
                          borderColor: 'divider', 
                          borderRadius: 2,
                          backgroundColor: 'primary.50',
                          textAlign: 'center'
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                          סה"כ תשלומים
                        </Typography>
                        <Typography variant="h5" fontWeight="bold" color="primary">
                          {formatCurrency(selectedVendor.payments.reduce((sum, p) => sum + p.amount, 0))}
                        </Typography>
                      </Box>

                      {/* מס' תשלומים */}
                      <Box 
                        sx={{ 
                          p: 2, 
                          border: 1, 
                          borderColor: 'divider', 
                          borderRadius: 2,
                          backgroundColor: 'grey.50',
                          textAlign: 'center'
                        }}
                      >
                        <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                          מספר תשלומים
                        </Typography>
                        <Typography variant="h5" fontWeight="bold">
                          {selectedVendor.payments.length}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                {/* Validation Warning */}
                {selectedVendor.contractAmount && selectedVendor.payments.reduce((sum, p) => sum + p.amount, 0) !== selectedVendor.contractAmount && (
                  <Card sx={{ bgcolor: '#fff3e0', borderRight: '4px solid #ff9800' }}>
                    <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ color: '#f57c00', display: 'flex', alignItems: 'center' }}>
                        ⚠️
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                          אי התאמה בסכומים
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          סכום החוזה ({formatCurrency(selectedVendor.contractAmount)}) אינו תואם לסך כל התשלומים ({formatCurrency(selectedVendor.payments.reduce((sum, p) => sum + p.amount, 0))})
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          הפרש: {formatCurrency(Math.abs(selectedVendor.contractAmount - selectedVendor.payments.reduce((sum, p) => sum + p.amount, 0)))}
                          {selectedVendor.payments.reduce((sum, p) => sum + p.amount, 0) > selectedVendor.contractAmount ? ' (תשלומים עודפים)' : ' (תשלומים חסרים)'}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                )}

                {/* Payments Table */}
                <TableContainer>
                  <Table size="small" sx={{ minWidth: 900 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', minWidth: 100, whiteSpace: 'nowrap' }}>תאריך</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', minWidth: 100, whiteSpace: 'nowrap' }}>סכום</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', minWidth: 120, whiteSpace: 'nowrap' }}>אמצעי תשלום</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', minWidth: 90, whiteSpace: 'nowrap' }}>סטטוס</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', minWidth: 120 }}>תיאור</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', minWidth: 80, whiteSpace: 'nowrap' }}>התקדמות</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', minWidth: 80, whiteSpace: 'nowrap' }}>חשבונית</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', minWidth: 80, whiteSpace: 'nowrap' }}>קבלה</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', textAlign: 'center', minWidth: 100, whiteSpace: 'nowrap' }}>פעולות</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedVendor.payments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} align="center">
                            <Typography color="text.secondary" py={3}>
                              אין תשלומים עדיין
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedVendor.payments.map((payment) => (
                          <TableRow key={payment.id} hover>
                            <TableCell>
                              <Typography variant="body2">
                                {payment.status === 'שולם' ? payment.date : payment.estimatedDate || '—'}
                              </Typography>
                              {payment.status !== 'שולם' && (
                                <Typography variant="caption" color="text.secondary">
                                  (משוער)
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Typography fontWeight={500}>
                                {formatCurrency(payment.amount)}
                              </Typography>
                            </TableCell>
                            <TableCell>{payment.method}</TableCell>
                            <TableCell>
                              <Chip
                                label={payment.status}
                                size="small"
                                color={paymentStatuses.find(s => s.value === payment.status)?.color}
                              />
                            </TableCell>
                            <TableCell>{payment.description || '—'}</TableCell>
                            <TableCell>
                              {payment.progressPercentage ? (
                                <Chip
                                  label={`${payment.progressPercentage}%`}
                                  size="small"
                                  variant="outlined"
                                  color="primary"
                                />
                              ) : (
                                <Typography variant="body2" color="text.secondary">—</Typography>
                              )}
                            </TableCell>
                            <TableCell align="center">
                              {payment.invoiceUrl ? (
                                <Tooltip title={payment.invoiceDescription || 'חשבונית'}>
                                  <Chip
                                    icon={<AttachFileIcon />}
                                    label="חשבונית"
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                    onClick={() => {
                                      setViewingFile({
                                        type: 'invoice',
                                        url: payment.invoiceUrl!,
                                        description: payment.invoiceDescription,
                                        payment: payment
                                      });
                                      setOpenFileViewerDialog(true);
                                    }}
                                    sx={{ cursor: 'pointer' }}
                                  />
                                </Tooltip>
                              ) : (
                                <Typography variant="body2" color="text.secondary">—</Typography>
                              )}
                            </TableCell>
                            <TableCell align="center">
                              {payment.receiptUrl ? (
                                <Tooltip title={payment.receiptDescription || 'קבלה'}>
                                  <Chip
                                    icon={<AttachFileIcon />}
                                    label="קבלה"
                                    size="small"
                                    color="success"
                                    variant="outlined"
                                    onClick={() => {
                                      setViewingFile({
                                        type: 'receipt',
                                        url: payment.receiptUrl!,
                                        description: payment.receiptDescription,
                                        payment: payment
                                      });
                                      setOpenFileViewerDialog(true);
                                    }}
                                    sx={{ cursor: 'pointer' }}
                                  />
                                </Tooltip>
                              ) : (
                                <Typography variant="body2" color="text.secondary">—</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Box display="flex" gap={0.5} justifyContent="center">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleOpenPaymentDialog(payment)}
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeletePayment(payment.id)}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePaymentsDialog}>סגור</Button>
          </DialogActions>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={openPaymentDialog} onClose={handleClosePaymentDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editingPayment ? 'עריכת תשלום' : 'הוספת תשלום'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Remaining Balance Info */}
              {selectedVendor?.contractAmount && (
                <Card sx={{ p: 2, bgcolor: '#f3e5f5', borderRight: '4px solid #9c27b0' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        סכום החוזה
                      </Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {formatCurrency(selectedVendor.contractAmount)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        שולם בפועל
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" color="success.main">
                        {formatCurrency(
                          selectedVendor.payments
                            .filter(p => p.id !== editingPayment?.id && p.status === 'שולם')
                            .reduce((sum, p) => sum + p.amount, 0)
                        )}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        יתרה אמיתית
                      </Typography>
                      <Typography variant="h5" fontWeight="bold" color="error.main">
                        {formatCurrency(
                          selectedVendor.contractAmount - 
                          selectedVendor.payments
                            .filter(p => p.id !== editingPayment?.id && p.status === 'שולם')
                            .reduce((sum, p) => sum + p.amount, 0)
                        )}
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              )}

              <TextField
                label="סכום"
                fullWidth
                required
                type="number"
                value={paymentFormData.amount}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
              />

              <TextField
                label="אמצעי תשלום"
                fullWidth
                required
                select
                value={paymentFormData.method}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, method: e.target.value })}
              >
                {paymentMethods.map((method) => (
                  <MenuItem key={method} value={method}>
                    {method}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="סטטוס"
                fullWidth
                required
                select
                value={paymentFormData.status}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, status: e.target.value })}
              >
                {paymentStatuses.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.value}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="תיאור"
                fullWidth
                value={paymentFormData.description}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, description: e.target.value })}
                placeholder="מקדמה, תשלום ביניים, תשלום סופי..."
              />

              {/* Date field - conditional based on status */}
              {paymentFormData.status === 'שולם' ? (
                <TextField
                  label="תאריך תשלום"
                  fullWidth
                  required
                  type="date"
                  value={paymentFormData.date}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, date: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  helperText="התאריך בו שולם התשלום בפועל"
                />
              ) : (
                <TextField
                  label="תאריך משוער"
                  fullWidth
                  required
                  type="date"
                  value={paymentFormData.estimatedDate}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, estimatedDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  helperText="התאריך המשוער בו התשלום צפוי להתבצע"
                />
              )}

              {/* Additional fields for planned/pending payments */}
              {(paymentFormData.status === 'מתוכנן' || paymentFormData.status === 'ממתין') && (
                <>
                  <TextField
                    label="אחוז התקדמות צפוי"
                    fullWidth
                    type="number"
                    value={paymentFormData.progressPercentage}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, progressPercentage: e.target.value })}
                    InputProps={{
                      endAdornment: '%',
                    }}
                    inputProps={{
                      min: 0,
                      max: 100,
                    }}
                    helperText="באיזה אחוז התקדמות צפוי התשלום (לדוגמה: 50% מההתקדמות)"
                  />
                </>
              )}

              {/* Invoice Upload */}
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom fontWeight={600}>
                  חשבונית
                </Typography>
                <Box display="flex" gap={2} alignItems="center" sx={{ mb: 1 }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<AttachFileIcon />}
                    size="small"
                    disabled={!!paymentFormData.invoiceUrl}
                  >
                    העלה חשבונית
                    <input
                      type="file"
                      hidden
                      accept="image/*,.pdf"
                      onChange={handleInvoiceUpload}
                    />
                  </Button>
                  {paymentFormData.invoiceUrl && (
                    <Chip
                      label={decodeURIComponent(paymentFormData.invoiceUrl.split('/').pop()?.split('?')[0] || 'חשבונית')}
                      onDelete={() => handleDeleteFile(paymentFormData.invoiceUrl, 'invoice')}
                      size="small"
                    />
                  )}
                </Box>
                {paymentFormData.invoiceUrl && (
                  <TextField
                    label="תיאור החשבונית"
                    fullWidth
                    size="small"
                    value={paymentFormData.invoiceDescription || ''}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, invoiceDescription: e.target.value })}
                    placeholder="למשל: חשבונית מס, הצעת מחיר..."
                    helperText="תאר את סוג החשבונית"
                  />
                )}
              </Box>

              {/* Receipt Upload */}
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom fontWeight={600}>
                  קבלה
                </Typography>
                <Box display="flex" gap={2} alignItems="center" sx={{ mb: 1 }}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<AttachFileIcon />}
                    size="small"
                    disabled={!!paymentFormData.receiptUrl}
                  >
                    העלה קבלה
                    <input
                      type="file"
                      hidden
                      accept="image/*,.pdf"
                      onChange={handleReceiptUpload}
                    />
                  </Button>
                  {paymentFormData.receiptUrl && (
                    <Chip
                      label={decodeURIComponent(paymentFormData.receiptUrl.split('/').pop()?.split('?')[0] || 'קבלה')}
                      onDelete={() => handleDeleteFile(paymentFormData.receiptUrl, 'receipt')}
                      size="small"
                    />
                  )}
                </Box>
                {paymentFormData.receiptUrl && (
                  <TextField
                    label="תיאור הקבלה"
                    fullWidth
                    size="small"
                    value={paymentFormData.receiptDescription || ''}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, receiptDescription: e.target.value })}
                    placeholder="למשל: קבלה על מקדמה, אישור תשלום..."
                    helperText="תאר את סוג הקבלה"
                  />
                )}
              </Box>

              <TextField
                label="הערות"
                fullWidth
                multiline
                rows={3}
                value={paymentFormData.notes}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePaymentDialog}>ביטול</Button>
            <Button
              onClick={handleSavePayment}
              variant="contained"
              disabled={
                !paymentFormData.amount || 
                (paymentFormData.status === 'שולם' && !paymentFormData.date) ||
                (paymentFormData.status !== 'שולם' && !paymentFormData.estimatedDate)
              }
            >
              שמור
            </Button>
          </DialogActions>
        </Dialog>
      </Box>

      {/* Files Dialog */}
      <Dialog open={openFilesDialog} onClose={() => setOpenFilesDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">קבצים מצורפים - {selectedVendorForFiles?.name}</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedVendorForFiles && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* חוזה */}
              {selectedVendorForFiles.contractFileUrl && (
                <Box>
                  <Typography variant="subtitle2" color="primary" gutterBottom fontWeight={600}>
                    חוזה
                  </Typography>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      p: 1.5, 
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#f5f5f5' }
                    }}
                    onClick={() => {
                      setViewingFile({
                        type: 'contract',
                        url: selectedVendorForFiles.contractFileUrl!,
                        vendor: selectedVendorForFiles
                      });
                      setOpenFileViewerDialog(true);
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <AttachFileIcon color="primary" />
                      <Typography variant="body2">
                        {selectedVendorForFiles.contractFileUrl.split('/').pop()}
                      </Typography>
                    </Box>
                  </Card>
                </Box>
              )}

              {/* חשבוניות וקבלות */}
              {canViewFinancials && selectedVendorForFiles.payments.some(p => p.invoiceUrl || p.receiptUrl) && (
                <Box>
                  <Typography variant="subtitle2" color="primary" gutterBottom fontWeight={600}>
                    חשבוניות וקבלות תשלומים
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {selectedVendorForFiles.payments
                      .filter(p => p.invoiceUrl || p.receiptUrl)
                      .map((payment) => (
                        <Card key={payment.id} variant="outlined" sx={{ p: 1.5, bgcolor: '#fafafa' }}>
                          <Box display="flex" flexDirection="column" gap={1}>
                            {/* כותרת התשלום */}
                            <Box display="flex" justifyContent="space-between" alignItems="center" pb={1} borderBottom="1px solid #e0e0e0">
                              <Typography variant="body2" fontWeight={700}>
                                תשלום מתאריך {payment.date}
                              </Typography>
                              <Chip label={formatCurrency(payment.amount)} size="small" color="primary" />
                            </Box>
                            
                            {/* חשבונית */}
                            {payment.invoiceUrl && (
                              <Box 
                                display="flex" 
                                alignItems="flex-start" 
                                gap={1}
                                sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f0f0f0' }, p: 0.5, borderRadius: 1 }}
                                onClick={() => {
                                  setViewingFile({
                                    type: 'invoice',
                                    url: payment.invoiceUrl!,
                                    description: payment.invoiceDescription,
                                    payment
                                  });
                                  setOpenFileViewerDialog(true);
                                }}
                              >
                                <AttachFileIcon color="error" fontSize="small" sx={{ mt: 0.3 }} />
                                <Box flex={1}>
                                  <Typography variant="body2" fontWeight={600} color="error.main">
                                    חשבונית: {payment.invoiceDescription || 'ללא תיאור'}
                                  </Typography>
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    {payment.invoiceUrl.split('/').pop()}
                                  </Typography>
                                </Box>
                              </Box>
                            )}
                            
                            {/* קבלה */}
                            {payment.receiptUrl && (
                              <Box 
                                display="flex" 
                                alignItems="flex-start" 
                                gap={1}
                                sx={{ cursor: 'pointer', '&:hover': { bgcolor: '#f0f0f0' }, p: 0.5, borderRadius: 1 }}
                                onClick={() => {
                                  setViewingFile({
                                    type: 'receipt',
                                    url: payment.receiptUrl!,
                                    description: payment.receiptDescription,
                                    payment
                                  });
                                  setOpenFileViewerDialog(true);
                                }}
                              >
                                <AttachFileIcon color="success" fontSize="small" sx={{ mt: 0.3 }} />
                                <Box flex={1}>
                                  <Typography variant="body2" fontWeight={600} color="success.main">
                                    קבלה: {payment.receiptDescription || 'ללא תיאור'}
                                  </Typography>
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    {payment.receiptUrl.split('/').pop()}
                                  </Typography>
                                </Box>
                              </Box>
                            )}
                            
                            {/* פרטים נוספים */}
                            <Box display="flex" gap={2} pt={0.5}>
                              <Typography variant="caption" color="text.secondary">
                                {payment.method}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                •
                              </Typography>
                              <Chip label={payment.status} size="small" />
                            </Box>
                          </Box>
                        </Card>
                      ))}
                  </Box>
                </Box>
              )}

              {/* אם אין קבצים */}
              {!selectedVendorForFiles.contractFileUrl && 
               (!canViewFinancials || !selectedVendorForFiles.payments.some(p => p.invoiceUrl || p.receiptUrl)) && (
                <Box textAlign="center" py={3}>
                  <Typography color="text.secondary">אין קבצים מצורפים</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFilesDialog(false)}>סגור</Button>
        </DialogActions>
      </Dialog>

      {/* Single File Viewer Dialog */}
      <Dialog 
        open={openFileViewerDialog} 
        onClose={() => setOpenFileViewerDialog(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {viewingFile?.type === 'invoice' ? '📄 חשבונית' : viewingFile?.type === 'receipt' ? '✅ קבלה' : '📋 חוזה'}
            </Typography>
            <IconButton onClick={() => setOpenFileViewerDialog(false)} size="small">
              <DeleteIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {viewingFile && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* פרטי הקובץ */}
              <Card sx={{ p: 2, bgcolor: viewingFile.type === 'invoice' ? '#fff5f5' : viewingFile.type === 'receipt' ? '#f1f8f4' : '#f0f7ff' }}>
                <Box display="flex" flexDirection="column" gap={1.5}>
                  {viewingFile.type === 'contract' ? (
                    <>
                      <Box>
                        <Typography variant="caption" color="text.secondary">סוג המסמך</Typography>
                        <Typography variant="h6" fontWeight={600} color="primary.main">
                          חוזה עם הספק
                        </Typography>
                      </Box>
                      
                      <Divider />
                      
                      <Box>
                        <Typography variant="caption" color="text.secondary">שם הקובץ</Typography>
                        <Typography variant="body2" fontFamily="monospace">
                          {viewingFile.url.split('/').pop()}
                        </Typography>
                      </Box>
                      
                      {viewingFile.vendor && (
                        <>
                          <Divider />
                          
                          <Box display="flex" gap={3}>
                            <Box flex={1}>
                              <Typography variant="caption" color="text.secondary">שם הספק</Typography>
                              <Typography variant="body2" fontWeight={600}>
                                {viewingFile.vendor.name}
                              </Typography>
                            </Box>
                            <Box flex={1}>
                              <Typography variant="caption" color="text.secondary">קטגוריה</Typography>
                              <Typography variant="body2">
                                {viewingFile.vendor.category}
                              </Typography>
                            </Box>
                          </Box>
                          
                          {canViewFinancials && viewingFile.vendor.contractAmount && (
                            <>
                              <Divider />
                              <Box>
                                <Typography variant="caption" color="text.secondary">סכום החוזה</Typography>
                                <Typography variant="h6" fontWeight={700} color="primary">
                                  {formatCurrency(viewingFile.vendor.contractAmount)}
                                </Typography>
                              </Box>
                            </>
                          )}
                          
                          {(viewingFile.vendor.startDate || viewingFile.vendor.endDate) && (
                            <>
                              <Divider />
                              <Box display="flex" gap={3}>
                                {viewingFile.vendor.startDate && (
                                  <Box flex={1}>
                                    <Typography variant="caption" color="text.secondary">תאריך התחלה</Typography>
                                    <Typography variant="body2">
                                      {viewingFile.vendor.startDate}
                                    </Typography>
                                  </Box>
                                )}
                                {viewingFile.vendor.endDate && (
                                  <Box flex={1}>
                                    <Typography variant="caption" color="text.secondary">תאריך סיום</Typography>
                                    <Typography variant="body2">
                                      {viewingFile.vendor.endDate}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            </>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <Box>
                        <Typography variant="caption" color="text.secondary">תיאור הקובץ</Typography>
                        <Typography variant="h6" fontWeight={600} color={viewingFile.type === 'invoice' ? 'error.main' : 'success.main'}>
                          {viewingFile.description || 'ללא תיאור'}
                        </Typography>
                      </Box>
                      
                      <Divider />
                      
                      <Box>
                        <Typography variant="caption" color="text.secondary">שם הקובץ</Typography>
                        <Typography variant="body2" fontFamily="monospace">
                          {viewingFile.url.split('/').pop()}
                        </Typography>
                      </Box>
                      
                      {canViewFinancials && viewingFile.payment && (
                        <>
                          <Divider />
                          
                          <Box display="flex" gap={3}>
                            <Box flex={1}>
                              <Typography variant="caption" color="text.secondary">תאריך תשלום</Typography>
                              <Typography variant="body2" fontWeight={500}>
                                {viewingFile.payment.date}
                              </Typography>
                            </Box>
                            <Box flex={1}>
                              <Typography variant="caption" color="text.secondary">סכום</Typography>
                              <Typography variant="body2" fontWeight={600} color="primary">
                                {formatCurrency(viewingFile.payment.amount)}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Divider />
                          
                          <Box display="flex" gap={3}>
                            <Box flex={1}>
                              <Typography variant="caption" color="text.secondary">אמצעי תשלום</Typography>
                              <Typography variant="body2">
                                {viewingFile.payment.method}
                              </Typography>
                            </Box>
                            <Box flex={1}>
                              <Typography variant="caption" color="text.secondary">סטטוס</Typography>
                              <Chip 
                                label={viewingFile.payment.status} 
                                size="small"
                                color={paymentStatuses.find(s => s.value === viewingFile.payment!.status)?.color}
                              />
                            </Box>
                          </Box>
                          
                          {viewingFile.payment.description && (
                            <>
                              <Divider />
                              <Box>
                                <Typography variant="caption" color="text.secondary">תיאור התשלום</Typography>
                                <Typography variant="body2">
                                  {viewingFile.payment.description}
                                </Typography>
                              </Box>
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}
                </Box>
              </Card>

              {/* תצוגה מקדימה של הקובץ */}
              <Card sx={{ p: 2, bgcolor: '#fafafa', textAlign: 'center' }}>
                {(() => {
                  const fileData = parseFileData(viewingFile.url);
                  // Use blob URL from cache if available, otherwise fallback to direct URL
                  const displayUrl = fileData?.id && imageBlobUrls[fileData.id]
                    ? imageBlobUrls[fileData.id]
                    : fileData?.downloadUrl || fileData?.url || viewingFile.url;
                  return displayUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <Box>
                      <img 
                        src={displayUrl} 
                        alt="File preview" 
                        style={{ maxWidth: '100%', maxHeight: '500px', objectFit: 'contain' }}
                      />
                    </Box>
                  ) : displayUrl.match(/\.pdf$/i) ? (
                    <Box>
                      <iframe 
                        src={displayUrl} 
                        width="100%" 
                        height="600px" 
                        style={{ border: 'none' }}
                        title="PDF Viewer"
                      />
                      <Button
                        variant="contained"
                        component="a"
                        href={displayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={fileData?.name || decodeURIComponent(displayUrl.split('/').pop()?.split('?')[0] || 'document.pdf')}
                        sx={{ mt: 2 }}
                      >
                        פתח ב-Tab חדש
                      </Button>
                    </Box>
                  ) : (
                    <Box>
                      <AttachFileIcon sx={{ fontSize: 60, color: 'action.disabled', mb: 2 }} />
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        לא ניתן להציג תצוגה מקדימה של קובץ זה
                      </Typography>
                      <Button
                        variant="contained"
                        component="a"
                        href={displayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={fileData?.name || decodeURIComponent(displayUrl.split('/').pop()?.split('?')[0] || 'file')}
                        sx={{ mt: 2 }}
                      >
                        הורד קובץ
                      </Button>
                    </Box>
                  );
                })()}
              </Card>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFileViewerDialog(false)}>סגור</Button>
        </DialogActions>
      </Dialog>

      {/* Google Drive Consent Dialog */}
      <GoogleDriveConsentDialog
        open={showDriveConsent}
        onClose={() => {
          setShowDriveConsent(false);
          setPendingFileUpload(null);
        }}
        onAccept={async () => {
          setShowDriveConsent(false);
          await performFileUpload();
        }}
      />
    </DashboardLayout>
  );
}
