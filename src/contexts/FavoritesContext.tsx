"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import useSWR from "swr";

interface FavoritesContextType {
  favorites: string[];
  isLoading: boolean;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => Promise<void>;
  refetch: () => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 401) {
      return { favorites: [] };
    }
    throw new Error("Failed to fetch favorites");
  }
  return response.json();
};

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data, error, isLoading, mutate } = useSWR<{ favorites: string[] }>(
    user ? "/api/favorites" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  const favorites = data?.favorites || [];

  const isFavorite = (productId: string) => {
    return favorites.includes(productId);
  };

  const toggleFavorite = async (productId: string) => {
    if (!user) return;

    const wasFavorite = favorites.includes(productId);
    
    // Optimistic update
    const newFavorites = wasFavorite
      ? favorites.filter((id) => id !== productId)
      : [...favorites, productId];

    mutate({ favorites: newFavorites }, false);

    try {
      if (wasFavorite) {
        const response = await fetch(`/api/favorites?product_id=${productId}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to remove");
      } else {
        const response = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: productId }),
        });
        if (!response.ok) throw new Error("Failed to add");
      }
      
      // Revalidate to ensure sync
      mutate();
    } catch (error) {
      // Revert on error
      mutate({ favorites }, false);
      throw error;
    }
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        isLoading,
        isFavorite,
        toggleFavorite,
        refetch: () => mutate(),
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
}
