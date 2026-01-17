"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

// MUI Components
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  TextField,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
  Divider,
  Stack,
} from "@mui/material";

// MUI Icons
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import PercentIcon from "@mui/icons-material/Percent";
import InfoIcon from "@mui/icons-material/Info";

type CommissionSetting = {
  id: string;
  min_order_amount: number;
  max_order_amount: number | null;
  commission_percentage: number;
  is_active: boolean;
};

export default function CommissionSettings() {
  const [settings, setSettings] = useState<CommissionSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    min_order_amount: 0,
    max_order_amount: null as number | null,
    commission_percentage: 5,
    is_active: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/commission-settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || []);
      }
    } catch (error) {
      toast.error("فشل تحميل الإعدادات");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/admin/commission-settings", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...formData, id: editingId } : formData),
      });

      if (response.ok) {
        toast.success(editingId ? "تم تحديث الشريحة بنجاح ✓" : "تم إضافة الشريحة بنجاح ✓");
        fetchSettings();
        handleCloseDialog();
      } else {
        toast.error("فشلت العملية");
      }
    } catch (error) {
      toast.error("حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/commission-settings?id=${deletingId}`, {
        method: "DELETE"
      });
      if (response.ok) {
        toast.success("تم حذف الشريحة بنجاح");
        fetchSettings();
        setDeleteDialogOpen(false);
        setDeletingId(null);
      } else {
        toast.error("فشل الحذف");
      }
    } catch (error) {
      toast.error("حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDialog = (setting?: CommissionSetting) => {
    if (setting) {
      setEditingId(setting.id);
      setFormData({
        min_order_amount: setting.min_order_amount,
        max_order_amount: setting.max_order_amount,
        commission_percentage: setting.commission_percentage,
        is_active: setting.is_active,
      });
    } else {
      setEditingId(null);
      setFormData({
        min_order_amount: 0,
        max_order_amount: null,
        commission_percentage: 5,
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
  };

  const openDeleteDialog = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress color="secondary" />
      </Box>
    );
  }

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden"
      }}
    >
      <CardHeader
        avatar={
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <PercentIcon sx={{ color: "white", fontSize: 24 }} />
          </Box>
        }
        title={
          <Typography variant="h6" fontWeight="bold" color="text.primary">
            إعدادات عمولة المنصة
          </Typography>
        }
        subheader={
          <Typography variant="body2" color="text.secondary">
            تحديد نسب العمولة بناءً على قيمة الطلب
          </Typography>
        }
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
              borderRadius: 2,
              textTransform: "none",
              fontWeight: "bold",
              px: 3,
              "&:hover": {
                background: "linear-gradient(135deg, #6d28d9 0%, #9333ea 100%)",
              },
            }}
          >
            إضافة شريحة
          </Button>
        }
        sx={{ pb: 0 }}
      />

      <CardContent>
        {settings.length === 0 ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            لا توجد شرائح عمولة. أضف شريحة جديدة لتحديد نسب العمولة.
          </Alert>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "action.hover" }}>
                  <TableCell sx={{ fontWeight: "bold" }}>من مبلغ</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>إلى مبلغ</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>نسبة العمولة</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>مثال</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>الحالة</TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {settings.map((setting) => {
                  const example = setting.min_order_amount + (setting.max_order_amount ? (setting.max_order_amount - setting.min_order_amount) / 2 : 50000);
                  const exampleCommission = Math.floor(example * (setting.commission_percentage / 100));

                  return (
                    <TableRow
                      key={setting.id}
                      hover
                      sx={{ opacity: setting.is_active ? 1 : 0.5 }}
                    >
                      <TableCell>{formatCurrency(setting.min_order_amount)}</TableCell>
                      <TableCell>
                        {setting.max_order_amount ? formatCurrency(setting.max_order_amount) : (
                          <Chip label="∞ بدون حد" size="small" variant="outlined" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${setting.commission_percentage}%`}
                          color="secondary"
                          size="small"
                          sx={{ fontWeight: "bold" }}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            {formatCurrency(example)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">→</Typography>
                          <Typography variant="body2" color="success.main" fontWeight="bold">
                            {formatCurrency(exampleCommission)}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={setting.is_active ? "مفعّل" : "معطّل"}
                          color={setting.is_active ? "success" : "default"}
                          size="small"
                          variant={setting.is_active ? "filled" : "outlined"}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="تعديل">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleOpenDialog(setting)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => openDeleteDialog(setting.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Alert severity="info" icon={<InfoIcon />} sx={{ mt: 2, borderRadius: 2 }}>
          <Typography variant="body2">
            <strong>كيف يعمل:</strong> يتم تطبيق نسبة العمولة تلقائياً عند إتمام الطلب بناءً على قيمته.
          </Typography>
        </Alert>
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {editingId ? <EditIcon sx={{ color: "white" }} /> : <AddIcon sx={{ color: "white" }} />}
            </Box>
            <Typography variant="h6" fontWeight="bold">
              {editingId ? "تعديل شريحة العمولة" : "إضافة شريحة جديدة"}
            </Typography>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 3 }}>
          <Stack spacing={3}>
            <TextField
              label="من مبلغ (ل.س)"
              type="number"
              fullWidth
              value={formData.min_order_amount}
              onChange={(e) => setFormData({ ...formData, min_order_amount: Number(e.target.value) })}
              variant="outlined"
            />
            <TextField
              label="إلى مبلغ (ل.س)"
              type="number"
              fullWidth
              value={formData.max_order_amount || ""}
              onChange={(e) => setFormData({ ...formData, max_order_amount: e.target.value ? Number(e.target.value) : null })}
              placeholder="اتركه فارغاً للحد الأقصى ∞"
              variant="outlined"
            />
            <TextField
              label="نسبة العمولة (%)"
              type="number"
              fullWidth
              value={formData.commission_percentage}
              onChange={(e) => setFormData({ ...formData, commission_percentage: Number(e.target.value) })}
              variant="outlined"
              inputProps={{ step: 0.5, min: 0, max: 100 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  color="success"
                />
              }
              label={formData.is_active ? "مفعّل" : "معطّل"}
            />
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={handleCloseDialog}
            startIcon={<CloseIcon />}
            sx={{ textTransform: "none" }}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            sx={{
              background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
              textTransform: "none",
              fontWeight: "bold",
              px: 3,
              "&:hover": {
                background: "linear-gradient(135deg, #6d28d9 0%, #9333ea 100%)",
              },
            }}
          >
            {saving ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold" color="error">
            تأكيد الحذف
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف هذه الشريحة؟ لا يمكن التراجع عن هذا الإجراء.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            sx={{ textTransform: "none" }}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <DeleteIcon />}
            sx={{ textTransform: "none", fontWeight: "bold" }}
          >
            {saving ? "جاري الحذف..." : "حذف"}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
