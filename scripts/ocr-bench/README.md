# OCR Benchmark

Mide **tiempo** (latencia del endpoint) y **eficacia** (precision/recall contra ground truth) del flujo `/api/extract-receipt`.

## Cómo correr

```bash
# Terminal 1 — dev server
npm run dev

# Terminal 2 — benchmark
npm run bench:ocr                                # 1 repetición contra localhost:3002
npm run bench:ocr -- --repeats=3                 # 3 repeticiones por fixture (para p95)
npm run bench:ocr -- --endpoint=https://yo-pago.vercel.app   # contra prod
```

## Agregar un fixture

1. Pon la imagen en `fixtures/<nombre>.jpg` (o `.png`). El nombre puede ser cualquiera.
2. Crea `fixtures/<nombre>.json` con el ground truth:

```json
{
  "notes": "Sushi Tokyo, foto nítida de día",
  "items": [
    { "name": "California Roll", "price": 8990, "quantity": 1 },
    { "name": "Bebida 500ml", "price": 2500, "quantity": 2 }
  ]
}
```

- `price` = precio unitario en CLP (entero).
- `quantity` default 1 si no se incluye.
- Ignora propinas, cargos por servicio y totales — solo ítems consumidos.

## Métricas que reporta

Por fixture:
- `ms(p50)` / `ms(p95)` — latencia del endpoint
- `truth` / `det` — ítems reales vs detectados
- `match` = `matched/missed/extra`
- `recall` = matched / truth (cuántos reales detectó)
- `precision` = matched / detected (cuántos detectados son correctos)
- `Δtotal%` — diferencia porcentual de la suma total

Global:
- p50/p95 de latencia
- recall y precision promedio
- `pass_rate` = % de boletas con recall ≥ 0.9

Cada corrida guarda un snapshot JSON en `results/` para comparar en el tiempo.

## Matching

Los nombres se normalizan (lowercase, sin acentos, sin signos) y se comparan por:
- Igualdad exacta
- Substring (uno contiene al otro)
- Distancia Levenshtein ≤ max(2, 20% del largo)

El precio debe estar dentro de ±5% (o ±50 CLP, lo que sea mayor).

Si el matching es muy estricto/laxo para tu caso, ajustar `itemsMatch()` en `run.ts`.
