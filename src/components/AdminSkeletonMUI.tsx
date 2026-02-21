"use client";

import {
  Box,
  Skeleton,
  Card,
  CardContent,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Container,
} from "@mui/material";

// Professional Admin Dashboard Skeleton
export const AdminDashboardSkeletonMUI = () => {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50" }}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header Skeleton */}
        <Card
          sx={{
            mb: 3,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Skeleton
              variant="rectangular"
              width={200}
              height={32}
              sx={{ bgcolor: "rgba(255,255,255,0.2)", borderRadius: 1, mb: 2 }}
            />
            <Skeleton
              variant="rectangular"
              width="60%"
              height={40}
              sx={{ bgcolor: "rgba(255,255,255,0.2)", borderRadius: 1, mb: 2 }}
            />
            <Skeleton
              variant="rectangular"
              width="40%"
              height={24}
              sx={{ bgcolor: "rgba(255,255,255,0.2)", borderRadius: 1 }}
            />
          </CardContent>
        </Card>

        {/* Stats Grid Skeleton */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={6} md={3} key={i}>
              <Card sx={{ height: "100%" }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                    <Skeleton
                      variant="circular"
                      width={48}
                      height={48}
                      sx={{ mr: 2 }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="60%" height={20} />
                      <Skeleton variant="text" width="80%" height={32} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Quick Actions Skeleton */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={6} md={3} key={i}>
              <Skeleton
                variant="rectangular"
                height={56}
                sx={{ borderRadius: 2 }}
              />
            </Grid>
          ))}
        </Grid>

        {/* Main Content Card */}
        <Card>
          <CardContent>
            {/* Tabs Skeleton */}
            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
              <Box sx={{ display: "flex", gap: 2 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton
                    key={i}
                    variant="rectangular"
                    width={120}
                    height={48}
                    sx={{ borderRadius: 1 }}
                  />
                ))}
              </Box>
            </Box>

            {/* Content Area Skeleton */}
            <Box>
              <Skeleton variant="text" width={200} height={32} sx={{ mb: 3 }} />
              <Skeleton
                variant="rectangular"
                height={400}
                sx={{ borderRadius: 2 }}
              />
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

// Products Page Skeleton
export const AdminProductsSkeletonMUI = () => {
  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="rectangular" width={150} height={40} sx={{ borderRadius: 1 }} />
      </Box>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableCell key={i}>
                  <Skeleton variant="text" width={100} height={24} />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {[1, 2, 3, 4, 5, 6].map((row) => (
              <TableRow key={row}>
                {[1, 2, 3, 4, 5].map((col) => (
                  <TableCell key={col}>
                    <Skeleton variant="text" width={col === 1 ? 200 : 100} height={20} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

// Orders Page Skeleton
export const AdminOrdersSkeletonMUI = () => {
  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Skeleton variant="text" width={200} height={40} />
        <Box sx={{ display: "flex", gap: 2 }}>
          <Skeleton variant="rectangular" width={150} height={40} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={150} height={40} sx={{ borderRadius: 1 }} />
        </Box>
      </Box>

      {/* Mobile Cards Skeleton */}
      <Box sx={{ display: { xs: "block", sm: "none" } }}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} sx={{ mb: 2 }}>
            <CardContent>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Skeleton variant="text" width={150} height={24} />
                <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 2 }} />
              </Box>
              <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="80%" height={20} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="60%" height={20} />
              <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                <Skeleton variant="rectangular" width={100} height={36} sx={{ borderRadius: 1 }} />
                <Skeleton variant="rectangular" width={100} height={36} sx={{ borderRadius: 1 }} />
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Desktop Table Skeleton */}
      <Paper sx={{ display: { xs: "none", sm: "block" } }}>
        <Table>
          <TableHead>
            <TableRow>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableCell key={i}>
                  <Skeleton variant="text" width={120} height={24} />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {[1, 2, 3, 4, 5, 6].map((row) => (
              <TableRow key={row}>
                {[1, 2, 3, 4, 5].map((col) => (
                  <TableCell key={col}>
                    <Skeleton variant="text" width={col === 1 ? 150 : 100} height={20} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};

// Stats Cards Skeleton
export const AdminStatsSkeletonMUI = () => {
  return (
    <Grid container spacing={3}>
      {[1, 2, 3, 4].map((i) => (
        <Grid item xs={6} md={3} key={i}>
          <Card>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <Skeleton variant="circular" width={48} height={48} sx={{ mr: 2 }} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="60%" height={16} />
                  <Skeleton variant="text" width="80%" height={28} sx={{ mt: 1 }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

// Settings Page Skeleton
export const AdminSettingsSkeletonMUI = () => {
  return (
    <Box>
      <Skeleton variant="text" width={300} height={40} sx={{ mb: 4 }} />
      
      <Grid container spacing={3}>
        {[1, 2].map((i) => (
          <Grid item xs={12} md={6} key={i}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                  <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                  <Box>
                    <Skeleton variant="text" width={150} height={24} />
                    <Skeleton variant="text" width={200} height={16} />
                  </Box>
                </Box>
                <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 1, mb: 2 }} />
                <Skeleton variant="rectangular" height={40} sx={{ borderRadius: 1 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
