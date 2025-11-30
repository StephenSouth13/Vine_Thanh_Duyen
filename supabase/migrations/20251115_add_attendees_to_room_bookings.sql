-- Add attendees column to room_bookings table to track meeting participants
ALTER TABLE public.room_bookings
ADD COLUMN IF NOT EXISTS attendees UUID[] DEFAULT ARRAY[]::UUID[];

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_room_bookings_attendees ON room_bookings USING GIN (attendees);
