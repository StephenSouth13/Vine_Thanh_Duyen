-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_link text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (p_user_id, p_type, p_title, p_message, p_link)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Trigger function for leave request notifications
CREATE OR REPLACE FUNCTION public.notify_leave_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_user_name text;
BEGIN
  -- Get requester name
  SELECT CONCAT(first_name, ' ', last_name) INTO v_user_name
  FROM profiles WHERE id = NEW.user_id;
  
  -- Notify all admins
  FOR v_admin_id IN 
    SELECT user_id FROM user_roles WHERE role = 'admin'
  LOOP
    PERFORM create_notification(
      v_admin_id,
      'leave_request',
      'New Leave Request',
      v_user_name || ' has requested leave from ' || NEW.start_date || ' to ' || NEW.end_date,
      '/leave'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_leave_request_created
  AFTER INSERT ON public.leave_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_leave_request();

-- Trigger function for task assignment notifications
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_name text;
BEGIN
  IF NEW.assignee_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) THEN
    -- Get creator name
    SELECT CONCAT(first_name, ' ', last_name) INTO v_creator_name
    FROM profiles WHERE id = NEW.creator_id;
    
    -- Notify assignee
    PERFORM create_notification(
      NEW.assignee_id,
      'task_assigned',
      'New Task Assigned',
      v_creator_name || ' assigned you a task: ' || NEW.title,
      '/tasks'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_assigned
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_assignment();

-- Trigger function for room booking notifications
CREATE OR REPLACE FUNCTION public.notify_room_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid;
  v_user_name text;
BEGIN
  -- Get requester name
  SELECT CONCAT(first_name, ' ', last_name) INTO v_user_name
  FROM profiles WHERE id = NEW.user_id;
  
  -- Notify all admins and leaders
  FOR v_admin_id IN 
    SELECT user_id FROM user_roles WHERE role IN ('admin', 'leader')
  LOOP
    PERFORM create_notification(
      v_admin_id,
      'room_booking',
      'New Room Booking Request',
      v_user_name || ' has requested to book a room: ' || NEW.title,
      '/meeting-rooms'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_room_booking_created
  AFTER INSERT ON public.room_bookings
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_room_booking();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;