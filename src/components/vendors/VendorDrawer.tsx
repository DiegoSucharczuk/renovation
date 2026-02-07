import {
  Drawer,
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Divider,
  IconButton,
  Avatar,
  Grid,
  Fade,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCardIcon from "@mui/icons-material/AddCard";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import BusinessIcon from "@mui/icons-material/Business";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import NotesIcon from "@mui/icons-material/Notes";
import StarIcon from "@mui/icons-material/Star";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import RecommendIcon from "@mui/icons-material/Recommend";

import { useState } from "react";
import { Vendor } from "@/types/vendor";

interface VendorDrawerProps {
  open: boolean;
  onClose: () => void;
  vendor: Vendor | null;
  onEdit?: (vendor: Vendor) => void;
  onDelete?: (vendorId: string) => void;
  onViewPayments?: (vendor: Vendor) => void;
  formatCurrency?: (amount: number) => string;
}

export default function VendorDrawer({ 
  open, 
  onClose, 
  vendor,
  onEdit,
  onDelete,
  onViewPayments,
  formatCurrency = (amount) => `₪${amount.toLocaleString()}`
}: VendorDrawerProps) {
  const [tab, setTab] = useState(0);

  if (!vendor) return null;

  // Normalize vendor fields for the drawer
  const totalPaid = vendor.payments?.filter(p => p.status === 'שולם').reduce((sum, p) => sum + p.amount, 0) || 0;
  const balance = (vendor.contractAmount || 0) - totalPaid;
  const paymentsCount = vendor.payments?.length || 0;
  
  const normalized = {
    contractTotal: vendor.contractAmount ?? 0,
    paid: totalPaid,
    balance: balance,
    paymentsCount: paymentsCount,
    ratingCount: vendor.rating ? 1 : 0,
    status: vendor.startDate ? 'פעיל' : 'לא החל',
    imageUrl: null as string | null
  };

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 480 },
          direction: "rtl",
          p: 0,
          overflow: "hidden"
        }
      }}
    >
      {/* HEADER */}
      <Fade in={open}>
        <Box
          sx={{
            background: "linear-gradient(135deg, #1e88e5, #1565c0)",
            color: "white",
            p: 3,
            display: "flex",
            alignItems: "center",
            gap: 2
          }}
        >
          <Avatar
            sx={{
              width: 70,
              height: 70,
              bgcolor: "white",
              color: "#1976d2",
              fontSize: 30,
              fontWeight: "bold"
            }}
          >
            {vendor.name[0]}
          </Avatar>

          <Box flex={1}>
            <Typography variant="h5" fontWeight="bold">
              {vendor.name}
            </Typography>
            <Typography variant="subtitle1">{vendor.category}</Typography>

            {vendor.rating && (
              <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                <StarIcon fontSize="small" />
                <Typography>{vendor.rating} / 5</Typography>
              </Box>
            )}
          </Box>

          <Box display="flex" gap={0.5}>
            {onEdit && (
              <IconButton 
                sx={{ color: "white" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(vendor);
                  onClose();
                }}
                title="עריכה"
              >
                <EditIcon />
              </IconButton>
            )}
            {onDelete && (
              <IconButton 
                sx={{ color: "white" }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm('האם אתה בטוח שברצונך למחוק ספק זה?')) {
                    onDelete(vendor.id);
                    onClose();
                  }
                }}
                title="מחיקה"
              >
                <DeleteIcon />
              </IconButton>
            )}
            {onViewPayments && (
              <IconButton 
                sx={{ color: "white" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewPayments(vendor);
                  onClose();
                }}
                title="תשלומים"
              >
                <AddCardIcon />
              </IconButton>
            )}
            <IconButton onClick={onClose} sx={{ color: "white" }} title="סגור">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </Fade>

      {/* QUICK INFO */}
      <Box sx={{ p: 2 }}>
        <Grid container spacing={2}>
          {[
            { label: "חוזה", value: normalized.contractTotal ? formatCurrency(normalized.contractTotal) : '—' },
            { label: "שולם", value: formatCurrency(normalized.paid) },
            { label: "יתרה", value: normalized.contractTotal ? formatCurrency(normalized.balance) : '—' },
            { label: "תשלומים", value: normalized.paymentsCount },
            { label: "דירוג", value: vendor.rating ? `${vendor.rating} ⭐` : '—' },
            { label: "סטטוס", value: normalized.status }
          ].map((item, i) => (
            <Grid size={{ xs: 4 }} key={i}>
              <Card
                variant="outlined"
                sx={{
                  textAlign: "center",
                  p: 1,
                  transition: "0.2s",
                  "&:hover": { transform: "scale(1.03)", boxShadow: 2 }
                }}
              >
                <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                <Typography fontWeight="bold" variant="body2">{item.value}</Typography>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Divider />

      {/* TABS */}
      <Tabs
        value={tab}
        onChange={(e, v) => setTab(v)}
        variant="scrollable"
        scrollButtons
        allowScrollButtonsMobile
        textColor="primary"
        indicatorColor="primary"
        sx={{ borderBottom: "1px solid #eee" }}
      >
        <Tab label="פרטי קשר" />
        <Tab label="פרטים עסקיים" />
        <Tab label="פרטי בנק" />
        <Tab label="הערות" />
        <Tab label="היסטוריית תשלומים" />
        <Tab label="מידע נוסף" />
      </Tabs>

      {/* TAB CONTENT */}
      <Box sx={{ p: 2, overflow: "auto", maxHeight: "calc(100vh - 400px)" }}>
        {/* פרטי קשר */}
        {tab === 0 && (
          <Fade in={true}>
            <Card variant="outlined">
              <CardContent>
                {vendor.contactPerson && (
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <PhoneIcon color="primary" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">איש קשר</Typography>
                      <Typography fontWeight={500}>{vendor.contactPerson}</Typography>
                    </Box>
                  </Box>
                )}

                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <PhoneIcon color="primary" />
                  <Box>
                    <Typography variant="caption" color="text.secondary">טלפון</Typography>
                    <Typography 
                      component="a" 
                      href={`tel:${vendor.phone}`}
                      sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 500 }}
                    >
                      {vendor.phone}
                    </Typography>
                  </Box>
                </Box>

                {vendor.whatsappNumber && (
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <PhoneIcon color="success" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">WhatsApp</Typography>
                      <Typography 
                        component="a" 
                        href={`https://wa.me/${vendor.whatsappNumber.replace(/\D/g, '')}`}
                        target="_blank"
                        sx={{ color: '#25D366', textDecoration: 'none', fontWeight: 500 }}
                      >
                        {vendor.whatsappNumber}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {vendor.email && (
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <EmailIcon color="primary" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">אימייל</Typography>
                      <Typography 
                        component="a" 
                        href={`mailto:${vendor.email}`}
                        sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 500 }}
                      >
                        {vendor.email}
                      </Typography>
                    </Box>
                  </Box>
                )}

                {vendor.address && (
                  <Box display="flex" alignItems="center" gap={1}>
                    <BusinessIcon color="primary" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">כתובת</Typography>
                      <Typography fontWeight={500}>{vendor.address}</Typography>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Fade>
        )}

        {/* פרטים עסקיים */}
        {tab === 1 && (
          <Fade in={true}>
            <Card variant="outlined">
              <CardContent>
                {vendor.businessId && (
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <BusinessIcon color="primary" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">ת.ז / ח.פ</Typography>
                      <Typography fontWeight={500}>{vendor.businessId}</Typography>
                    </Box>
                  </Box>
                )}

                {vendor.licenseNumber && (
                  <Box mb={2}>
                    <Typography variant="caption" color="text.secondary">מספר רישיון</Typography>
                    <Typography fontWeight={500}>{vendor.licenseNumber}</Typography>
                  </Box>
                )}

                {vendor.warrantyMonths && (
                  <Box mb={2}>
                    <Typography variant="caption" color="text.secondary">תקופת אחריות</Typography>
                    <Typography fontWeight={500}>{vendor.warrantyMonths} חודשים</Typography>
                  </Box>
                )}

                {vendor.insuranceCompany && (
                  <Box mb={2}>
                    <Typography variant="caption" color="text.secondary">חברת ביטוח</Typography>
                    <Typography fontWeight={500}>{vendor.insuranceCompany}</Typography>
                  </Box>
                )}

                {vendor.rating && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">דירוג</Typography>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Typography fontWeight={500}>{vendor.rating}</Typography>
                      <StarIcon sx={{ color: '#FFD700', fontSize: 20 }} />
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Fade>
        )}

        {/* פרטי בנק */}
        {tab === 2 && (
          <Fade in={true}>
            <Card variant="outlined">
              <CardContent>
                {vendor.bankName && (
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <AccountBalanceIcon color="primary" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">בנק</Typography>
                      <Typography fontWeight={500}>{vendor.bankName}</Typography>
                    </Box>
                  </Box>
                )}

                {vendor.bankBranch && (
                  <Box mb={2}>
                    <Typography variant="caption" color="text.secondary">סניף</Typography>
                    <Typography fontWeight={500}>{vendor.bankBranch}</Typography>
                  </Box>
                )}

                {vendor.bankAccount && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">חשבון</Typography>
                    <Typography fontWeight={500}>{vendor.bankAccount}</Typography>
                  </Box>
                )}

                {!vendor.bankName && !vendor.bankBranch && !vendor.bankAccount && (
                  <Typography color="text.secondary">אין פרטי בנק</Typography>
                )}
              </CardContent>
            </Card>
          </Fade>
        )}

        {/* הערות */}
        {tab === 3 && (
          <Fade in={true}>
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" alignItems="flex-start" gap={1} mb={1}>
                  <NotesIcon color="primary" />
                  <Box flex={1}>
                    <Typography variant="caption" color="text.secondary">הערות</Typography>
                    <Typography sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                      {vendor.notes || "אין הערות"}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Fade>
        )}

        {/* היסטוריית תשלומים */}
        {tab === 4 && (
          <Fade in={true}>
            <Card variant="outlined">
              <CardContent>
                {vendor.payments && vendor.payments.length > 0 ? (
                  <List dense>
                    {vendor.payments.map((p, i) => (
                      <ListItem key={i} divider={i < vendor.payments.length - 1}>
                        <ListItemIcon>
                          <ReceiptLongIcon color={p.status === 'שולם' ? 'success' : 'warning'} />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Typography fontWeight={500}>{formatCurrency(p.amount)}</Typography>
                              <Typography variant="caption" color="text.secondary">{p.date}</Typography>
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="caption">{p.method}</Typography>
                              {p.description && (
                                <Typography variant="caption" display="block">
                                  {p.description}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="text.secondary">אין תשלומים עדיין</Typography>
                )}
              </CardContent>
            </Card>
          </Fade>
        )}

        {/* מידע נוסף */}
        {tab === 5 && (
          <Fade in={true}>
            <Card variant="outlined">
              <CardContent>
                {vendor.startDate && (
                  <Box mb={2}>
                    <Typography variant="caption" color="text.secondary">תאריך התחלה</Typography>
                    <Typography fontWeight={500}>{vendor.startDate}</Typography>
                  </Box>
                )}

                {vendor.endDate && (
                  <Box mb={2}>
                    <Typography variant="caption" color="text.secondary">תאריך סיום</Typography>
                    <Typography fontWeight={500}>{vendor.endDate}</Typography>
                  </Box>
                )}

                {vendor.recommendedBy && (
                  <Box display="flex" alignItems="flex-start" gap={1} mb={2}>
                    <RecommendIcon color="primary" />
                    <Box>
                      <Typography variant="caption" color="text.secondary">מקור המלצה</Typography>
                      <Typography fontWeight={500}>{vendor.recommendedBy}</Typography>
                    </Box>
                  </Box>
                )}

                {!vendor.startDate && !vendor.endDate && !vendor.recommendedBy && (
                  <Typography color="text.secondary">אין מידע נוסף</Typography>
                )}
              </CardContent>
            </Card>
          </Fade>
        )}
      </Box>
    </Drawer>
  );
}
