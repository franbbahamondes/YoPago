<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into YoPago. The integration covers client-side event tracking, user identification, server-side capture, exception tracking, and a PostHog ingestion reverse proxy. Here's a summary of every change made:

- **`instrumentation-client.ts`** (new) — Initializes PostHog on the client side using Next.js 15.3+ `instrumentation-client.ts` pattern. Enables automatic exception capture and routes all PostHog traffic through the app's `/ingest` proxy for ad-blocker resilience.
- **`next.config.ts`** — Added `/ingest` rewrites so PostHog requests are proxied through the Next.js server, and `skipTrailingSlashRedirect: true` for PostHog compatibility.
- **`lib/posthog-server.ts`** (new) — Singleton server-side PostHog client (using `posthog-node`) used by API routes to capture server-side events.
- **`.env.local`** — Added `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` environment variables.
- **`components/CreateBillForm.tsx`** — Captures `bill_created` with bill details and participant count; calls `posthog.identify()` with the creator's client ID and email on successful bill creation; adds exception capture on error.
- **`components/JoinDialog.tsx`** — Captures `participant_claimed` (existing slot) and `participant_joined_as_new` (new name entry); calls `posthog.identify()` in both paths; adds exception capture.
- **`components/AddItemForm.tsx`** — Captures `item_added_manually` with item name, price, and quantity; adds exception capture.
- **`components/ReceiptUpload.tsx`** — Captures `receipt_uploaded` (with item count) and `receipt_items_confirmed`; passes `x-posthog-distinct-id` header to the API route for server-client correlation; adds exception capture.
- **`app/b/[slug]/BillClient.tsx`** — Captures `item_assigned`, `item_unassigned`, and `bill_link_copied` in their respective handlers.
- **`components/TipDiscountPanel.tsx`** — Captures `tip_discount_applied` with tip/discount values; adds exception capture.
- **`components/TransferCard.tsx`** — Captures `transfer_data_copied` and `bill_shared_via_whatsapp` on user actions.
- **`app/api/extract-receipt/route.ts`** — Captures server-side `receipt_extraction_completed` (with item count) and `receipt_extraction_failed` (with failure reason); uses `x-posthog-distinct-id` header for client-server identity correlation.

## Events

| Event | Description | File |
|---|---|---|
| `bill_created` | User successfully created a new bill | `components/CreateBillForm.tsx` |
| `participant_claimed` | Participant joined by claiming a pre-registered slot | `components/JoinDialog.tsx` |
| `participant_joined_as_new` | Participant joined as a new person not on the list | `components/JoinDialog.tsx` |
| `item_added_manually` | Owner manually added an item to the bill | `components/AddItemForm.tsx` |
| `receipt_uploaded` | Owner uploaded a receipt photo for AI extraction | `components/ReceiptUpload.tsx` |
| `receipt_items_confirmed` | Owner confirmed the AI-extracted items from a receipt | `components/ReceiptUpload.tsx` |
| `item_assigned` | A participant assigned an item to themselves | `app/b/[slug]/BillClient.tsx` |
| `item_unassigned` | A participant removed an item assignment | `app/b/[slug]/BillClient.tsx` |
| `tip_discount_applied` | Owner applied tip percentage or discount to the bill | `components/TipDiscountPanel.tsx` |
| `transfer_data_copied` | User copied transfer data to clipboard | `components/TransferCard.tsx` |
| `bill_link_copied` | User copied the bill share link | `app/b/[slug]/BillClient.tsx` |
| `bill_shared_via_whatsapp` | User shared the bill link via WhatsApp | `components/TransferCard.tsx` |
| `receipt_extraction_completed` | Server: AI receipt extraction completed successfully | `app/api/extract-receipt/route.ts` |
| `receipt_extraction_failed` | Server: AI receipt extraction failed | `app/api/extract-receipt/route.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/386631/dashboard/1481123
- **Bill creation funnel** (bill created → link copied → item assigned → transfer data copied): https://us.posthog.com/project/386631/insights/H6oWMrS1
- **Bills created over time** (daily trend): https://us.posthog.com/project/386631/insights/tCa4m7LZ
- **Receipt AI vs manual item entry** (weekly bar chart): https://us.posthog.com/project/386631/insights/piSwrnPR
- **Participant join method breakdown** (claimed vs new): https://us.posthog.com/project/386631/insights/bGJ7YZpI
- **Bill sharing methods** (link copy vs WhatsApp): https://us.posthog.com/project/386631/insights/6htiCaN9

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
