
-- Add stripe-related columns to rent_payments
ALTER TABLE public.rent_payments
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS late_fee numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS receipt_url text,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'gbp';

-- Late fee calculation trigger: adds 5% late fee when payment becomes overdue
CREATE OR REPLACE FUNCTION public.calculate_late_fee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'overdue' AND OLD.status IS DISTINCT FROM 'overdue' THEN
    NEW.late_fee := ROUND(NEW.amount * 0.05, 2);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_calculate_late_fee
  BEFORE UPDATE ON public.rent_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_late_fee();
