"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
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
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Chip,
} from "@mui/material";
import {
  ArrowBack,
  Save,
  Delete,
  Add,
  Edit,
  Image as ImageIcon,
  AttachMoney,
  Inventory,
  Category,
  Description,
} from "@mui/icons-material";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import ImageUploader from "@/components/ImageUploader";

interface ProductVariant {
  id: string;
  variant_name: string;
  variant_sku?: string;
  price?: number;
  usd_price?: number;
  stock_estimate: number;
  image_url?: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  usd_price?: number;
  stock_estimate: number;
  category: string;
  description?: string;
  image_url?: string;
  has_variants: boolean;
  product_variants?: ProductVariant[];
}

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, profile } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pricingMode, setPricingMode] = useState<"usd" | "syp">("syp");
  const [rateInfo, setRateInfo] = useState<any>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    price: "",
    usd_price: "",
    stock_estimate: "",
    category: "",
    description: "",
    image_url: "",
  });

  const [variants, setVariants] = useState<ProductVariant[]>([]);

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

  // Fetch product data
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setInitialLoading(true);
        setError(null);
        const response = await fetch(`/api/products/${id}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Product not found" }));
          throw new Error(errorData.error || "Failed to fetch product");
        }

        const { product } = await response.json();
        console.log("🛠️ Fetched product for edit:", product);

        if (!product) {
          console.error("❌ Product seems empty!");
        } else {
          console.log("✅ Product ID:", product.id);
          console.log("✅ Product Name:", product.name);
        }

        // Populate form
        setFormData({
          name: product.name || "",
          sku: product.sku || "",
          price: product.price?.toString() || "",
          usd_price: product.usd_price?.toString() || "",
          stock_estimate: product.stock_estimate?.toString() || "0",
          category: product.category || "",
          description: product.description || "",
          image_url: product.image_url || "",
        });

        // Determine pricing mode
        if (product.usd_price) {
          setPricingMode("usd");
        } else {
          setPricingMode("syp");
        }

        // Load variants
        if (product.has_variants && product.product_variants) {
          setVariants(
            product.product_variants
              .filter((v: ProductVariant) => v.is_active !== false)
              .map((v: ProductVariant) => ({
                id: v.id,
                variant_name: v.variant_name || "",
                variant_sku: v.variant_sku || "",
                price: v.price,
                usd_price: v.usd_price ? parseFloat(v.usd_price.toString()) : undefined,
                stock_estimate: v.stock_estimate || 0,
                image_url: v.image_url || "",
                description: v.description || "",
                display_order: v.display_order || 0,
                is_active: v.is_active !== false,
              }))
          );
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to load product";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setInitialLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  // Fetch exchange rate
  useEffect(() => {
    const fetchRate = async () => {
      if (pricingMode === "usd") {
        try {
          setRateLoading(true);
          const response = await fetch("/api/admin/exchange-rate", { method: "GET" });
          if (response.ok) {
            const data = await response.json();
            setRateInfo(data);
          }
        } catch (error) {
          console.error("Failed to load rate:", error);
        } finally {
          setRateLoading(false);
        }
      }
    };
    fetchRate();
  }, [pricingMode]);

  // Calculate SYP price from USD
  const computedSypPrice = () => {
    if (pricingMode !== "usd" || !rateInfo || !formData.usd_price) return null;
    const usd = parseFloat(formData.usd_price);
    if (isNaN(usd)) return null;
    return Math.ceil((usd * rateInfo.rate) / 5) * 5;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCategoryChange = (e: any) => {
    setFormData({ ...formData, category: e.target.value });
  };

  // Variant management
  const addVariant = () => {
    const newVariant: ProductVariant = {
      id: `temp-${Date.now()}`,
      variant_name: "",
      variant_sku: "",
      stock_estimate: 0,
      price: undefined,
      usd_price: undefined,
      image_url: "",
      description: "",
      display_order: variants.length,
      is_active: true,
    };
    setVariants([...variants, newVariant]);
    setEditingVariantId(newVariant.id);
  };

  const removeVariant = (id: string) => {
    setVariants(variants.filter((v) => v.id !== id));
    if (editingVariantId === id) {
      setEditingVariantId(null);
    }
  };

  const updateVariant = (id: string, field: keyof ProductVariant, value: any) => {
    setVariants(
      variants.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || profile?.role !== "admin") {
      toast.error("Admin access required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Validation
      const stock = parseInt(formData.stock_estimate);
      if (isNaN(stock) || stock < 0) {
        throw new Error("Stock must be a non-negative number");
      }

      if (pricingMode === "usd") {
        const usd = parseFloat(formData.usd_price);
        if (!usd || usd <= 0) {
          throw new Error("Please enter a valid USD price");
        }
      } else {
        const syp = parseFloat(formData.price);
        if (!syp || syp <= 0) {
          throw new Error("Please enter a valid SYP price");
        }
      }

      // Validate variants if product has variants
      if (variants.length > 0) {
        for (const variant of variants) {
          if (!variant.variant_name || variant.variant_name.trim() === "") {
            throw new Error("All variants must have a name");
          }
          if (variant.stock_estimate < 0) {
            throw new Error("Variant stock cannot be negative");
          }
        }
      }

      const payload: any = {
        name: formData.name,
        sku: formData.sku,
        stock_estimate: stock,
        category: formData.category,
        description: formData.description || null,
        image_url: formData.image_url || null,
        has_variants: variants.length > 0,
      };

      if (pricingMode === "usd") {
        const syp = computedSypPrice();
        if (syp) {
          payload.price = syp;
          payload.usd_price = parseFloat(formData.usd_price);
          payload.last_synced_rate = rateInfo?.rate;
        }
      } else {
        payload.price = parseFloat(formData.price);
      }

      // Include variants in payload
      if (variants.length > 0) {
        payload.variants = variants.map((v) => ({
          id: v.id.startsWith("temp-") ? undefined : v.id,
          variant_name: v.variant_name,
          variant_sku: v.variant_sku || undefined,
          price: v.price || payload.price,
          usd_price: v.usd_price || (pricingMode === "usd" ? parseFloat(formData.usd_price) : undefined),
          stock_estimate: v.stock_estimate,
          image_url: v.image_url || undefined,
          description: v.description || undefined,
          display_order: v.display_order || 0,
          is_active: v.is_active !== false,
        }));
      }

      const response = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update product");
      }

      toast.success("Product updated successfully! ✅");
      router.push("/admin");
    } catch (error) {
      console.error("Error updating product:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update product";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user || profile?.role !== "admin") {
      toast.error("Admin access required");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete product");
      }

      toast.success("Product deleted successfully");
      router.push("/admin");
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete product");
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  if (initialLoading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "grey.50",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <Navigation />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Debug Info - Temporary */}
        <Paper sx={{ p: 2, mb: 2, bgcolor: "#ffebee", border: "1px solid red" }}>
          <Typography variant="h6" color="error">🔧 Debug Info</Typography>
          <pre style={{ overflow: "auto", maxHeight: "200px" }}>
            <strong>ID:</strong> {id || "undefined"}{"\n"}
            <strong>Loading:</strong> {loading ? "yes" : "no"}, <strong>Initial:</strong> {initialLoading ? "yes" : "no"}{"\n"}
            <strong>Error:</strong> {error || "none"}{"\n"}
            <strong>Data Name:</strong> {formData.name}{"\n"}
            <strong>Data Price:</strong> {formData.price || formData.usd_price}{"\n"}
          </pre>
        </Paper>

        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.back()}
          sx={{ mb: 3 }}
        >
          Back
        </Button>

        <Paper elevation={3} sx={{ p: 4, mb: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="h4" component="h1" fontWeight="bold">
              Edit Product
            </Typography>
            <Button
              color="error"
              variant="outlined"
              startIcon={<Delete />}
              onClick={() => setDeleteDialogOpen(true)}
              disabled={loading}
            >
              Delete Product
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {/* Basic Info Section */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                  <Category sx={{ mr: 1, color: "primary.main" }} />
                  <Typography variant="h6" fontWeight="bold">
                    Basic Information
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth
                      label="Product Name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="SKU"
                      name="sku"
                      value={formData.sku}
                      onChange={handleChange}
                      required
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth required>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={formData.category}
                        onChange={handleCategoryChange}
                        label="Category"
                      >
                        {categories.map((cat) => (
                          <MenuItem key={cat} value={cat}>
                            {cat}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Description"
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      multiline
                      rows={4}
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Pricing Section */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                  <AttachMoney sx={{ mr: 1, color: "success.main" }} />
                  <Typography variant="h6" fontWeight="bold">
                    Pricing
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>
                    Pricing Mode
                  </Typography>
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <Button
                      variant={pricingMode === "usd" ? "contained" : "outlined"}
                      onClick={() => setPricingMode("usd")}
                      type="button"
                    >
                      USD Pricing
                    </Button>
                    <Button
                      variant={pricingMode === "syp" ? "contained" : "outlined"}
                      onClick={() => setPricingMode("syp")}
                      type="button"
                    >
                      SYP Pricing
                    </Button>
                  </Box>
                </Box>

                {pricingMode === "usd" ? (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Price (USD)"
                        name="usd_price"
                        type="number"
                        step="0.01"
                        value={formData.usd_price}
                        onChange={handleChange}
                        required
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        }}
                        disabled={rateLoading}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Paper
                        sx={{
                          p: 2,
                          bgcolor: "primary.light",
                          color: "primary.contrastText",
                        }}
                      >
                        <Typography variant="caption" display="block">
                          Calculated SYP Price
                        </Typography>
                        <Typography variant="h5" fontWeight="bold">
                          {computedSypPrice() ? formatCurrency(computedSypPrice()!) : "—"}
                        </Typography>
                        {rateInfo && (
                          <Typography variant="caption" sx={{ mt: 1, display: "block" }}>
                            Rate: {rateInfo.rate} SYP/USD
                          </Typography>
                        )}
                      </Paper>
                    </Grid>
                  </Grid>
                ) : (
                  <TextField
                    fullWidth
                    label="Price (SYP)"
                    name="price"
                    type="number"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    InputProps={{
                      startAdornment: <InputAdornment position="start">SYP</InputAdornment>,
                    }}
                  />
                )}
              </CardContent>
            </Card>

            {/* Stock Management */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                  <Inventory sx={{ mr: 1, color: "warning.main" }} />
                  <Typography variant="h6" fontWeight="bold">
                    Stock Management
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />

                <TextField
                  fullWidth
                  label="Stock Quantity"
                  name="stock_estimate"
                  type="number"
                  value={formData.stock_estimate}
                  onChange={handleChange}
                  required
                  inputProps={{ min: 0 }}
                  helperText="Stock quantity cannot be negative"
                />
              </CardContent>
            </Card>

            {/* Product Image */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                  <ImageIcon sx={{ mr: 1, color: "secondary.main" }} />
                  <Typography variant="h6" fontWeight="bold">
                    Product Image
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />

                <ImageUploader
                  value={formData.image_url}
                  onChange={(url) => setFormData({ ...formData, image_url: url })}
                />
              </CardContent>
            </Card>

            {/* Variants/Flavors Management */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Description sx={{ mr: 1, color: "info.main" }} />
                    <Typography variant="h6" fontWeight="bold">
                      Variants / Flavors
                    </Typography>
                  </Box>
                  <Button
                    startIcon={<Add />}
                    variant="contained"
                    onClick={addVariant}
                    type="button"
                  >
                    Add Variant
                  </Button>
                </Box>
                <Divider sx={{ mb: 3 }} />

                {variants.length === 0 ? (
                  <Alert severity="info">
                    No variants added. Click "Add Variant" to add product variants/flavors.
                  </Alert>
                ) : (
                  <Grid container spacing={2}>
                    {variants.map((variant, index) => (
                      <Grid item xs={12} key={variant.id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                              <Typography variant="subtitle1" fontWeight="bold">
                                Variant {index + 1}
                              </Typography>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => removeVariant(variant.id)}
                                disabled={loading}
                              >
                                <Delete />
                              </IconButton>
                            </Box>

                            <Grid container spacing={2}>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  fullWidth
                                  label="Variant Name"
                                  value={variant.variant_name}
                                  onChange={(e) =>
                                    updateVariant(variant.id, "variant_name", e.target.value)
                                  }
                                  required
                                  size="small"
                                />
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <TextField
                                  fullWidth
                                  label="Variant SKU (Optional)"
                                  value={variant.variant_sku || ""}
                                  onChange={(e) =>
                                    updateVariant(variant.id, "variant_sku", e.target.value)
                                  }
                                  size="small"
                                />
                              </Grid>
                              <Grid item xs={12} md={4}>
                                <TextField
                                  fullWidth
                                  label="Stock Quantity"
                                  type="number"
                                  value={variant.stock_estimate}
                                  onChange={(e) =>
                                    updateVariant(
                                      variant.id,
                                      "stock_estimate",
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  required
                                  inputProps={{ min: 0 }}
                                  size="small"
                                />
                              </Grid>
                              {pricingMode === "usd" && (
                                <Grid item xs={12} md={4}>
                                  <TextField
                                    fullWidth
                                    label="USD Price Override (Optional)"
                                    type="number"
                                    step="0.01"
                                    value={variant.usd_price || ""}
                                    onChange={(e) =>
                                      updateVariant(
                                        variant.id,
                                        "usd_price",
                                        e.target.value ? parseFloat(e.target.value) : undefined
                                      )
                                    }
                                    InputProps={{
                                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                    }}
                                    size="small"
                                    helperText="Leave empty to use product price"
                                  />
                                </Grid>
                              )}
                              {pricingMode === "syp" && (
                                <Grid item xs={12} md={4}>
                                  <TextField
                                    fullWidth
                                    label="SYP Price Override (Optional)"
                                    type="number"
                                    value={variant.price || ""}
                                    onChange={(e) =>
                                      updateVariant(
                                        variant.id,
                                        "price",
                                        e.target.value ? parseFloat(e.target.value) : undefined
                                      )
                                    }
                                    InputProps={{
                                      startAdornment: <InputAdornment position="start">SYP</InputAdornment>,
                                    }}
                                    size="small"
                                    helperText="Leave empty to use product price"
                                  />
                                </Grid>
                              )}
                              <Grid item xs={12}>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                                  صورة النكهة (اختياري)
                                </Typography>
                                <ImageUploader
                                  value={variant.image_url}
                                  onChange={(url) =>
                                    updateVariant(variant.id, "image_url", url)
                                  }
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <TextField
                                  fullWidth
                                  label="Description (Optional)"
                                  value={variant.description || ""}
                                  onChange={(e) =>
                                    updateVariant(variant.id, "description", e.target.value)
                                  }
                                  multiline
                                  rows={2}
                                  size="small"
                                />
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </CardContent>
            </Card>

            {/* Submit Buttons */}
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 3 }}>
              <Button
                variant="outlined"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                disabled={loading}
                size="large"
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </Box>
          </form>
        </Paper>
      </Container>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Product</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this product? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={loading}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
