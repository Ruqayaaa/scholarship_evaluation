-- Run this in your Supabase SQL editor to add interview scheduling columns
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS interview_at timestamptz,
  ADD COLUMN IF NOT EXISTS interview_message text DEFAULT '';
