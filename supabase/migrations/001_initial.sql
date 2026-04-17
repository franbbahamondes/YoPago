-- ============================================================
-- YoPago — Schema inicial
-- ============================================================

CREATE TABLE public.bills (
  id                      UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug                    TEXT        NOT NULL UNIQUE,
  nombre                  TEXT        NOT NULL,
  creador_nombre          TEXT,
  datos_transferencia     JSONB,
  imagen_url              TEXT,
  tip_percent             NUMERIC     NOT NULL DEFAULT 0,
  global_discount_amount  NUMERIC     NOT NULL DEFAULT 0,
  global_discount_percent NUMERIC     NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.participants (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id    UUID        NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  nombre     TEXT        NOT NULL,
  client_id  UUID        NOT NULL,
  paid       BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_participants_bill ON public.participants(bill_id);

CREATE TABLE public.items (
  id                   UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id              UUID        NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  descripcion          TEXT        NOT NULL,
  precio               NUMERIC     NOT NULL DEFAULT 0,
  cantidad             INTEGER     NOT NULL DEFAULT 1,
  descuento_monto      NUMERIC     NOT NULL DEFAULT 0,
  descuento_porcentaje NUMERIC     NOT NULL DEFAULT 0,
  orden                INTEGER     NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_items_bill ON public.items(bill_id);

CREATE TABLE public.item_assignments (
  item_id        UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, participant_id)
);
CREATE INDEX idx_assignments_participant ON public.item_assignments(participant_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER bills_updated_at BEFORE UPDATE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS: acceso anónimo (seguridad por oscuridad del slug)
ALTER TABLE public.bills             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_assignments  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read bills"    ON public.bills FOR SELECT USING (true);
CREATE POLICY "anon insert bills"  ON public.bills FOR INSERT WITH CHECK (true);
CREATE POLICY "anon update bills"  ON public.bills FOR UPDATE USING (true);
CREATE POLICY "anon delete bills"  ON public.bills FOR DELETE USING (true);

CREATE POLICY "anon read participants"   ON public.participants FOR SELECT USING (true);
CREATE POLICY "anon insert participants" ON public.participants FOR INSERT WITH CHECK (true);
CREATE POLICY "anon update participants" ON public.participants FOR UPDATE USING (true);
CREATE POLICY "anon delete participants" ON public.participants FOR DELETE USING (true);

CREATE POLICY "anon read items"    ON public.items FOR SELECT USING (true);
CREATE POLICY "anon insert items"  ON public.items FOR INSERT WITH CHECK (true);
CREATE POLICY "anon update items"  ON public.items FOR UPDATE USING (true);
CREATE POLICY "anon delete items"  ON public.items FOR DELETE USING (true);

CREATE POLICY "anon read assignments"   ON public.item_assignments FOR SELECT USING (true);
CREATE POLICY "anon insert assignments" ON public.item_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "anon delete assignments" ON public.item_assignments FOR DELETE USING (true);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true);

CREATE POLICY "public read receipts"  ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "anon upload receipts"  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts');
CREATE POLICY "anon delete receipts"  ON storage.objects FOR DELETE USING (bucket_id = 'receipts');
