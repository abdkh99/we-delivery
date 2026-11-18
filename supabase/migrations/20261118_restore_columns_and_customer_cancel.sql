-- Columns the app code reads/writes but that were missing after the schema rebuild
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS has_variants boolean NOT NULL DEFAULT false;

UPDATE public.products p
SET has_variants = true
WHERE EXISTS (SELECT 1 FROM public.product_variants v WHERE v.master_product_id = p.id);

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash',
  ADD COLUMN IF NOT EXISTS stock_restored boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_restored_at timestamp without time zone;

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id);

-- Customers have no UPDATE policy on orders (by design), so cancellation goes through a vetted function.
CREATE OR REPLACE FUNCTION public.customer_cancel_order(p_order_id uuid)
 RETURNS TABLE(success boolean, message text, refunded_points integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
DECLARE
    v_user_id uuid;
    v_status text;
    v_points_used integer;
    v_refunded integer := 0;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Unauthorized'::TEXT, 0;
        RETURN;
    END IF;

    SELECT o.user_id, o.status::text, o.points_used
      INTO v_user_id, v_status, v_points_used
    FROM orders o
    WHERE o.id = p_order_id
    FOR UPDATE;

    IF NOT FOUND OR v_user_id IS DISTINCT FROM auth.uid() THEN
        RETURN QUERY SELECT FALSE, 'Order not found'::TEXT, 0;
        RETURN;
    END IF;

    IF v_status <> 'pending' THEN
        RETURN QUERY SELECT FALSE, 'Cannot cancel at this stage'::TEXT, 0;
        RETURN;
    END IF;

    UPDATE orders SET status = 'cancelled', updated_at = now() WHERE id = p_order_id;
    UPDATE deliveries SET status = 'cancelled', updated_at = now() WHERE order_id = p_order_id;

    IF coalesce(v_points_used, 0) > 0 THEN
        UPDATE users SET points = points + v_points_used, updated_at = now() WHERE id = v_user_id;
        INSERT INTO points_transactions (user_id, order_id, points_change, reason)
        VALUES (v_user_id, p_order_id, v_points_used,
                format('Refund: order %s cancelled', p_order_id::text));
        v_refunded := v_points_used;
    END IF;

    PERFORM restore_order_stock(p_order_id);

    RETURN QUERY SELECT TRUE, 'Order cancelled successfully'::TEXT, v_refunded;
END;
$function$;

REVOKE ALL ON FUNCTION public.customer_cancel_order(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_cancel_order(uuid) TO authenticated;
