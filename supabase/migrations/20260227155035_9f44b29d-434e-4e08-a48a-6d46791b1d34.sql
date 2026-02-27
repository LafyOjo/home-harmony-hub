
-- Allow admins to update verification_requests (approve/reject)
CREATE POLICY "Admins update verifications"
ON public.verification_requests FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Notification trigger when verification status changes
CREATE OR REPLACE FUNCTION public.notify_verification_update()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM create_notification(
      NEW.user_id,
      CASE
        WHEN NEW.status = 'verified' THEN 'Verification approved'
        WHEN NEW.status = 'rejected' THEN 'Verification rejected'
        WHEN NEW.status = 'requires_more_info' THEN 'More info needed'
        ELSE 'Verification update'
      END,
      CASE
        WHEN NEW.status = 'verified' THEN 'Your ' || REPLACE(NEW.verification_type, '_', ' ') || ' verification has been approved.'
        WHEN NEW.status = 'rejected' THEN 'Your ' || REPLACE(NEW.verification_type, '_', ' ') || ' verification was rejected.' || COALESCE(' Reason: ' || NEW.notes, '')
        WHEN NEW.status = 'requires_more_info' THEN 'Additional information is needed for your ' || REPLACE(NEW.verification_type, '_', ' ') || ' verification.'
        ELSE 'Your verification status has been updated.'
      END,
      '/dashboard/verification'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_verification_update
AFTER UPDATE ON public.verification_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_verification_update();
