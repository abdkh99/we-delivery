export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string;
          username: string;
          phone: string;
          email: string | null;
          address_text: string | null;
          default_lat: number | null;
          default_lng: number | null;
          points: number;
          role: "customer" | "admin" | "driver";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          username: string;
          phone: string;
          email?: string | null;
          address_text?: string | null;
          default_lat?: number | null;
          default_lng?: number | null;
          points?: number;
          role?: "customer" | "admin" | "driver";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          username?: string;
          phone?: string;
          email?: string | null;
          address_text?: string | null;
          default_lat?: number | null;
          default_lng?: number | null;
          points?: number;
          role?: "customer" | "admin" | "driver";
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          sku: string;
          price: number;
          stock_estimate: number;
          image_url: string | null;
          category: string;
          description: string | null;
          is_active: boolean;
          usd_price: number | null;
          last_synced_rate: number | null;
          price_updated_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          sku: string;
          price: number;
          stock_estimate: number;
          image_url?: string | null;
          category: string;
          description?: string | null;
          is_active?: boolean;
          usd_price?: number | null;
          last_synced_rate?: number | null;
          price_updated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          sku?: string;
          price?: number;
          stock_estimate?: number;
          image_url?: string | null;
          category?: string;
          description?: string | null;
          is_active?: boolean;
          usd_price?: number | null;
          last_synced_rate?: number | null;
          price_updated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      product_variants: {
        Row: {
          id: string;
          master_product_id: string;
          variant_name: string;
          variant_sku: string;
          price: number;
          stock_estimate: number;
          image_url: string | null;
          description: string | null;
          display_order: number | null;
          is_active: boolean | null;
          usd_price: number | null;
          last_synced_rate: number | null;
          price_updated_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          master_product_id: string;
          variant_name: string;
          variant_sku: string;
          price: number;
          stock_estimate?: number;
          image_url?: string | null;
          description?: string | null;
          display_order?: number | null;
          is_active?: boolean | null;
          usd_price?: number | null;
          last_synced_rate?: number | null;
          price_updated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          master_product_id?: string;
          variant_name?: string;
          variant_sku?: string;
          price?: number;
          stock_estimate?: number;
          image_url?: string | null;
          description?: string | null;
          display_order?: number | null;
          is_active?: boolean | null;
          usd_price?: number | null;
          last_synced_rate?: number | null;
          price_updated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          total_price: number;
          delivery_fee: number;
          platform_commission: number;
          status:
          | "pending"
          | "confirmed"
          | "on_delivery"
          | "delivered"
          | "cancelled";
          address_text: string;
          lat: number;
          lng: number;
          notes: string | null;
          points_used: number;
          cash_amount: number;
          payment_method: "cash" | "points" | "mixed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          total_price: number;
          delivery_fee: number;
          platform_commission?: number;
          status?:
          | "pending"
          | "confirmed"
          | "on_delivery"
          | "delivered"
          | "cancelled";
          address_text: string;
          lat: number;
          lng: number;
          notes?: string | null;
          points_used?: number;
          cash_amount?: number;
          payment_method?: "cash" | "points" | "mixed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          total_price?: number;
          delivery_fee?: number;
          platform_commission?: number;
          status?:
          | "pending"
          | "confirmed"
          | "on_delivery"
          | "delivered"
          | "cancelled";
          address_text?: string;
          lat?: number;
          lng?: number;
          notes?: string | null;
          points_used?: number;
          cash_amount?: number;
          payment_method?: "cash" | "points" | "mixed";
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          qty: number;
          price_at_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          qty: number;
          price_at_order: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          qty?: number;
          price_at_order?: number;
          created_at?: string;
        };
      };
      deliveries: {
        Row: {
          id: string;
          order_id: string;
          driver_id: string;
          status: "assigned" | "on_way" | "delivered" | "failed" | "cancelled";
          started_at: string | null;
          delivered_at: string | null;
          proof_image_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          driver_id: string;
          status?: "assigned" | "on_way" | "delivered" | "failed" | "cancelled";
          started_at?: string | null;
          delivered_at?: string | null;
          proof_image_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          driver_id?: string;
          status?: "assigned" | "on_way" | "delivered" | "failed";
          started_at?: string | null;
          delivered_at?: string | null;
          proof_image_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      drivers: {
        Row: {
          id: string;
          user_id: string;
          vehicle_info: string;
          region: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          vehicle_info: string;
          region?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          vehicle_info?: string;
          region?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      commission_settings: {
        Row: {
          id: string;
          min_order_amount: number;
          max_order_amount: number | null;
          commission_percentage: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          min_order_amount: number;
          max_order_amount?: number | null;
          commission_percentage: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          min_order_amount?: number;
          max_order_amount?: number | null;
          commission_percentage?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      points_transactions: {
        Row: {
          id: string;
          user_id: string;
          order_id: string | null;
          points_change: number;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          order_id?: string | null;
          points_change: number;
          reason: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          order_id?: string | null;
          points_change?: number;
          reason?: string;
          created_at?: string;
        };
      };
      currency_rates: {
        Row: {
          id: string;
          base_currency: string;
          target_currency: string;
          currency_pair: string;
          rate: number;
          provider: string | null;
          fetched_at: string;
          is_manual: boolean;
          updated_by: string | null;
        };
        Insert: {
          id?: string;
          base_currency: string;
          target_currency: string;
          currency_pair?: string;
          rate: number;
          provider?: string | null;
          fetched_at?: string;
          is_manual?: boolean;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          base_currency?: string;
          target_currency?: string;
          currency_pair?: string;
          rate?: number;
          provider?: string | null;
          fetched_at?: string;
          is_manual?: boolean;
          updated_by?: string | null;
        };
      };
      delivery_fee_tiers: {
        Row: {
          id: string;
          min_order_amount: number;
          max_order_amount: number | null;
          delivery_fee: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          min_order_amount: number;
          max_order_amount?: number | null;
          delivery_fee: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          min_order_amount?: number;
          max_order_amount?: number | null;
          delivery_fee?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
