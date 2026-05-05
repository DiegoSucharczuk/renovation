'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Card,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  MenuItem,
  TextField,
  IconButton,
  Collapse,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { doc, getDoc, collection, getDocs, query, where, getDocsFromServer, getDocFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectRole } from '@/hooks/useProjectRole';
import AccessDenied from '@/components/AccessDenied';
import { hebrewLabels } from '@/lib/labels';
import { Vendor, Payment } from '@/types/vendor';
import type { Project } from '@/types';
import { formatDateShort } from '@/lib/dateUtils';

const paymentStatuses = [
  { value: 'הכל', label: 'הכל' },
  { value: 'שולם', label: 'שולם', color: 'success' as const },
  { value: 'ממתין', label: 'ממתין', color: 'warning' as const },
  { value: 'מתוכנן', label: 'מתוכנן', color: 'default' as const },
];

export default function PaymentsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { user, firebaseUser } = useAuth();
  const router = useRouter();
  const { role, permissions, loading: roleLoading } = useProjectRole(projectId, firebaseUser?.uid || null);
  const [project, setProject] = useState<Project | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    fetchData();
  }, [mounted, user, projectId, router]);

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

      // Attach payments to vendors and sort by name
      const vendorsWithPayments = vendorsData.map(vendor => ({
        ...vendor,
        payments: paymentsData.filter(p => p.vendorId === vendor.id),
      })).sort((a, b) => a.name.localeCompare(b.name, 'he'));

      setVendors(vendorsWithPayments);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate effective paid amount for a payment, considering credit installments
  const getEffectivePaidAmount = (payment: Payment): number => {
    if (payment.status !== 'שולם') return 0;
    if (payment.method !== 'אשראי' || !payment.installments || payment.installments <= 1) {
      return payment.amount;
    }
    const paymentDate = payment.date ? new Date(payment.date) : null;
    if (!paymentDate) return payment.amount;
    
    const now = new Date();
    const monthsDiff = (now.getFullYear() - paymentDate.getFullYear()) * 12 + (now.getMonth() - paymentDate.getMonth());
    const installmentsPaid = Math.min(Math.max(monthsDiff + 1, 0), payment.installments);
    const monthlyAmount = payment.amount / payment.installments;
    return Math.round(monthlyAmount * installmentsPaid * 100) / 100;
  };

  const getTotalPaid = (vendor: Vendor) => {
    return vendor.payments
      .filter(p => p.status === 'שולם')
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const getTotalEffectivePaid = (vendor: Vendor) => {
    return vendor.payments
      .filter(p => p.status === 'שולם')
      .reduce((sum, p) => sum + getEffectivePaidAmount(p), 0);
  };

  const getPaymentProgress = (vendor: Vendor) => {
    if (!vendor.contractAmount) return 0;
    const totalPaid = getTotalPaid(vendor);
    return Math.round((totalPaid / vendor.contractAmount) * 100);
  };

  const getFilteredVendors = () => {
    // Always show all vendors
    return vendors;
  };

  const filteredVendors = getFilteredVendors();

  // Calculate totals from ALL vendors (not filtered)
  const totalContract = vendors.reduce((sum, v) => sum + (v.contractAmount || 0), 0);
  const totalPaid = vendors.reduce((sum, v) => sum + getTotalPaid(v), 0);
  const totalEffectivePaid = vendors.reduce((sum, v) => sum + getTotalEffectivePaid(v), 0);
  const totalPending = vendors.reduce((sum, v) => 
    sum + v.payments.filter(p => p.status === 'ממתין').reduce((s, p) => s + p.amount, 0), 0);
  const totalPlanned = vendors.reduce((sum, v) => 
    sum + v.payments.filter(p => p.status === 'מתוכנן').reduce((s, p) => s + p.amount, 0), 0);
  const totalBalance = totalContract - totalEffectivePaid;
  
  // Calculate total payments count
  const totalPaymentsCount = vendors.reduce((sum, v) => sum + v.payments.length, 0);

  if (!mounted || roleLoading || loading) {
    return (
      <DashboardLayout projectId={projectId} project={project || undefined}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  // Check permissions
  if (!role || !permissions || !permissions.canViewPayments) {
    return (
      <DashboardLayout projectId={projectId} project={project || undefined}>
        <AccessDenied message="אין לך הרשאה לצפות בדוח התשלומים" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout projectId={projectId} project={project || undefined}>
      <Box sx={{ pr: 3 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} sx={{ px: 3 }}>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h3" fontWeight="bold">
              דוח תשלומים
            </Typography>
          </Box>
        </Box>

        {/* Summary Cards */}
        <Box sx={{ px: 3, mb: 3 }}>
          <Card sx={{ p: 3, backgroundColor: '#f5f5f5' }}>
            <Box display="flex" justifyContent="space-around" gap={2}>
              <Tooltip title="סכום כולל של כל החוזים עם הספקים">
                <Box textAlign="center">
                  <Typography variant="body2" color="text.secondary" display="block" fontWeight={600}>
                    סה"כ חוזים
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="primary.main">
                    {formatCurrency(totalContract)}
                  </Typography>
                </Box>
              </Tooltip>
              <Tooltip title="סכום שבפועל ירד מהחשבון/כרטיס (כולל חישוב תשלומי אשראי)">
                <Box textAlign="center">
                  <Typography variant="body2" color="text.secondary" display="block" fontWeight={600}>
                    ירד בפועל
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="success.main">
                    {formatCurrency(totalEffectivePaid)}
                  </Typography>
                </Box>
              </Tooltip>
              <Tooltip title="סכום כספי של תשלומים המתינים לביצוע (סטטוס: ממתין)">
                <Box textAlign="center">
                  <Typography variant="body2" color="text.secondary" display="block" fontWeight={600}>
                    ממתין
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="warning.main">
                    {formatCurrency(totalPending)}
                  </Typography>
                </Box>
              </Tooltip>
              <Tooltip title="סכום כספי של תשלומים מתוכננים לעתיד (סטטוס: מתוכנן)">
                <Box textAlign="center">
                  <Typography variant="body2" color="text.secondary" display="block" fontWeight={600}>
                    מתוכנן
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="info.main">
                    {formatCurrency(totalPlanned)}
                  </Typography>
                </Box>
              </Tooltip>
              <Tooltip title="הסכום שנותר לתשלום = סה״כ חוזים פחות סכום שולם">
                <Box textAlign="center">
                  <Typography variant="body2" color="text.secondary" display="block" fontWeight={600}>
                    יתרה לתשלום
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color="error.main">
                    {formatCurrency(totalBalance)}
                  </Typography>
                </Box>
              </Tooltip>
              <Tooltip title="אחוז מהחוזים שבפועל ירד = (ירד בפועל / סה״כ חוזים) × 100">
                <Box textAlign="center">
                  <Typography variant="body2" color="text.secondary" display="block" fontWeight={600}>
                    אחוז שירד
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {totalContract > 0 ? Math.round((totalEffectivePaid / totalContract) * 100) : 0}%
                  </Typography>
                </Box>
              </Tooltip>
            </Box>
          </Card>
        </Box>

        {/* Payments Table */}
        <Card sx={{ mx: 3, direction: 'ltr' }}>
          <TableContainer sx={{ direction: 'rtl', maxHeight: 'calc(100vh - 320px)', overflow: 'auto' }}>
            <Box sx={{ direction: 'ltr' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 'bold', width: 50 }}></TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>שם הספק</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>קטגוריה</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>סכום חוזה</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>שולם</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>ממתין</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>מתוכנן</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>יתרה לתשלום</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>סטטוס</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredVendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center">
                      <Typography variant="body2" color="text.secondary" py={3}>
                        אין תשלומים להצגה
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendors.map((vendor) => {
                    const totalEffPaid = getTotalEffectivePaid(vendor);
                    const totalPending = vendor.payments
                      .filter(p => p.status === 'ממתין')
                      .reduce((sum, p) => sum + p.amount, 0);
                    const totalPlanned = vendor.payments
                      .filter(p => p.status === 'מתוכנן')
                      .reduce((sum, p) => sum + p.amount, 0);
                    const balance = vendor.contractAmount ? vendor.contractAmount - totalEffPaid : null;
                    const paidCount = vendor.payments.filter(p => p.status === 'שולם').length;
                    const pendingCount = vendor.payments.filter(p => p.status === 'ממתין').length;
                    const plannedCount = vendor.payments.filter(p => p.status === 'מתוכנן').length;
                    const isExpanded = expandedVendorId === vendor.id;
                    const hasOverdueWaiting = vendor.payments.some(p => 
                      p.status === 'ממתין' && p.estimatedDate && 
                      new Date(p.estimatedDate) < new Date()
                    );

                    return (
                      <React.Fragment key={vendor.id}>
                        <TableRow 
                          hover
                          sx={{ 
                            cursor: 'pointer',
                            backgroundColor: hasOverdueWaiting ? '#ffebee' : 'inherit',
                            '&:hover': {
                              backgroundColor: hasOverdueWaiting ? '#ffcdd2' : undefined
                            }
                          }}
                          onClick={() => setExpandedVendorId(isExpanded ? null : vendor.id)}
                        >
                          <TableCell sx={{ textAlign: 'center' }}>
                            <IconButton size="small">
                              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Typography fontWeight={500}>{vendor.name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={vendor.category} size="small" />
                          </TableCell>
                          <TableCell align="center">
                            <Typography>
                              {vendor.contractAmount ? formatCurrency(vendor.contractAmount) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Box>
                              <Typography color="success.main" fontWeight={600} variant="h6">
                                {formatCurrency(totalEffPaid)}
                              </Typography>
                              {paidCount > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  ({paidCount} {paidCount === 1 ? 'תשלום' : 'תשלומים'})
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Box>
                              <Typography color="warning.main" fontWeight={600}>
                                {totalPending > 0 ? formatCurrency(totalPending) : '—'}
                              </Typography>
                              {pendingCount > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  ({pendingCount} {pendingCount === 1 ? 'תשלום' : 'תשלומים'})
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Box>
                              <Typography color="info.main" fontWeight={600}>
                                {totalPlanned > 0 ? formatCurrency(totalPlanned) : '—'}
                              </Typography>
                              {plannedCount > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  ({plannedCount} {plannedCount === 1 ? 'תשלום' : 'תשלומים'})
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            {balance !== null ? (
                              <Typography 
                                color={balance > 0 ? 'warning.main' : 'success.main'}
                                fontWeight={600}
                              >
                                {formatCurrency(balance)}
                              </Typography>
                            ) : '—'}
                          </TableCell>
                          <TableCell align="center">
                            {vendor.contractAmount ? (
                              (() => {
                                const totalPayments = vendor.payments.reduce((sum, p) => sum + p.amount, 0);
                                const difference = totalPayments - vendor.contractAmount;
                                
                                let label = '';
                                let color: 'success' | 'warning' | 'error' = 'success';
                                let icon = '✓';
                                
                                if (difference === 0) {
                                  label = 'תואם';
                                  color = 'success';
                                  icon = '✓';
                                } else if (difference < 0) {
                                  label = `חסר ${formatCurrency(Math.abs(difference))}`;
                                  color = 'warning';
                                  icon = '⚠';
                                } else {
                                  label = `עודף ${formatCurrency(difference)}`;
                                  color = 'error';
                                  icon = '⚠';
                                }
                                
                                return (
                                  <Chip
                                    label={label}
                                    size="small"
                                    color={color}
                                    icon={<span>{icon}</span>}
                                  />
                                );
                              })()
                            ) : (
                              <Typography variant="body2" color="text.secondary">—</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                        {/* Expanded payments section */}
                        <TableRow>
                          <TableCell colSpan={9} sx={{ padding: 0 }}>
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              <Box sx={{ p: 2, backgroundColor: '#fafafa' }}>
                                <Typography variant="h6" sx={{ mb: 2 }}>תשלומים פרטניים</Typography>
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>תאריך</TableCell>
                                      <TableCell align="center">סכום</TableCell>
                                      <TableCell align="center">אמצעי תשלום</TableCell>
                                      <TableCell align="center">סטטוס</TableCell>
                                      <TableCell>הערות</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {[...vendor.payments].sort((a, b) => {
                                      const statusOrder: Record<string, number> = { 'שולם': 0, 'ממתין': 1, 'מתוכנן': 2 };
                                      const orderA = statusOrder[a.status] ?? 3;
                                      const orderB = statusOrder[b.status] ?? 3;
                                      if (orderA !== orderB) return orderA - orderB;
                                      const dateA = a.status === 'שולם' ? a.date : a.estimatedDate;
                                      const dateB = b.status === 'שולם' ? b.date : b.estimatedDate;
                                      return (dateA || '').localeCompare(dateB || '');
                                    }).map((payment) => {
                                      const isOverdueWaiting = payment.status === 'ממתין' && payment.estimatedDate && 
                                        new Date(payment.estimatedDate) < new Date();
                                      return (
                                        <TableRow 
                                          key={payment.id}
                                          sx={{ 
                                            backgroundColor: isOverdueWaiting ? '#ffebee' : 'inherit'
                                          }}
                                        >
                                          <TableCell>{formatDateShort(payment.status === 'שולם' ? (payment.date || '') : (payment.estimatedDate || ''))}</TableCell>
                                          <TableCell align="center">
                                            {formatCurrency(payment.amount)}
                                            {payment.method === 'אשראי' && payment.installments && payment.installments > 1 && (
                                              <Typography variant="caption" display="block" color="text.secondary">
                                                {payment.installments} תשלומים × {formatCurrency(payment.amount / payment.installments)}
                                              </Typography>
                                            )}
                                          </TableCell>
                                          <TableCell align="center">
                                            {payment.method}
                                            {payment.method === 'אשראי' && payment.installments && payment.installments > 1 && payment.date && (
                                              (() => {
                                                const paymentDate = new Date(payment.date);
                                                const now = new Date();
                                                const monthsDiff = (now.getFullYear() - paymentDate.getFullYear()) * 12 + (now.getMonth() - paymentDate.getMonth());
                                                const installmentsPaid = Math.min(Math.max(monthsDiff + 1, 0), payment.installments);
                                                const remaining = payment.installments - installmentsPaid;
                                                return (
                                                  <Typography variant="caption" display="block" color={remaining > 0 ? 'warning.main' : 'success.main'}>
                                                    {installmentsPaid}/{payment.installments} תשלומים ירדו
                                                  </Typography>
                                                );
                                              })()
                                            )}
                                          </TableCell>
                                          <TableCell align="center">
                                            <Chip 
                                              label={payment.status} 
                                              size="small" 
                                              color={
                                                payment.status === 'שולם' ? 'success' :
                                                isOverdueWaiting ? 'error' :
                                                payment.status === 'ממתין' ? 'warning' :
                                                'default'
                                              }
                                            />
                                          </TableCell>
                                          <TableCell>{payment.notes || '—'}</TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>            </Box>          </TableContainer>
        </Card>
      </Box>
    </DashboardLayout>
  );
}
