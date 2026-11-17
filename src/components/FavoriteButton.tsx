"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface FavoriteButtonProps {
  productId: string;
  className?: string;
  size?: number;
}

export default function FavoriteButton({
  productId,
  className = "",
  size = 24,
}: FavoriteButtonProps) {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite, isLoading: favoritesLoading } = useFavorites();
  const router = useRouter();
  const [isAnimating, setIsAnimating] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const favorite = isFavorite(productId);

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error("يرجى تسجيل الدخول لإضافة المفضلة");
      router.push("/login");
      return;
    }

    setIsToggling(true);
    setIsAnimating(true);

    try {
      await toggleFavorite(productId);
      toast.success(favorite ? "تمت إزالة المنتج من المفضلة" : "تمت إضافة المنتج للمفضلة");
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("فشل تحديث المفضلة");
    } finally {
      setIsToggling(false);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={isToggling || favoritesLoading}
      className={`
        ${className}
        ${isAnimating ? "animate-pulse scale-110" : ""}
        transition-all duration-300
        ${favorite ? "text-red-500" : "text-gray-400 hover:text-red-400"}
        ${isToggling || favoritesLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
      aria-label={favorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
    >
      <Heart
        size={size}
        className={`
          ${favorite ? "fill-current" : ""}
          transition-all duration-200
        `}
      />
    </button>
  );
}
