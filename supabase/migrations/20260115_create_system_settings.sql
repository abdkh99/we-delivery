-- Migration: Create system_settings table for notifications and general settings
-- Run this in Supabase SQL Editor

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  category TEXT NOT NULL CHECK (category IN ('notifications', 'general', 'other')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- Enable Row Level Security
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Allow admins to read all settings
CREATE POLICY "Admins can read all system settings" ON system_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Allow admins to insert settings
CREATE POLICY "Admins can insert system settings" ON system_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Allow admins to update settings
CREATE POLICY "Admins can update system settings" ON system_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Allow admins to delete settings
CREATE POLICY "Admins can delete system settings" ON system_settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Insert default notification settings
INSERT INTO system_settings (key, value, category) VALUES 
  ('notification_preferences', '{"newOrderAlert": true, "orderStatusChange": true, "lowStockAlert": true, "soundEnabled": true, "emailNotifications": false}', 'notifications')
ON CONFLICT (key) DO NOTHING;

-- Insert default general settings
INSERT INTO system_settings (key, value, category) VALUES 
  ('general_preferences', '{"storeName": "We DELIVER", "storePhone": "", "storeEmail": "", "openingTime": "09:00", "closingTime": "22:00", "minOrderValue": 10000, "isStoreOpen": true}', 'general')
ON CONFLICT (key) DO NOTHING;

-- Grant access to authenticated users (for reading)
GRANT SELECT ON system_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON system_settings TO authenticated;
