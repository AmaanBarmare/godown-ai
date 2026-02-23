
-- Email mappings table
CREATE TABLE public.email_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company TEXT NOT NULL,
  primary_email TEXT NOT NULL,
  cc TEXT DEFAULT '',
  bcc TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read access on email_mappings" ON public.email_mappings FOR SELECT USING (true);
CREATE POLICY "Allow all insert on email_mappings" ON public.email_mappings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on email_mappings" ON public.email_mappings FOR UPDATE USING (true);
CREATE POLICY "Allow all delete on email_mappings" ON public.email_mappings FOR DELETE USING (true);

-- Invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company TEXT NOT NULL,
  amount TEXT NOT NULL,
  invoice_date TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  cc TEXT DEFAULT '',
  bcc TEXT DEFAULT '',
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read access on invoices" ON public.invoices FOR SELECT USING (true);
CREATE POLICY "Allow all insert on invoices" ON public.invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update on invoices" ON public.invoices FOR UPDATE USING (true);

-- Seed initial email mappings
INSERT INTO public.email_mappings (company, primary_email, cc, bcc) VALUES
  ('Apex Logistics', 'billing@apexlogistics.com', 'manager@apexlogistics.com', ''),
  ('BlueLine Storage', 'accounts@bluelinestorage.com', '', 'admin@bluelinestorage.com'),
  ('CargoHub Inc.', 'finance@cargohub.com', 'ops@cargohub.com', ''),
  ('Delta Freight', 'pay@deltafreight.com', '', ''),
  ('EastPort Shipping', 'billing@eastport.com', 'cfo@eastport.com', '');

-- Storage bucket for invoice files
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false);

CREATE POLICY "Allow all upload to invoices bucket" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'invoices');
CREATE POLICY "Allow all read from invoices bucket" ON storage.objects FOR SELECT USING (bucket_id = 'invoices');

-- Enable realtime for invoices
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_email_mappings_updated_at
  BEFORE UPDATE ON public.email_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
