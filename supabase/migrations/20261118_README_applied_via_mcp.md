# Migrations applied directly on the Supabase project (2026-11-18)

Applied in this order (names as recorded in `supabase_migrations`):

1. `align_schema_with_supabase_auth`  – replaced the better-auth/Drizzle tables with `users` (FK -> auth.users),
   `delivery_addresses`, `user_favorites`, `offers`, `notifications`; converted all `user_id` columns to uuid with FKs;
   rewrote `handle_new_user` trigger (on auth.users) to insert into `public.users`; fixed policies.
2. `lock_down_security_definer_functions` – revoked EXECUTE from anon/public on SECURITY DEFINER functions.
3. `harden_points_and_admin_functions`   – see `20261118_harden_points_and_admin_functions.sql`
4. `restore_columns_expected_by_code_and_cancel_finalizer` + `customer_cancel_order_function`
   – see `20261118_restore_columns_and_customer_cancel.sql`

(1) and (2) were applied in an earlier session and their SQL was not saved to the repo; the final database state is the source of truth.
