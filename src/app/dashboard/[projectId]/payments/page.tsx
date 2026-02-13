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
} from '@mui/material';
import { doc, getDoc, collection, getDocs, query, where, getDocsFromServer, getDocFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectRole } from '@/hooks/useProjectRole';
import AccessDenied from '@/components/AccessDenied';
import { hebrewLabels } from '@/lib/labels';
import { Vendor, Payment } from '@/types/vendor';
import type { Project } from '@/types';

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

  const getTotalPaid = (vendor: Vendor) => {
    return vendor.payments
      .filter(p => p.status === 'שולם')
      .reduce((sum, p) => sum + p.amount, 0);
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
  const totalPending = vendors.reduce((sum, v) => 
    sum + v.payments.filter(p => p.status === 'ממתין').reduce((s, p) => s + p.amount, 0), 0);
  const totalPlanned = vendors.reduce((sum, v) => 
    sum + v.payments.filter(p => p.status === 'מתוכנן').reduce((s, p) => s + p.amount, 0), 0);
  const totalBalance = totalContract - totalPaid;
  
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
            <Chip label={`${totalPaymentsCount} תשלומים`} color="primary" size="medium" />
            <Chip label={`${filteredVendors.length} ספקים`} color="secondary" size="medium" />
          </Box>
        </Box>

        {/* Summary Cards */}
        <Box sx={{ px: 3, mb: 3 }}>
          <Card sx={{ p: 3, backgroundColor: '#f5f5f5' }}>
            <Box display="flex" justifyContent="space-around" gap={2}>
              <Box textAlign="center">
                <Typography variant="body2" color="text.secondary" display="block" fontWeight={600}>
                  סה"כ חוזים
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="primary.main">
                  {formatCurrency(totalContract)}
                </Typography>
              </Box>
              <Box textAlign="center">
                <Typography variant="body2" color="text.secondary" display="block" fontWeight={600}>
                  שולם
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {formatCurrency(totalPaid)}
                </Typography>
              </Box>
              <Box textAlign="center">
                <Typography variant="body2" color="text.secondary" display="block" fontWeight={600}>
                  ממתין
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="warning.main">
                  {formatCurrency(totalPending)}
                </Typography>
              </Box>
              <Box textAlign="center">
                <Typography variant="body2" color="text.secondary" display="block" fontWeight={600}>
                  מתוכנן
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="info.main">
                  {formatCurrency(totalPlanned)}
                </Typography>
              </Box>
              <Box textAlign="center">
                <Typography variant="body2" color="text.secondary" display="block" fontWeight={600}>
                  יתרה
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="error.main">
                  {formatCurrency(totalBalance)}
                </Typography>
              </Box>
              <Box textAlign="center">
                <Typography variant="body2" color="text.secondary" display="block" fontWeight={600}>
                  אחוז ביצוע
                </Typography>
                <Typography variant="h4" fontWeight="bold">
                  {totalContract > 0 ? Math.round((totalPaid / totalContract) * 100) : 0}%
                </Typography>
              </Box>
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
                  <TableCell sx={{ fontWeight: 'bold' }}>שם הספק</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>קטגוריה</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>סכום חוזה</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>שולם</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>ממתין</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>מתוכנן</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>יתרה</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>סטטוס</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredVendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body2" color="text.secondary" py={3}>
                        אין תשלומים להצגה
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendors.map((vendor) => {
                    const totalPaid = getTotalPaid(vendor);
                    const totalPending = vendor.payments
                      .filter(p => p.status === 'ממתין')
                      .reduce((sum, p) => sum + p.amount, 0);
                    const totalPlanned = vendor.payments
                      .filter(p => p.status === 'מתוכנן')
                      .reduce((sum, p) => sum + p.amount, 0);
                    const balance = vendor.contractAmount ? vendor.contractAmount - totalPaid : null;
                    const paidCount = vendor.payments.filter(p => p.status === 'שולם').length;
                    const pendingCount = vendor.payments.filter(p => p.status === 'ממתין').length;
                    const plannedCount = vendor.payments.filter(p => p.status === 'מתוכנן').length;

                    return (
                      <TableRow key={vendor.id} hover>
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
                              {formatCurrency(totalPaid)}
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
                              const isMatching = totalPayments === vendor.contractAmount;
                              return (
                                <Chip
                                  label={isMatching ? 'תואם' : 'לא תואם'}
                                  size="small"
                                  color={isMatching ? 'success' : 'warning'}
                                  icon={<span>{isMatching ? '✓' : '⚠'}</span>}
                                />
                              );
                            })()
                          ) : (
                            <Typography variant="body2" color="text.secondary">—</Typography>
                          )}
                        </TableCell>
                      </TableRow>
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
