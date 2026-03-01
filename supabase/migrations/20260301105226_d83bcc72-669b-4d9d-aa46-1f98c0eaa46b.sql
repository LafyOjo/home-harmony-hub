
-- Admin SELECT policies for analytics dashboard

-- user_roles: admins can view all roles
CREATE POLICY "Admins view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- listings: admins can view all listings (including inactive)
CREATE POLICY "Admins view all listings"
ON public.listings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- applications: admins can view all
CREATE POLICY "Admins view all applications"
ON public.applications FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- tenancies: admins can view all
CREATE POLICY "Admins view all tenancies"
ON public.tenancies FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- rent_payments: admins can view all
CREATE POLICY "Admins view all payments"
ON public.rent_payments FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- maintenance_requests: admins can view all
CREATE POLICY "Admins view all maintenance"
ON public.maintenance_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- complaints: admins can view all
CREATE POLICY "Admins view all complaints"
ON public.complaints FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
