"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

// MUI Components
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Typography,
    Button,
    TextField,
    Switch,
    CircularProgress,
    Alert,
    Divider,
    Stack,
    Grid,
    FormControlLabel,
    Paper,
} from "@mui/material";

// MUI Icons
import SaveIcon from "@mui/icons-material/Save";
import SettingsIcon from "@mui/icons-material/Settings";
import StoreIcon from "@mui/icons-material/Store";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";

type GeneralSettingsType = {
    storeName: string;
    storePhone: string;
    storeEmail: string;
    openingTime: string;
    closingTime: string;
    minOrderValue: number;
    isStoreOpen: boolean;
};

const defaultSettings: GeneralSettingsType = {
    storeName: "We DELIVER",
    storePhone: "",
    storeEmail: "",
    openingTime: "09:00",
    closingTime: "22:00",
    minOrderValue: 10000,
    isStoreOpen: true,
};

export default function GeneralSettings() {
    const [settings, setSettings] = useState<GeneralSettingsType>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await fetch("/api/admin/system-settings?category=general");
            if (response.ok) {
                const data = await response.json();
                const generalSetting = data.settings?.find((s: any) => s.key === "general_preferences");
                if (generalSetting?.value) {
                    setSettings({ ...defaultSettings, ...generalSetting.value });
                }
            }
        } catch (error) {
            console.error("Failed to fetch general settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const response = await fetch("/api/admin/system-settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key: "general_preferences",
                    value: settings,
                    category: "general",
                }),
            });

            if (response.ok) {
                toast.success("تم حفظ الإعدادات العامة بنجاح ✓");
            } else {
                toast.error("فشل حفظ الإعدادات");
            }
        } catch (error) {
            toast.error("حدث خطأ");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
                <CircularProgress sx={{ color: "#64748b" }} />
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
                            background: "linear-gradient(135deg, #64748b 0%, #94a3b8 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <SettingsIcon sx={{ color: "white", fontSize: 24 }} />
                    </Box>
                }
                title={
                    <Typography variant="h6" fontWeight="bold" color="text.primary">
                        الإعدادات العامة
                    </Typography>
                }
                subheader={
                    <Typography variant="body2" color="text.secondary">
                        معلومات المتجر وإعدادات التشغيل
                    </Typography>
                }
                sx={{ pb: 0 }}
            />

            <CardContent>
                <Stack spacing={3}>
                    {/* Store Info Section */}
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                            <StoreIcon sx={{ color: "#3b82f6" }} />
                            <Typography variant="subtitle1" fontWeight="bold">
                                معلومات المتجر
                            </Typography>
                        </Stack>

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    label="اسم المتجر"
                                    fullWidth
                                    value={settings.storeName}
                                    onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                                    variant="outlined"
                                    InputProps={{
                                        startAdornment: <StoreIcon sx={{ mr: 1, color: "action.active" }} />,
                                    }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    label="رقم الهاتف"
                                    fullWidth
                                    value={settings.storePhone}
                                    onChange={(e) => setSettings({ ...settings, storePhone: e.target.value })}
                                    variant="outlined"
                                    placeholder="+963 xxx xxx xxx"
                                    InputProps={{
                                        startAdornment: <PhoneIcon sx={{ mr: 1, color: "action.active" }} />,
                                    }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12 }}>
                                <TextField
                                    label="البريد الإلكتروني"
                                    fullWidth
                                    type="email"
                                    value={settings.storeEmail}
                                    onChange={(e) => setSettings({ ...settings, storeEmail: e.target.value })}
                                    variant="outlined"
                                    placeholder="store@example.com"
                                    InputProps={{
                                        startAdornment: <EmailIcon sx={{ mr: 1, color: "action.active" }} />,
                                    }}
                                />
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Operating Hours Section */}
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                            <AccessTimeIcon sx={{ color: "#8b5cf6" }} />
                            <Typography variant="subtitle1" fontWeight="bold">
                                ساعات العمل
                            </Typography>
                        </Stack>

                        <Grid container spacing={2} alignItems="center">
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    label="وقت الافتتاح"
                                    type="time"
                                    fullWidth
                                    value={settings.openingTime}
                                    onChange={(e) => setSettings({ ...settings, openingTime: e.target.value })}
                                    variant="outlined"
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <TextField
                                    label="وقت الإغلاق"
                                    type="time"
                                    fullWidth
                                    value={settings.closingTime}
                                    onChange={(e) => setSettings({ ...settings, closingTime: e.target.value })}
                                    variant="outlined"
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2,
                                        borderRadius: 2,
                                        backgroundColor: settings.isStoreOpen ? "#dcfce7" : "#fee2e2",
                                        border: "1px solid",
                                        borderColor: settings.isStoreOpen ? "#86efac" : "#fca5a5",
                                        cursor: "pointer",
                                        transition: "all 0.2s",
                                        "&:hover": {
                                            transform: "scale(1.02)",
                                        },
                                    }}
                                    onClick={() => setSettings({ ...settings, isStoreOpen: !settings.isStoreOpen })}
                                >
                                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                                        <Typography fontWeight="bold" color={settings.isStoreOpen ? "success.main" : "error.main"}>
                                            {settings.isStoreOpen ? "✓ المتجر مفتوح" : "✕ المتجر مغلق"}
                                        </Typography>
                                        <Switch
                                            checked={settings.isStoreOpen}
                                            color={settings.isStoreOpen ? "success" : "error"}
                                        />
                                    </Stack>
                                </Paper>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Order Settings Section */}
                    <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                            <AttachMoneyIcon sx={{ color: "#10b981" }} />
                            <Typography variant="subtitle1" fontWeight="bold">
                                إعدادات الطلبات
                            </Typography>
                        </Stack>

                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, md: 6 }}>
                                <TextField
                                    label="الحد الأدنى للطلب (ل.س)"
                                    type="number"
                                    fullWidth
                                    value={settings.minOrderValue}
                                    onChange={(e) => setSettings({ ...settings, minOrderValue: Number(e.target.value) })}
                                    variant="outlined"
                                    helperText="لن يتم قبول طلبات أقل من هذا المبلغ"
                                />
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Save Button */}
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={handleSave}
                        disabled={saving}
                        startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                        sx={{
                            background: "linear-gradient(135deg, #64748b 0%, #94a3b8 100%)",
                            textTransform: "none",
                            fontWeight: "bold",
                            py: 1.5,
                            borderRadius: 2,
                            "&:hover": {
                                background: "linear-gradient(135deg, #475569 0%, #64748b 100%)",
                            },
                        }}
                    >
                        {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
                    </Button>
                </Stack>
            </CardContent>
        </Card>
    );
}
