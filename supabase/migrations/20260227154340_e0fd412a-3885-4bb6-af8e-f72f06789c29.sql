
-- Tighten: drop the overly permissive update policy and replace with a narrower one
DROP POLICY IF EXISTS "Anyone can update reference status by token" ON public.reference_requests;

-- Only allow updating status field (enforced in app code, but restrict to non-expired tokens)
CREATE POLICY "Update reference status for valid tokens"
ON public.reference_requests FOR UPDATE
USING (expires_at IS NULL OR expires_at > now());

-- Tighten: reference_responses insert only if the request exists and is not expired
DROP POLICY IF EXISTS "Anyone can submit reference response" ON public.reference_responses;

CREATE POLICY "Submit reference for valid request"
ON public.reference_responses FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM reference_requests rr
    WHERE rr.id = reference_responses.request_id
      AND rr.status != 'completed'
      AND (rr.expires_at IS NULL OR rr.expires_at > now())
  )
);
