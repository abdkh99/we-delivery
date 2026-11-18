import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    // Get user's orders with related data
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items:order_items(*, products(*)),
        deliveries(*, drivers:driver_id(*, users(*)))
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5); // Only get the 5 most recent orders for the dashboard

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    // Get recommended products (you can customize this query based on your needs)
    const { data: recommendedProducts, error: productsError } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(4);

    if (productsError) {
      console.error('Error fetching recommended products:', productsError);
      // Don't fail the whole request if this fails
    }

    // Get unread notifications count
    const { count: unreadNotificationsCount, error: notificationsError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (notificationsError) {
      console.error('Error fetching notifications count:', notificationsError);
      // Don't fail the whole request if this fails
    }

    return NextResponse.json({
      profile,
      recentOrders: orders || [],
      recommendedProducts: recommendedProducts || [],
      unreadNotificationsCount: unreadNotificationsCount || 0,
    });

  } catch (error) {
    console.error('Error in dashboard API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
