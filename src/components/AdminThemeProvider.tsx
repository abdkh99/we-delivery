"use client";

import { createTheme, ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { arEG } from "@mui/material/locale";

// Custom elegant theme with calm colors
const adminTheme = createTheme(
    {
        direction: "rtl",
        palette: {
            mode: "light",
            primary: {
                main: "#4f46e5", // Indigo
                light: "#818cf8",
                dark: "#3730a3",
                contrastText: "#ffffff",
            },
            secondary: {
                main: "#7c3aed", // Purple
                light: "#a78bfa",
                dark: "#5b21b6",
                contrastText: "#ffffff",
            },
            success: {
                main: "#059669", // Emerald
                light: "#34d399",
                dark: "#047857",
            },
            warning: {
                main: "#d97706", // Amber
                light: "#fbbf24",
                dark: "#b45309",
            },
            error: {
                main: "#dc2626", // Red
                light: "#f87171",
                dark: "#b91c1c",
            },
            info: {
                main: "#0891b2", // Cyan
                light: "#22d3ee",
                dark: "#0e7490",
            },
            background: {
                default: "#f8fafc", // Slate 50
                paper: "#ffffff",
            },
            text: {
                primary: "#1e293b", // Slate 800
                secondary: "#64748b", // Slate 500
            },
            divider: "#e2e8f0", // Slate 200
        },
        typography: {
            fontFamily: '"Tajawal", "Roboto", "Helvetica", "Arial", sans-serif',
            h4: {
                fontWeight: 700,
            },
            h5: {
                fontWeight: 600,
            },
            h6: {
                fontWeight: 600,
            },
            subtitle1: {
                fontWeight: 500,
            },
            button: {
                textTransform: "none",
                fontWeight: 600,
            },
        },
        shape: {
            borderRadius: 12,
        },
        components: {
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 10,
                        padding: "10px 20px",
                        boxShadow: "none",
                        "&:hover": {
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                        },
                    },
                    contained: {
                        "&:hover": {
                            boxShadow: "0 6px 16px rgba(0, 0, 0, 0.12)",
                        },
                    },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)",
                        border: "1px solid #e2e8f0",
                        transition: "box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out",
                        "&:hover": {
                            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
                        },
                    },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: {
                        fontWeight: 600,
                    },
                },
            },
            MuiTab: {
                styleOverrides: {
                    root: {
                        textTransform: "none",
                        fontWeight: 600,
                        fontSize: "0.95rem",
                    },
                },
            },
            MuiTableCell: {
                styleOverrides: {
                    head: {
                        fontWeight: 700,
                        backgroundColor: "#f8fafc",
                        color: "#475569",
                    },
                },
            },
            MuiDialog: {
                styleOverrides: {
                    paper: {
                        borderRadius: 16,
                    },
                },
            },
            MuiTextField: {
                styleOverrides: {
                    root: {
                        "& .MuiOutlinedInput-root": {
                            borderRadius: 10,
                        },
                    },
                },
            },
        },
    },
    arEG
);

export default function AdminThemeProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ThemeProvider theme={adminTheme}>
            <CssBaseline />
            {children}
        </ThemeProvider>
    );
}

// Export theme for use in components
export { adminTheme };
