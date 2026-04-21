-- ============================================================
-- YoPago — Datos de transferencia en tabla propia
-- ============================================================
-- Separa bills.datos_transferencia (JSONB) en su propia tabla.
-- Columnas nullable: la validación all-or-nothing vive en la app;
-- DB-nullable permite ingerir la data histórica parcial sin perderla.
-- La columna bills.datos_transferencia queda deprecada pero NO se
-- borra en esta migración (se hará en 003 una vez validado).

CREATE TABLE public.transfer_data (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bill_id     UUID        NOT NULL UNIQUE REFERENCES public.bills(id) ON DELETE CASCADE,
  nombre      TEXT,
  rut         TEXT,
  banco       TEXT,
  tipo_cuenta TEXT,
  numero      TEXT,
  email       TEXT,
  alias       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transfer_data_bill ON public.transfer_data(bill_id);

ALTER TABLE public.transfer_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon read transfer"   ON public.transfer_data FOR SELECT USING (true);
CREATE POLICY "anon insert transfer" ON public.transfer_data FOR INSERT WITH CHECK (true);
CREATE POLICY "anon update transfer" ON public.transfer_data FOR UPDATE USING (true);
CREATE POLICY "anon delete transfer" ON public.transfer_data FOR DELETE USING (true);

CREATE TRIGGER transfer_data_updated_at BEFORE UPDATE ON public.transfer_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Migrar datos existentes. NULLIF convierte "" a NULL.
INSERT INTO public.transfer_data (bill_id, nombre, rut, banco, tipo_cuenta, numero, email, alias)
SELECT
  id,
  NULLIF(datos_transferencia->>'nombre', ''),
  NULLIF(datos_transferencia->>'rut', ''),
  NULLIF(datos_transferencia->>'banco', ''),
  NULLIF(datos_transferencia->>'tipo_cuenta', ''),
  NULLIF(datos_transferencia->>'numero', ''),
  NULLIF(datos_transferencia->>'email', ''),
  NULLIF(datos_transferencia->>'alias', '')
FROM public.bills
WHERE datos_transferencia IS NOT NULL
  AND datos_transferencia::text <> '{}'::text;
