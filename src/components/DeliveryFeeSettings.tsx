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
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import InfoIcon from "@mui/icons-material/Info";
import CelebrationIcon from "@mui/icons-material/Celebration";

type DeliveryFeeTier = {
    id: string;
    min_order_amount: number;
    max_order_amount: number | null;
    delivery_fee: number;
    is_active: boolean;
};

export default function DeliveryFeeSettings() {
    const [tiers, setTiers] = useState<DeliveryFeeTier[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        min_order_amount: 0,
        max_order_amount: null as number | null,
        delivery_fee: 5000,
        is_active: true,
    });

    useEffect(() => {
        fetchTiers();
    }, []);

    const fetchTiers = async () => {
        try {
            const response = await fetch("/api/admin/delivery-fee-tiers");
            if (response.ok) {
                const data = await response.json();
                setTiers(data.tiers || []);
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
            const response = await fetch("/api/admin/delivery-fee-tiers", {
                method: editingId ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editingId ? { ...formData, id: editingId } : formData),
            });

            if (response.ok) {
                toast.success(editingId ? "تم تحديث الشريحة بنجاح ✓" : "تم إضافة الشريحة بنجاح ✓");
                fetchTiers();
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
            const response = await fetch(`/api/admin/delivery-fee-tiers?id=${deletingId}`, {
                method: "DELETE"
            });
            if (response.ok) {
                toast.success("تم حذف الشريحة بنجاح");
                fetchTiers();
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

    const handleOpenDialog = (tier?: DeliveryFeeTier) => {
        if (tier) {
            setEditingId(tier.id);
            setFormData({
                min_order_amount: tier.min_order_amount,
                max_order_amount: tier.max_order_amount,
                delivery_fee: tier.delivery_fee,
                is_active: tier.is_active,
            });
        } else {
            setEditingId(null);
            setFormData({
                min_order_amount: 0,
                max_order_amount: null,
                delivery_fee: 5000,
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
                <CircularProgress sx={{ color: "#f97316" }} />
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
                            background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <LocalShippingIcon sx={{ color: "white", fontSize: 24 }} />
                    </Box>
                }
                title={
                    <Typography variant="h6" fontWeight="bold" color="text.primary">
                        شرائح رسوم التوصيل
                    </Typography>
                }
                subheader={
                    <Typography variant="body2" color="text.secondary">
                        تحديد رسوم التوصيل بناءً على قيمة الطلب
                    </Typography>
                }
                action={
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenDialog()}
                        sx={{
                            background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
                            borderRadius: 2,
                            textTransform: "none",
                            fontWeight: "bold",
                            px: 3,
                            "&:hover": {
                                background: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
                            },
                        }}
                    >
                        إضافة شريحة
                    </Button>
                }
                sx={{ pb: 0 }}
            />

            <CardContent>
                {tiers.length === 0 ? (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                        لا توجد شرائح توصيل. أضف شريحة جديدة لتحديد رسوم التوصيل.
                    </Alert>
                ) : (
                    <TableContainer component={Paper} elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ backgroundColor: "action.hover" }}>
                                    <TableCell sx={{ fontWeight: "bold" }}>من مبلغ</TableCell>
                                    <TableCell sx={{ fontWeight: "bold" }}>إلى مبلغ</TableCell>
                                    <TableCell sx={{ fontWeight: "bold" }}>رسوم التوصيل</TableCell>
                                    <TableCell sx={{ fontWeight: "bold" }}>الحالة</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: "bold" }}>إجراءات</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {tiers.map((tier) => (
                                    <TableRow
                                        key={tier.id}
                                        hover
                                        sx={{ opacity: tier.is_active ? 1 : 0.5 }}
                                    >
                                        <TableCell>{formatCurrency(tier.min_order_amount)}</TableCell>
                                        <TableCell>
                                            {tier.max_order_amount ? formatCurrency(tier.max_order_amount) : (
                                                <Chip label="∞ بدون حد" size="small" variant="outlined" />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {tier.delivery_fee === 0 ? (
                                                <Chip
                                                    icon={<CelebrationIcon />}
                                                    label="مجاني 🎉"
                                                    color="success"
                                                    size="small"
                                                    sx={{ fontWeight: "bold" }}
                                                />
                                            ) : (
                                                <Chip
                                                    label={formatCurrency(tier.delivery_fee)}
                                                    sx={{
                                                        fontWeight: "bold",
                                                        backgroundColor: "#fff7ed",
                                                        color: "#c2410c",
                                                        border: "1px solid #fdba74"
                                                    }}
                                                    size="small"
                                                />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={tier.is_active ? "مفعّل" : "معطّل"}
                                                color={tier.is_active ? "success" : "default"}
                                                size="small"
                                                variant={tier.is_active ? "filled" : "outlined"}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Stack direction="row" spacing={1} justifyContent="center">
                                                <Tooltip title="تعديل">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => handleOpenDialog(tier)}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="حذف">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => openDeleteDialog(tier.id)}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                <Alert severity="info" icon={<InfoIcon />} sx={{ mt: 2, borderRadius: 2 }}>
                    <Typography variant="body2">
                        <strong>نصيحة:</strong> لجعل التوصيل مجانياً للطلبات الكبيرة، أضف شريحة برسوم = 0
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
                                background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            {editingId ? <EditIcon sx={{ color: "white" }} /> : <AddIcon sx={{ color: "white" }} />}
                        </Box>
                        <Typography variant="h6" fontWeight="bold">
                            {editingId ? "تعديل شريحة التوصيل" : "إضافة شريحة جديدة"}
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
                            label="رسوم التوصيل (ل.س)"
                            type="number"
                            fullWidth
                            value={formData.delivery_fee}
                            onChange={(e) => setFormData({ ...formData, delivery_fee: Number(e.target.value) })}
                            variant="outlined"
                            helperText="ضع 0 لجعل التوصيل مجانياً"
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
                            background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)",
                            textTransform: "none",
                            fontWeight: "bold",
                            px: 3,
                            "&:hover": {
                                background: "linear-gradient(135deg, #ea580c 0%, #f97316 100%)",
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
