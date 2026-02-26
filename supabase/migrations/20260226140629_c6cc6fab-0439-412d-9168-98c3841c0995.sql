-- Tenancy messages table for ongoing landlord-tenant communication
CREATE TABLE public.tenancy_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenancy_id uuid NOT NULL REFERENCES public.tenancies(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.tenancy_messages ENABLE ROW LEVEL SECURITY;

-- Tenancy participants can view and send messages
CREATE POLICY "Tenancy participants manage messages"
ON public.tenancy_messages FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM tenancies t
  WHERE t.id = tenancy_messages.tenancy_id
  AND (t.tenant_id = auth.uid() OR t.landlord_id = auth.uid())
))
WITH CHECK (auth.uid() = sender_id);

-- Enable realtime on messaging and notification tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tenancy_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Database function to create notifications (used by triggers)
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid,
  _title text,
  _message text,
  _link text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, link)
  VALUES (_user_id, _title, _message, _link);
END;
$$;

-- Trigger: notify landlord when maintenance request is created
CREATE OR REPLACE FUNCTION public.notify_maintenance_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _landlord_id uuid;
  _tenancy_id uuid;
BEGIN
  SELECT t.landlord_id, t.id INTO _landlord_id, _tenancy_id
  FROM tenancies t WHERE t.id = NEW.tenancy_id;

  PERFORM create_notification(
    _landlord_id,
    'New maintenance request',
    'A tenant submitted: ' || NEW.title,
    '/dashboard/tenancies/' || _tenancy_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_maintenance_created
AFTER INSERT ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_maintenance_created();

-- Trigger: notify tenant when maintenance status changes
CREATE OR REPLACE FUNCTION public.notify_maintenance_updated()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT t.tenant_id INTO _tenant_id
    FROM tenancies t WHERE t.id = NEW.tenancy_id;

    PERFORM create_notification(
      _tenant_id,
      'Maintenance update',
      NEW.title || ' is now ' || REPLACE(NEW.status, '_', ' '),
      '/dashboard/maintenance'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_maintenance_updated
AFTER UPDATE ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_maintenance_updated();

-- Trigger: notify tenant when rent payment is recorded/overdue
CREATE OR REPLACE FUNCTION public.notify_payment_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT t.tenant_id INTO _tenant_id
    FROM tenancies t WHERE t.id = NEW.tenancy_id;

    IF NEW.status = 'overdue' THEN
      PERFORM create_notification(
        _tenant_id,
        'Payment overdue',
        'Your rent payment of £' || NEW.amount || ' is overdue',
        '/dashboard/tenancy'
      );
    ELSIF NEW.status = 'paid' THEN
      PERFORM create_notification(
        _tenant_id,
        'Payment confirmed',
        'Your payment of £' || NEW.amount || ' has been recorded',
        '/dashboard/tenancy'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payment_update
AFTER UPDATE ON public.rent_payments
FOR EACH ROW EXECUTE FUNCTION public.notify_payment_update();

-- Trigger: notify tenant when contract is created/signed
CREATE OR REPLACE FUNCTION public.notify_contract_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
  _landlord_id uuid;
BEGIN
  SELECT t.tenant_id, t.landlord_id INTO _tenant_id, _landlord_id
  FROM tenancies t WHERE t.id = NEW.tenancy_id;

  IF TG_OP = 'INSERT' THEN
    PERFORM create_notification(
      _tenant_id,
      'New contract',
      'A new lease agreement "' || NEW.title || '" requires your review',
      '/dashboard/contracts'
    );
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'tenant_signed' THEN
      PERFORM create_notification(
        _landlord_id,
        'Contract signed by tenant',
        'The tenant has signed "' || NEW.title || '"',
        '/dashboard/tenancies/' || NEW.tenancy_id
      );
    ELSIF NEW.status = 'fully_signed' THEN
      PERFORM create_notification(
        _tenant_id,
        'Contract fully signed',
        '"' || NEW.title || '" is now fully executed',
        '/dashboard/contracts'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contract_insert
AFTER INSERT ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.notify_contract_update();

CREATE TRIGGER trg_contract_update
AFTER UPDATE ON public.contracts
FOR EACH ROW EXECUTE FUNCTION public.notify_contract_update();

-- Trigger: notify on renewal proposals
CREATE OR REPLACE FUNCTION public.notify_renewal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
  _landlord_id uuid;
BEGIN
  SELECT t.tenant_id, t.landlord_id INTO _tenant_id, _landlord_id
  FROM tenancies t WHERE t.id = NEW.tenancy_id;

  IF TG_OP = 'INSERT' THEN
    PERFORM create_notification(
      _tenant_id,
      'Renewal proposal',
      'Your landlord has proposed a lease renewal at £' || NEW.new_rent_pcm || '/mo',
      '/dashboard/policies'
    );
  ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('accepted', 'rejected') THEN
    PERFORM create_notification(
      _landlord_id,
      'Renewal ' || NEW.status,
      'The tenant has ' || NEW.status || ' your renewal proposal',
      '/dashboard/tenancies/' || NEW.tenancy_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_renewal_insert
AFTER INSERT ON public.renewal_proposals
FOR EACH ROW EXECUTE FUNCTION public.notify_renewal();

CREATE TRIGGER trg_renewal_update
AFTER UPDATE ON public.renewal_proposals
FOR EACH ROW EXECUTE FUNCTION public.notify_renewal();

-- Trigger: notify on termination notices
CREATE OR REPLACE FUNCTION public.notify_termination()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
BEGIN
  SELECT t.tenant_id INTO _tenant_id
  FROM tenancies t WHERE t.id = NEW.tenancy_id;

  IF TG_OP = 'INSERT' THEN
    PERFORM create_notification(
      _tenant_id,
      'Termination notice',
      'A ' || REPLACE(NEW.notice_type, '_', ' ') || ' notice has been issued, effective ' || NEW.effective_date,
      '/dashboard/policies'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_termination_insert
AFTER INSERT ON public.termination_notices
FOR EACH ROW EXECUTE FUNCTION public.notify_termination();

-- Trigger: notify on new tenancy messages
CREATE OR REPLACE FUNCTION public.notify_tenancy_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tenant_id uuid;
  _landlord_id uuid;
  _recipient_id uuid;
BEGIN
  SELECT t.tenant_id, t.landlord_id INTO _tenant_id, _landlord_id
  FROM tenancies t WHERE t.id = NEW.tenancy_id;

  IF NEW.sender_id = _tenant_id THEN
    _recipient_id := _landlord_id;
  ELSE
    _recipient_id := _tenant_id;
  END IF;

  PERFORM create_notification(
    _recipient_id,
    'New message',
    LEFT(NEW.content, 80),
    CASE WHEN _recipient_id = _tenant_id THEN '/dashboard/tenancy' ELSE '/dashboard/tenancies/' || NEW.tenancy_id END
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenancy_message
AFTER INSERT ON public.tenancy_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_tenancy_message();