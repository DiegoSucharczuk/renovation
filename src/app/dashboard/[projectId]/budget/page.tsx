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
  IconButton,
  Button,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import { doc, collection, query, where, getDocsFromServer, getDocFromServer, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectRole } from '@/hooks/useProjectRole';
import AccessDenied from '@/components/AccessDenied';
import type { Project, BudgetItem, BudgetCategory } from '@/types';

const budgetCategories: { value: BudgetCategory; label: string; icon: string }[] = [
  { value: 'ELECTRICITY', label: 'חשמל', icon: '⚡' },
  { value: 'PLUMBING', label: 'אינסטלציה', icon: '🚰' },
  { value: 'FLOORING', label: 'ריצוף / פרקט', icon: '🟫' },
  { value: 'CARPENTRY', label: 'נגרות', icon: '🪚' },
  { value: 'AC', label: 'מיזוג אוויר', icon: '❄️' },
  { value: 'PAINTING', label: 'צביעה', icon: '🎨' },
  { value: 'ALUMINUM', label: 'אלומיניום', icon: '🪟' },
  { value: 'GYPSUM', label: 'גבס', icon: '⬜' },
  { value: 'DESIGN', label: 'עיצוב', icon: '✨' },
  { value: 'KITCHEN', label: 'מטבח', icon: '🍳' },
  { value: 'DOORS', label: 'דלתות', icon: '🚪' },
  { value: 'SANITARY', label: 'סניטריה', icon: '🚿' },
  { value: 'DEMOLITION', label: 'הריסה / פינוי', icon: '🔨' },
  { value: 'LIGHTING', label: 'תאורה', icon: '💡' },
  { value: 'OTHER', label: 'אחר', icon: '📦' },
];

const commonUnits = ['נקודה', 'יח\'', 'מ"ר', 'מ"א', 'פריט', 'חדר', 'קומפלט', 'שעה'];

const getCategoryLabel = (value: BudgetCategory) => {
  const cat = budgetCategories.find(c => c.value === value);
  return cat ? `${cat.icon} ${cat.label}` : value;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount);
};

interface BudgetFormData {
  category: BudgetCategory;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  notes: string;
}

const emptyForm: BudgetFormData = {
  category: 'OTHER',
  description: '',
  unit: 'יח\'',
  quantity: 1,
  unitPrice: 0,
  notes: '',
};

export default function BudgetPlanningPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { user, firebaseUser } = useAuth();
  const router = useRouter();
  const { permissions, loading: roleLoading } = useProjectRole(projectId, firebaseUser?.uid || null);
  const [project, setProject] = useState<Project | null>(null);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [form, setForm] = useState<BudgetFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('הכל');

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
  }, [mounted, user, projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const projectDoc = await getDocFromServer(doc(db, 'projects', projectId));
      if (projectDoc.exists()) {
        setProject({
          id: projectDoc.id,
          ...projectDoc.data(),
          createdAt: projectDoc.data().createdAt?.toDate() || new Date(),
        } as Project);
      }

      const budgetQuery = query(
        collection(db, 'budgetItems'),
        where('projectId', '==', projectId)
      );
      const budgetSnapshot = await getDocsFromServer(budgetQuery);
      const items = budgetSnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() || new Date(),
        updatedAt: d.data().updatedAt?.toDate() || undefined,
      })) as BudgetItem[];

      items.sort((a, b) => {
        const catOrder = budgetCategories.findIndex(c => c.value === a.category) - budgetCategories.findIndex(c => c.value === b.category);
        if (catOrder !== 0) return catOrder;
        return a.description.localeCompare(b.description, 'he');
      });

      setBudgetItems(items);
    } catch (error) {
      console.error('Error fetching budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: BudgetItem) => {
    setEditingItem(item);
    setForm({
      category: item.category,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      notes: item.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.description.trim()) return;
    setSaving(true);
    try {
      const totalPrice = form.quantity * form.unitPrice;
      if (editingItem) {
        await updateDoc(doc(db, 'budgetItems', editingItem.id), {
          category: form.category,
          description: form.description.trim(),
          unit: form.unit,
          quantity: form.quantity,
          unitPrice: form.unitPrice,
          totalPrice,
          notes: form.notes.trim() || null,
          updatedAt: new Date(),
        });
      } else {
        await addDoc(collection(db, 'budgetItems'), {
          projectId,
          category: form.category,
          description: form.description.trim(),
          unit: form.unit,
          quantity: form.quantity,
          unitPrice: form.unitPrice,
          totalPrice,
          notes: form.notes.trim() || null,
          createdAt: new Date(),
        });
      }
      setDialogOpen(false);
      await fetchData();
    } catch (error) {
      console.error('Error saving budget item:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'budgetItems', id));
      setDeleteConfirmId(null);
      await fetchData();
    } catch (error) {
      console.error('Error deleting budget item:', error);
    }
  };

  if (!mounted || loading || roleLoading) {
    return (
      <DashboardLayout projectId={projectId} scrollable>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </DashboardLayout>
    );
  }

  if (!permissions?.canViewBudget) {
    return (
      <DashboardLayout projectId={projectId}>
        <AccessDenied />
      </DashboardLayout>
    );
  }

  const canEdit = permissions?.canEditBudget;

  const filteredItems = filterCategory === 'הכל'
    ? budgetItems
    : budgetItems.filter(item => item.category === filterCategory);

  const totalBudget = budgetItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const plannedBudget = project?.budgetPlanned || 0;
  const diff = plannedBudget - totalBudget;

  // Group totals by category
  const categoryTotals = budgetItems.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.totalPrice;
    return acc;
  }, {} as Record<string, number>);

  return (
    <DashboardLayout projectId={projectId} project={project || undefined} scrollable>
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h5" fontWeight={700}>
            📊 תכנון תקציב
          </Typography>
          {canEdit && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAdd}
              sx={{ borderRadius: 2 }}
            >
              הוסף סעיף
            </Button>
          )}
        </Box>

        {/* Summary Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2, mb: 3 }}>
          <Card sx={{ p: 2.5, textAlign: 'center', background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)' }}>
            <Typography variant="body2" color="text.secondary">תקציב מתוכנן</Typography>
            <Typography variant="h5" fontWeight={700} color="primary">{formatCurrency(plannedBudget)}</Typography>
          </Card>
          <Card sx={{ p: 2.5, textAlign: 'center', background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)' }}>
            <Typography variant="body2" color="text.secondary">סה״כ סעיפים</Typography>
            <Typography variant="h5" fontWeight={700} color="warning.dark">{formatCurrency(totalBudget)}</Typography>
          </Card>
          <Card sx={{ p: 2.5, textAlign: 'center', background: diff >= 0 ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' : 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)' }}>
            <Typography variant="body2" color="text.secondary">{diff >= 0 ? 'יתרה' : 'חריגה'}</Typography>
            <Typography variant="h5" fontWeight={700} color={diff >= 0 ? 'success.dark' : 'error.dark'}>{formatCurrency(Math.abs(diff))}</Typography>
          </Card>
        </Box>

        {/* Category Breakdown */}
        {Object.keys(categoryTotals).length > 0 && (
          <Card sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>פירוט לפי קטגוריה</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {budgetCategories
                .filter(cat => categoryTotals[cat.value])
                .map(cat => (
                  <Chip
                    key={cat.value}
                    label={`${cat.icon} ${cat.label}: ${formatCurrency(categoryTotals[cat.value])}`}
                    variant="outlined"
                    sx={{ fontWeight: 600, fontSize: '0.85rem' }}
                    onClick={() => setFilterCategory(filterCategory === cat.value ? 'הכל' : cat.value)}
                    color={filterCategory === cat.value ? 'primary' : 'default'}
                  />
                ))}
              {filterCategory !== 'הכל' && (
                <Chip label="הצג הכל" color="default" onClick={() => setFilterCategory('הכל')} onDelete={() => setFilterCategory('הכל')} />
              )}
            </Box>
          </Card>
        )}

        {/* Budget Items Table */}
        <Card>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell sx={{ fontWeight: 700 }}>קטגוריה</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>תיאור</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">יחידה</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">כמות</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">מחיר ליחידה</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">סה״כ</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>הערות</TableCell>
                  {canEdit && <TableCell sx={{ fontWeight: 700 }} align="center">פעולות</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canEdit ? 8 : 7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      <Typography variant="body1">אין סעיפי תקציב עדיין</Typography>
                      {canEdit && (
                        <Button startIcon={<AddIcon />} onClick={handleOpenAdd} sx={{ mt: 1 }}>
                          הוסף סעיף ראשון
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {getCategoryLabel(item.category)}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.description}</TableCell>
                      <TableCell align="center">{item.unit}</TableCell>
                      <TableCell align="center">{item.quantity}</TableCell>
                      <TableCell align="center">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell align="center">
                        <Typography fontWeight={700}>{formatCurrency(item.totalPrice)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.notes || '—'}
                        </Typography>
                      </TableCell>
                      {canEdit && (
                        <TableCell align="center">
                          <Tooltip title="ערוך">
                            <IconButton size="small" onClick={() => handleOpenEdit(item)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="מחק">
                            <IconButton size="small" color="error" onClick={() => setDeleteConfirmId(item.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
                {filteredItems.length > 0 && (
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell colSpan={5} sx={{ fontWeight: 700, fontSize: '1rem' }}>סה״כ</TableCell>
                    <TableCell align="center">
                      <Typography fontWeight={700} fontSize="1rem">{formatCurrency(filteredItems.reduce((s, i) => s + i.totalPrice, 0))}</Typography>
                    </TableCell>
                    <TableCell colSpan={canEdit ? 2 : 1} />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* Add / Edit Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{editingItem ? 'עריכת סעיף' : 'הוספת סעיף חדש'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField
              select
              label="קטגוריה"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as BudgetCategory })}
              fullWidth
            >
              {budgetCategories.map((cat) => (
                <MenuItem key={cat.value} value={cat.value}>{cat.icon} {cat.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="תיאור"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              fullWidth
              placeholder="לדוגמה: נקודות חשמל סלון"
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
              <TextField
                select
                label="יחידת מידה"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              >
                {commonUnits.map((u) => (
                  <MenuItem key={u} value={u}>{u}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="כמות"
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Math.max(0, Number(e.target.value)) })}
                inputProps={{ min: 0, step: 1 }}
              />
              <TextField
                label="מחיר ליחידה (₪)"
                type="number"
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: Math.max(0, Number(e.target.value)) })}
                inputProps={{ min: 0 }}
              />
            </Box>
            <Box sx={{ textAlign: 'center', p: 1.5, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">סה״כ</Typography>
              <Typography variant="h6" fontWeight={700} color="primary">
                {formatCurrency(form.quantity * form.unitPrice)}
              </Typography>
            </Box>
            <TextField
              label="הערות"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>ביטול</Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving || !form.description.trim()}
              startIcon={<SaveIcon />}
            >
              {saving ? 'שומר...' : 'שמור'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)}>
          <DialogTitle>מחיקת סעיף</DialogTitle>
          <DialogContent>
            <Typography>האם אתה בטוח שברצונך למחוק סעיף זה?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmId(null)}>ביטול</Button>
            <Button variant="contained" color="error" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              מחק
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </DashboardLayout>
  );
}
