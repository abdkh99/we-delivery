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
    Switch,
    CircularProgress,
    Alert,
    Divider,
    Stack,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
} from "@mui/material";

// MUI Icons
import SaveIcon from "@mui/icons-material/Save";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import AddAlertIcon from "@mui/icons-material/AddAlert";
import SyncIcon from "@mui/icons-material/Sync";
import InventoryIcon from "@mui/icons-material/Inventory";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import EmailIcon from "@mui/icons-material/Email";

type NotificationSettingsType = {
    newOrderAlert: boolean;
    orderStatusChange: boolean;
    lowStockAlert: boolean;
    soundEnabled: boolean;
    emailNotifications: boolean;
};

const defaultSettings: NotificationSettingsType = {
    newOrderAlert: true,
    orderStatusChange: true,
    lowStockAlert: true,
    soundEnabled: true,
    emailNotifications: false,
};

export default function NotificationSettings() {
    const [settings, setSettings] = useState<NotificationSettingsType>(defaultSettings);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await fetch("/api/admin/system-settings?category=notifications");
            if (response.ok) {
                const data = await response.json();
                const notificationSetting = data.settings?.find((s: any) => s.key === "notification_preferences");
                if (notificationSetting?.value) {
                    setSettings({ ...defaultSettings, ...notificationSetting.value });
                }
            }
        } catch (error) {
            console.error("Failed to fetch notification settings:", error);
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
                    key: "notification_preferences",
                    value: settings,
                    category: "notifications",
                }),
            });

            if (response.ok) {
                toast.success("تم حفظ إعدادات الإشعارات بنجاح ✓");
            } else {
                toast.error("فشل حفظ الإعدادات");
            }
        } catch (error) {
            toast.error("حدث خطأ");
        } finally {
            setSaving(false);
        }
    };

    const toggleSetting = (key: keyof NotificationSettingsType) => {
        setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const notificationItems = [
        {
            key: "newOrderAlert" as const,
            icon: <AddAlertIcon />,
            title: "تنبيه طلب جديد",
            description: "إشعار عند وصول طلب جديد",
            color: "#10b981",
        },
        {
            key: "orderStatusChange" as const,
            icon: <SyncIcon />,
            title: "تغيير حالة الطلب",
            description: "إشعار عند تغيير حالة أي طلب",
            color: "#3b82f6",
        },
        {
            key: "lowStockAlert" as const,
            icon: <InventoryIcon />,
            title: "تنبيه نفاد المخزون",
            description: "إشعار عند انخفاض مخزون منتج",
            color: "#ef4444",
        },
        {
            key: "soundEnabled" as const,
            icon: <VolumeUpIcon />,
            title: "صوت الإشعارات",
            description: "تفعيل صوت عند وصول إشعار",
            color: "#8b5cf6",
        },
        {
            key: "emailNotifications" as const,
            icon: <EmailIcon />,
            title: "إشعارات البريد الإلكتروني",
            description: "إرسال إشعارات عبر الإيميل",
            color: "#f59e0b",
        },
    ];

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
                <CircularProgress sx={{ color: "#f59e0b" }} />
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
                            background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <NotificationsActiveIcon sx={{ color: "white", fontSize: 24 }} />
                    </Box>
                }
                title={
                    <Typography variant="h6" fontWeight="bold" color="text.primary">
                        إعدادات الإشعارات
                    </Typography>
                }
                subheader={
                    <Typography variant="body2" color="text.secondary">
                        تخصيص تنبيهات النظام والإشعارات
                    </Typography>
                }
                sx={{ pb: 0 }}
            />

            <CardContent>
                <List sx={{ bgcolor: "background.paper", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
                    {notificationItems.map((item, index) => (
                        <Box key={item.key}>
                            <ListItem sx={{ py: 2 }}>
                                <ListItemIcon>
                                    <Box
                                        sx={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: 2,
                                            backgroundColor: `${item.color}15`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: item.color,
                                        }}
                                    >
                                        {item.icon}
                                    </Box>
                                </ListItemIcon>
                                <ListItemText
                                    primary={
                                        <Typography fontWeight="600" color="text.primary">
                                            {item.title}
                                        </Typography>
                                    }
                                    secondary={item.description}
                                />
                                <ListItemSecondaryAction>
                                    <Switch
                                        edge="end"
                                        checked={settings[item.key]}
                                        onChange={() => toggleSetting(item.key)}
                                        sx={{
                                            "& .MuiSwitch-switchBase.Mui-checked": {
                                                color: item.color,
                                            },
                                            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                                backgroundColor: item.color,
                                            },
                                        }}
                                    />
                                </ListItemSecondaryAction>
                            </ListItem>
                            {index < notificationItems.length - 1 && <Divider component="li" />}
                        </Box>
                    ))}
                </List>

                <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                    <Button
                        variant="contained"
                        fullWidth
                        onClick={handleSave}
                        disabled={saving}
                        startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                        sx={{
                            background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
                            textTransform: "none",
                            fontWeight: "bold",
                            py: 1.5,
                            borderRadius: 2,
                            "&:hover": {
                                background: "linear-gradient(135deg, #d97706 0%, #f59e0b 100%)",
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
