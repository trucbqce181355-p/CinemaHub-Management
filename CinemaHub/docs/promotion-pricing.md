# Promotion programs and dynamic pricing

## Implemented behavior

- Manager and Admin can manage promotions and pricing rules. Customer and Staff cannot call management APIs. The active public promotion list is available without login; it excludes personal redeemed vouchers and internal document fields.
- Create uses a request DTO, generates the document ID on the server and returns 201. Codes are trimmed, uppercased and limited to letters, digits, underscores and hyphens (64 characters).
- Update and disable use the returned `version`. Concurrent/stale edits return 409. Imported documents without a version are supported. Disable retains the document and booking history.
- Active codes and codes referenced by bookings cannot be renamed. Disable an unused code before renaming it.
- Discounts must be finite and nonnegative. Percentages are 0–100. Fixed discounts and numeric conditions are whole VND. Start must precede end; the validity interval includes start and excludes end.
- Supported conditions are `minSpend`, `maxDiscount`, `usageLimit`, `perUserLimit`, and membership-generated `redeemedByUserId` / `rewardVoucherId`. Unknown conditions are rejected instead of silently ignored.
- Online quotes, online promo application and counter sales share the same discount rules. Applying a promo uses the saved booking subtotal, checks the owner and unexpired hold, and refuses changes after payment initialization.
- Active pending holds reserve promotion usage; confirmed bookings consume it. Cancelled and expired holds do not. Reapplying to the same booking does not consume another slot. Personal vouchers require the actual customer account; the counter operator is not treated as the customer.
- Payment initiation rechecks the applied promo. If eligibility or its computed discount changed, the customer must reapply or remove it. A pending payment retains its original amount. VNPAY requires a positive whole-VND total; zero-total/free online orders are not supported by the existing gateway checkout and are rejected at promo application before saving an unpayable total. Counter complimentary orders remain possible.
- Online checkout displays the saved hold price. Promo changes with an interrupted response are recovered by a read of that booking, never by replaying the write. If recovery fails, checkout stays blocked until a read succeeds.

## Dynamic pricing policy

The movie's STANDARD/VIP/COUPLE price plus its 3D/IMAX surcharge is the base. All matching active rules add their fixed VND adjustments; the sum is order-independent. The final per-seat price is rounded HALF_UP to whole VND and bounded to **1,000–2,000,000 VND**. Percentage discounts are also rounded HALF_UP. A held online booking keeps its saved price for its hold lifetime.

| Trigger | Parameters | Matching behavior |
| --- | --- | --- |
| `WEEKEND` | None | Showtime is Saturday or Sunday. |
| `HOLIDAY` | `dates: ["2030-01-05"]` | Showtime's local calendar date is listed. |
| `LATE_NIGHT` | `startHour: 22` (default 22) | Showtime begins at/after that hour. |
| `SNEAK_SHOW` | `showtimeIds: ["id"]` | Showtime ID is explicitly listed. |

Legacy Vietnamese trigger names are recognized. Holiday and sneak rules need explicit dates/IDs; invalid existing rules produce an error rather than an invented price. Adjustments are whole VND in the range -1,000,000 to +1,000,000. Backend local time must be configured for the cinema's timezone (Asia/Ho_Chi_Minh for this project).

## Existing database considerations

Management ensures the case-insensitive unique MongoDB index `promotion_code_unique_ci` before the first create/update. Existing duplicate codes or codes with surrounding whitespace block saving with a descriptive 409. **No existing documents are automatically renamed or deleted.** Back up and review duplicates and their booking references before cleaning them.

Promotion quota admission is serialized through the existing `AdmissionCoordinator` in this backend process. Its concurrency guarantee applies to a **single backend instance**. Multiple backend instances or external writers require a distributed reservation/transaction design before deployment; MongoDB standalone does not make a count-plus-booking update globally atomic. Promotion code uniqueness and document version guards are enforced by MongoDB across instances.

## Manual UI and Network checks

1. Log in as Manager/Admin; open `/admin/promotions`. Create `QA10`, 10%, from yesterday to tomorrow, minimum spend 100,000. Expect POST 201 and a refreshed list. A duplicate/negative/over-100%/reversed-date submission must be rejected without creating another document.
2. Open the same row in two tabs. Save in one, then save the stale form in the other. Expect 409; reload before editing again. Disable must retain the row with `Disabled` status. Failed requests must show an error.
3. As Guest, open `/promotions` and the navbar/footer links. Only active public promotions appear; no private redeemed voucher is exposed. An empty result and a failed request have distinct messages and retry behavior.
4. As Customer or Staff, call POST/PUT/DELETE `/api/promotions` and `/api/pricing-rules` directly. Expect 403; no document changes. Customer must also get 403 on `/api/bookings/counter-price`.
5. Select valid seats and hold them. Apply `QA10`; check the booking's stored subtotal/discount/total, not just the displayed amount. The client-supplied subtotal must not change the server price. Remove the code and verify both the UI and saved booking return to the original subtotal.
6. Apply a code whose minimum spend exceeds the order value. Quote, online apply and counter sale must all reject it. Personal redeemed vouchers must reject another customer account. Create a `usageLimit: 1` promo and apply it to two different holds: only one succeeds; clearing/cancelling/expiring that hold releases the slot.
7. Add WEEKEND +20,000 and LATE_NIGHT -10,000. On a weekend 23:00 showtime, each seat gains a net +10,000. Compare seat availability, quote, new online hold and counter receipt. Disable a rule and verify **new** quotes change while an existing hold price stays fixed.
8. Change seats rapidly with Network throttling. A late older response must not replace the current price. A failed quote blocks proceeding. For an online promo write, interrupt its response: only a read of the booking may follow; unresolved recovery must block payment and expose the read-only retry button.
9. Disable/change a promotion after applying it but before creating a VNPAY payment. Initiation must reject stale eligibility/discount and request reapplication/removal. Existing pending payments must retain their original amount.

## Automated validation

`PromotionHttpSecurityTest` exercises real Spring Security and MVC bindings. `PromotionPricingIntegrationTest` uses a unique disposable `promotion_test_*` MongoDB database and tests persistence, unique indexes, optimistic conflicts, pricing, promo reservations and counter-sale consistency. Existing ticket/payment suites remain regression checks. Frontend `promotionPricing.test.js` tests successful, rejected and interrupted writes plus recovery without duplicate mutation.
