"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import { formatCurrency } from "@/lib/utils";
import {
    Box,
    Container,
    Paper,
    Typography,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Button,
    Grid,
    Card,
    CardContent,
    IconButton,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Switch,
    FormControlLabel,
    Alert,
    CircularProgress,
    Checkbox,
    Avatar,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    ListItemButton,
    InputAdornment,
    Fab,
} from "@mui/material";
import {
    ArrowBack,
    Add,
    Edit,
    Delete,
    LocalOffer,
    CalendarToday,
    Percent,
    AttachMoney,
    Search,
    Inventory,
} from "@mui/icons-material";
import { toast } from "sonner";
interface Offer {
    id: string;
    title: string;
    description?: string;
    discount_type: "percentage" | "fixed";
    discount_value: number;
    start_date: string;
    end_date: string;
    is_active: boolean;
    applicable_to: "all" | "category" | "product";
    category_filter?: string;
    product_ids?: string[];
}
interface Product {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    category: string;
}
const categories = [
    "Dairy",
    "Bakery",
    "Grains",
    "Cooking",
    "Vegetables",
    "Meat",
    "Spices",
    "Beverages",
    "Snacks",
    "Frozen",
    "Other",
];
export default function AdminOffersPage() {
    const { user, profile } = useAuth();
    const router = useRouter();
    const [offers, setOffers] = useState<Offer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [productsLoading, setProductsLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingOfferId, setDeletingOfferId] = useState<string | null>(null);
    const [productSearch, setProductSearch] = useState("");
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        discount_type: "percentage" as "percentage" | "fixed",
        discount_value: "",
        start_date: "",
        end_date: "",
        is_active: true,
        applicable_to: "all" as "all" | "category" | "product",
        category_filter: "",
        product_ids: [] as string[],
    });
    useEffect(() => {
        if (user && profile?.role === "admin") {
            fetchOffers();
            fetchProducts();
        }
    }, [user, profile]);
    const fetchOffers = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/admin/offers");
            if (response.ok) {
                const { offers: fetchedOffers } = await response.json();
                setOffers(fetchedOffers || []);
            }
        } catch (error) {
            console.error("Error fetching offers:", error);
            toast.error("Failed to load offers");
        } finally {
            setLoading(false);
        }
    };
    const fetchProducts = async () => {
        try {
            setProductsLoading(true);
            const response = await fetch("/api/products");
            if (response.ok) {
                const { products: fetchedProducts } = await response.json();
                setProducts(fetchedProducts || []);
            }
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setProductsLoading(false);
        }
    };
    // Filter products based on search
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(productSearch.toLowerCase())
    );
    // Toggle product selection
    const toggleProductSelection = (productId: string) => {
        setFormData(prev => ({
            ...prev,
            product_ids: prev.product_ids.includes(productId)
                ? prev.product_ids.filter(id => id !== productId)
                : [...prev.product_ids, productId]
        }));
    };
    const handleOpenDialog = (offer?: Offer) => {
        if (offer) {
            setEditingOffer(offer);
            const startDate = new Date(offer.start_date);
            const endDate = new Date(offer.end_date);
            setFormData({
                title: offer.title,
                description: offer.description || "",
                discount_type: offer.discount_type,
                discount_value: offer.discount_value.toString(),
                start_date: startDate.toISOString().slice(0, 16),
                end_date: endDate.toISOString().slice(0, 16),
                is_active: offer.is_active,
                applicable_to: offer.applicable_to,
                category_filter: offer.category_filter || "",
                product_ids: offer.product_ids || [],
            });
        } else {
            setEditingOffer(null);
            setFormData({
                title: "",
                description: "",
                discount_type: "percentage",
                discount_value: "",
                start_date: "",
                end_date: "",
                is_active: true,
                applicable_to: "all",
                category_filter: "",
                product_ids: [],
            });
        }
        setDialogOpen(true);
    };
    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingOffer(null);
    };
    const handleSubmit = async () => {
        if (!formData.title || !formData.discount_value || !formData.start_date || !formData.end_date) {
            toast.error("Please fill all required fields");
            return;
        }
        const startDate = new Date(formData.start_date);
        const endDate = new Date(formData.end_date);
        if (startDate >= endDate) {
            toast.error("End date must be after start date");
            return;
        }
        if (formData.discount_type === "percentage" && parseFloat(formData.discount_value) > 100) {
            toast.error("Percentage cannot exceed 100%");
            return;
        }
        try {
            const payload: any = {
                title: formData.title,
                description: formData.description || null,
                discount_type: formData.discount_type,
                discount_value: parseFloat(formData.discount_value),
                start_date: new Date(formData.start_date).toISOString(),
                end_date: new Date(formData.end_date).toISOString(),
                is_active: formData.is_active,
                applicable_to: formData.applicable_to,
                category_filter: formData.applicable_to === "category" ? formData.category_filter : null,
                product_ids: formData.applicable_to === "product" ? formData.product_ids : null,
            };
            let response;
            if (editingOffer) {
                response = await fetch(`/api/admin/offers/${editingOffer.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            } else {
                response = await fetch("/api/offers", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            }
            if (response.ok) {
                toast.success(editingOffer ? "Offer updated successfully" : "Offer created successfully");
                handleCloseDialog();
                fetchOffers();
            } else {
                const data = await response.json();
                toast.error(data.error || "Failed to save offer");
            }
        } catch (error) {
            console.error("Error saving offer:", error);
            toast.error("Failed to save offer");
        }
    };
    const handleDelete = async () => {
        if (!deletingOfferId) return;
        try {
            const response = await fetch(`/api/admin/offers/${deletingOfferId}`, {
                method: "DELETE",
            });
            if (response.ok) {
                toast.success("Offer deleted successfully");
                setDeleteDialogOpen(false);
                setDeletingOfferId(null);
                fetchOffers();
            } else {
                toast.error("Failed to delete offer");
            }
        } catch (error) {
            console.error("Error deleting offer:", error);
            toast.error("Failed to delete offer");
        }
    };
    const toggleActive = async (offer: Offer) => {
        try {
            const response = await fetch(`/api/admin/offers/${offer.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_active: !offer.is_active }),
            });
            if (response.ok) {
                toast.success(`Offer ${!offer.is_active ? "activated" : "deactivated"}`);
                fetchOffers();
            }
        } catch (error) {
            console.error("Error toggling offer:", error);
            toast.error("Failed to update offer");
        }
    };
    if (!user || profile?.role !== "admin") {
        return (
            <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Typography>Admin access required</Typography>
            </Box>
        );
    }
    return (
        <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
            <Navigation />
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Button startIcon={<ArrowBack />} onClick={() => router.back()} sx={{ mb: 3 }}>
                    رجوع
                </Button>
                <Paper elevation={3} sx={{ p: 4 }}>
                    {/* Header with prominent Add button */}
                    <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", alignItems: { xs: "stretch", sm: "center" }, gap: 2, mb: 4 }}>
                        <Box>
                            <Typography variant="h4" component="h1" fontWeight="bold" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <LocalOffer color="primary" />
                                العروض والتخفيضات
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                أنشئ عروض مميزة لجذب المزيد من العملاء
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<Add />}
                            onClick={() => handleOpenDialog()}
                            sx={{
                                py: 1.5,
                                px: 3,
                                borderRadius: 2,
                                fontWeight: "bold",
                                boxShadow: 3,
                                background: "linear-gradient(45deg, #1976d2, #42a5f5)",
                                "&:hover": {
                                    background: "linear-gradient(45deg, #1565c0, #1976d2)",
                                    boxShadow: 4,
                                }
                            }}
                        >
                            إنشاء عرض جديد
                        </Button>
                    </Box>
                    {loading ? (
                        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : offers.length === 0 ? (
                        <Box sx={{ textAlign: "center", py: 8 }}>
                            <LocalOffer sx={{ fontSize: 80, color: "grey.300", mb: 2 }} />
                            <Typography variant="h5" fontWeight="bold" gutterBottom>
                                لا توجد عروض بعد
                            </Typography>
                            <Typography color="text.secondary" sx={{ mb: 3 }}>
                                أنشئ عرضك الأول لجذب المزيد من العملاء وزيادة المبيعات
                            </Typography>
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<Add />}
                                onClick={() => handleOpenDialog()}
                                sx={{
                                    py: 2,
                                    px: 4,
                                    borderRadius: 3,
                                    fontWeight: "bold",
                                    fontSize: "1.1rem",
                                    boxShadow: 4,
                                    background: "linear-gradient(45deg, #e91e63, #f48fb1)",
                                    "&:hover": {
                                        background: "linear-gradient(45deg, #c2185b, #e91e63)",
                                        boxShadow: 6,
                                    }
                                }}
                            >
                                ✨ إنشاء عرض جديد
                            </Button>
                        </Box>
                    ) : (
                        <Grid container spacing={3}>
                            {offers.map((offer) => {
                                const isActive = offer.is_active && new Date(offer.end_date) >= new Date();
                                const discountText =
                                    offer.discount_type === "percentage"
                                        ? `${offer.discount_value}% OFF`
                                        : `${offer.discount_value} SYP OFF`;
                                return (
                                    <Grid size={{ xs: 12, md: 6 }} key={offer.id}>
                                        <Card>
                                            <CardContent>
                                                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                                                    <Typography variant="h6" fontWeight="bold">
                                                        {offer.title}
                                                    </Typography>
                                                    <Chip
                                                        label={isActive ? "Active" : "Inactive"}
                                                        color={isActive ? "success" : "default"}
                                                        size="small"
                                                    />
                                                </Box>
                                                {offer.description && (
                                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                        {offer.description}
                                                    </Typography>
                                                )}
                                                <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
                                                    <Chip
                                                        icon={offer.discount_type === "percentage" ? <Percent /> : <AttachMoney />}
                                                        label={discountText}
                                                        color="primary"
                                                        size="small"
                                                    />
                                                    <Chip
                                                        icon={<LocalOffer />}
                                                        label={offer.applicable_to === "all" ? "All Products" : offer.applicable_to === "category" ? offer.category_filter : "Specific Products"}
                                                        size="small"
                                                    />
                                                </Box>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                                                    <CalendarToday sx={{ fontSize: 14, verticalAlign: "middle", mr: 0.5 }} />
                                                    {new Date(offer.start_date).toLocaleDateString()} - {new Date(offer.end_date).toLocaleDateString()}
                                                </Typography>
                                                <Box sx={{ display: "flex", gap: 1 }}>
                                                    <Button
                                                        size="small"
                                                        startIcon={<Edit />}
                                                        onClick={() => handleOpenDialog(offer)}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        size="small"
                                                        color={offer.is_active ? "warning" : "success"}
                                                        onClick={() => toggleActive(offer)}
                                                    >
                                                        {offer.is_active ? "Deactivate" : "Activate"}
                                                    </Button>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => {
                                                            setDeletingOfferId(offer.id);
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                    >
                                                        <Delete />
                                                    </IconButton>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    )}
                </Paper>
            </Container>
            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>{editingOffer ? "Edit Offer" : "Create New Offer"}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2 }}>
                        <TextField
                            fullWidth
                            label="Title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            multiline
                            rows={3}
                        />
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <FormControl fullWidth>
                                    <InputLabel>Discount Type</InputLabel>
                                    <Select
                                        value={formData.discount_type}
                                        onChange={(e) => setFormData({ ...formData, discount_type: e.target.value as "percentage" | "fixed" })}
                                        label="Discount Type"
                                    >
                                        <MenuItem value="percentage">Percentage</MenuItem>
                                        <MenuItem value="fixed">Fixed Amount</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    fullWidth
                                    label={formData.discount_type === "percentage" ? "Discount %" : "Discount Amount (SYP)"}
                                    type="number"
                                    value={formData.discount_value}
                                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                                    required
                                    inputProps={{ min: 0, max: formData.discount_type === "percentage" ? 100 : undefined }}
                                />
                            </Grid>
                        </Grid>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    fullWidth
                                    label="Start Date"
                                    type="datetime-local"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    required
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 6 }}>
                                <TextField
                                    fullWidth
                                    label="End Date"
                                    type="datetime-local"
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                    required
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>
                        <FormControl fullWidth>
                            <InputLabel>Applicable To</InputLabel>
                            <Select
                                value={formData.applicable_to}
                                onChange={(e) => setFormData({ ...formData, applicable_to: e.target.value as "all" | "category" | "product" })}
                                label="Applicable To"
                            >
                                <MenuItem value="all">All Products</MenuItem>
                                <MenuItem value="category">Specific Category</MenuItem>
                                <MenuItem value="product">Specific Products</MenuItem>
                            </Select>
                        </FormControl>
                        {formData.applicable_to === "category" && (
                            <FormControl fullWidth>
                                <InputLabel>Category</InputLabel>
                                <Select
                                    value={formData.category_filter}
                                    onChange={(e) => setFormData({ ...formData, category_filter: e.target.value })}
                                    label="Category"
                                >
                                    {categories.map((cat) => (
                                        <MenuItem key={cat} value={cat}>
                                            {cat}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}
                        {formData.applicable_to === "product" && (
                            <Box>
                                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                                    اختر المنتجات للعرض
                                </Typography>
                                {/* Selected Products */}
                                {formData.product_ids.length > 0 && (
                                    <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                        {formData.product_ids.map(id => {
                                            const product = products.find(p => p.id === id);
                                            if (!product) return null;
                                            return (
                                                <Chip
                                                    key={id}
                                                    avatar={<Avatar src={product.image_url || undefined}><Inventory fontSize="small" /></Avatar>}
                                                    label={product.name}
                                                    onDelete={() => toggleProductSelection(id)}
                                                    color="primary"
                                                    variant="outlined"
                                                />
                                            );
                                        })}
                                    </Box>
                                )}
                                {/* Search */}
                                <TextField
                                    fullWidth
                                    placeholder="ابحث عن منتج..."
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    sx={{ mb: 2 }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <Search />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                                {/* Products List */}
                                <Paper variant="outlined" sx={{ maxHeight: 300, overflow: 'auto' }}>
                                    {productsLoading ? (
                                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                                            <CircularProgress size={30} />
                                        </Box>
                                    ) : filteredProducts.length === 0 ? (
                                        <Box sx={{ p: 2, textAlign: 'center' }}>
                                            <Typography color="text.secondary">لا توجد منتجات</Typography>
                                        </Box>
                                    ) : (
                                        <List dense>
                                            {filteredProducts.slice(0, 20).map((product) => (
                                                <ListItem
                                                    key={product.id}
                                                    disablePadding
                                                    secondaryAction={
                                                        <Typography variant="body2" color="primary" fontWeight="bold">
                                                            {formatCurrency(product.price)}
                                                        </Typography>
                                                    }
                                                >
                                                    <ListItemButton onClick={() => toggleProductSelection(product.id)}>
                                                        <Checkbox
                                                            edge="start"
                                                            checked={formData.product_ids.includes(product.id)}
                                                            tabIndex={-1}
                                                            disableRipple
                                                        />
                                                        <ListItemAvatar>
                                                            <Avatar
                                                                src={product.image_url || undefined}
                                                                variant="rounded"
                                                                sx={{ width: 48, height: 48 }}
                                                            >
                                                                <Inventory />
                                                            </Avatar>
                                                        </ListItemAvatar>
                                                        <ListItemText
                                                            primary={product.name}
                                                            secondary={product.category}
                                                            primaryTypographyProps={{ fontWeight: 'medium' }}
                                                        />
                                                    </ListItemButton>
                                                </ListItem>
                                            ))}
                                        </List>
                                    )}
                                </Paper>
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    {formData.product_ids.length} منتج محدد
                                </Typography>
                            </Box>
                        )}
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                />
                            }
                            label="Active"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>إلغاء</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {editingOffer ? "تحديث" : "إنشاء"}
                    </Button>
                </DialogActions>
            </Dialog>
            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>حذف العرض</DialogTitle>
                <DialogContent>
                    <Typography>هل أنت متأكد من حذف هذا العرض؟ هذا الإجراء لا يمكن التراجع عنه.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
                    <Button onClick={handleDelete} color="error" variant="contained">
                        حذف
                    </Button>
                </DialogActions>
            </Dialog>
            {/* Floating Action Button for Mobile */}
            <Fab
                color="primary"
                aria-label="add"
                onClick={() => handleOpenDialog()}
                sx={{
                    position: "fixed",
                    bottom: 24,
                    right: 24,
                    display: { xs: "flex", sm: "none" },
                    background: "linear-gradient(45deg, #1976d2, #42a5f5)",
                    boxShadow: 4,
                    zIndex: 1000,
                }}
            >
                <Add />
            </Fab>
        </Box>
    );
}