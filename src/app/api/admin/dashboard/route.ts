import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

type DashboardStats = {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  totalProducts: number;
  lowStockProducts: number;
  recentOrders: Record<string, unknown>[];
  recentProducts: Record<string, unknown>[];
};

export async function GET() {
  try {
    const supabase = await createClient();

    // Verify admin access
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin in users table
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get dashboard stats
    const [
      { count: totalOrders },
      { count: pendingOrders },
      { count: completedOrders },
      { data: revenueData },
      { count: totalProducts },
      { count: lowStockProducts },
      { data: recentOrders },
      { data: recentProducts }
    ] = await Promise.all([
      // Total orders
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true }),
      
      // Pending orders
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      
      // Completed orders
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'delivered'),
      
      // Total revenue (sum of all completed orders)
      supabase
        .from('orders')
        .select('total_price')
        .eq('status', 'delivered'),
      
      // Total products
      supabase
        .from('products')
        .select('*', { count: 'exact', head: true }),
      
      // Low stock products (less than 10 in stock)
      supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lt('stock_estimate', 10),
      
      // Recent orders
      supabase
        .from('orders')
        .select(`
          *,
          users:user_id(id, name, phone),
          order_items(*, products(*)),
          deliveries(*, drivers(*, users(*)))
        `)
        .order('created_at', { ascending: false })
        .limit(5),
      
      // Recent products
      supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
    ]);

    // Calculate total revenue
    const totalRevenue = revenueData?.reduce(
      (sum: number, order: { total_price?: number }) => sum + (order.total_price || 0),
      0
    ) || 0;

    return NextResponse.json({
      totalOrders: totalOrders || 0,
      pendingOrders: pendingOrders || 0,
      completedOrders: completedOrders || 0,
      totalRevenue,
      totalProducts: totalProducts || 0,
      lowStockProducts: lowStockProducts || 0,
      recentOrders: recentOrders || [],
      recentProducts: recentProducts || [],
    } as DashboardStats);

  } catch (error) {
    console.error('Error in admin dashboard API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
