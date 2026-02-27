
-- Add expires_at to reference_requests for time-limited tokens
ALTER TABLE public.reference_requests
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone DEFAULT (now() + interval '14 days');

-- Allow anonymous users to view reference requests by token (for referee form)
CREATE POLICY "Anyone can view reference by token"
ON public.reference_requests FOR SELECT
USING (true);

-- Allow anonymous insert on reference_responses (referee submission)
ALTER TABLE public.reference_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit reference response"
ON public.reference_responses FOR INSERT
WITH CHECK (true);

-- Allow landlords to view reference responses for their applicants
CREATE POLICY "Landlords view reference responses"
ON public.reference_responses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM reference_requests rr
    JOIN application_references ar ON ar.reference_request_id = rr.id
    JOIN applications a ON a.id = ar.application_id
    JOIN listings l ON l.id = a.listing_id
    WHERE rr.id = reference_responses.request_id
      AND l.owner_id = auth.uid()
  )
);

-- Allow anyone to update reference_requests status by token (mark as opened/completed)
CREATE POLICY "Anyone can update reference status by token"
ON public.reference_requests FOR UPDATE
USING (true);

-- Notification trigger: notify tenant when reference is completed
CREATE OR REPLACE FUNCTION public.notify_reference_completed()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  _ref RECORD;
BEGIN
  SELECT rr.user_id, rr.referee_name INTO _ref
  FROM reference_requests rr WHERE rr.id = NEW.request_id;

  IF _ref.user_id IS NOT NULL THEN
    PERFORM create_notification(
      _ref.user_id,
      'Reference received',
      _ref.referee_name || ' has submitted their reference',
      '/dashboard/references'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_reference_completed
AFTER INSERT ON public.reference_responses
FOR EACH ROW EXECUTE FUNCTION public.notify_reference_completed();
