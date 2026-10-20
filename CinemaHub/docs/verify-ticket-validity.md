# Verify Ticket Validity

## Staff workflow

Camera, external scanner and manual entry first call `POST /api/tickets/verify`
with JSON `{ "code": "<complete QR, ticket ID or booking reference>" }`.
Successful verification returns `TICKET_VALID` for an unused ticket or
`TICKET_PARTIALLY_USED` for a partially used ticket, with `valid: true`,
`canCheckIn: true`, `usageStatus` and the ticket. It does not change ticket
status, seat usage or scan metadata.

The staff member selects **Xác nhận check-in** to call
`POST /api/tickets/check-in` with the same code. The server repeats every
validation; the earlier verification is not an admission authorization token.
Only a successful conditional MongoDB update marks the ticket and unused seats
as Used. The legacy `/check-in/{code}` endpoint remains available.

Both endpoints require Staff, Manager or Admin. Check-in opens 30 minutes before
the current showtime start and closes exactly at its end, including screenings
whose cached ticket start time is outdated.

## Validation rules

- Resolve the entire QR exactly. Duplicate QR/reference matches return HTTP 409
  `AMBIGUOUS_CODE`, rather than selecting an arbitrary ticket or raising a 500.
- Require a Paid ticket with at least one unused seat and a CONFIRMED booking.
  Ticket ID, booking link/reference, showtime, movie, room and cinema must agree.
- Online bookings require SUCCESS payment, matching VND amount and transaction
  ID, with no outstanding reconciliation flag.
- Counter bookings require a staff-confirmed CASH, CARD or TRANSFER payment.
  VNPAY must use the online signed payment workflow; selecting its name cannot
  directly issue a paid counter ticket.
- Require an active cinema, active room belonging to that cinema, and real,
  active room seats. Ticket and booking seat sets must match without duplicates.
- Reject cancelled/inactive/missing showtimes and admission outside the window.
- Check-in rechecks the time after dependency validation and retains the atomic
  ticket claim to prevent two scans from consuming one ticket.

Common rejection codes include `BOOKING_UNAVAILABLE`, `PAYMENT_NOT_CONFIRMED`,
`INVALID_TICKET`, `INVALID_SEATS`, `VENUE_UNAVAILABLE`, `SHOWTIME_UNAVAILABLE`,
`CHECK_IN_NOT_OPEN`, `CHECK_IN_CLOSED` and `ALREADY_CHECKED_IN`.
Business rejections return `valid: false` and a staff-facing explanation.

## Existing records

Legacy four-character booking-reference suffixes are still accepted. New
references use a full UUID suffix. No existing references are automatically
renamed, and no unique index is silently installed over potentially duplicated
historical data. Ambiguous references need data review; the exact QR or ticket
ID can identify an otherwise valid ticket.

Old counter tickets without `bookingId` can resolve their booking through its
explicit `ticketId`. Orphaned/inconsistent records are rejected; verification
does not repair payment or seat data automatically.

## Check Used Ticket

Admission and booking summaries share the read-only `TicketUsage` rules:

| Ticket and seat data | Usage state | Result |
| --- | --- | --- |
| Paid, every seat Unused | UNUSED | Verify, then explicitly confirm check-in |
| Paid, a mix of Used and Unused | PARTIALLY_USED | Show each seat; confirm only remaining seats |
| Paid or Used, every seat Used | USED | ALREADY_CHECKED_IN; cannot consume again |
| Used with any Unused seat; empty, duplicate or malformed seats | INVALID | Reject the inconsistent record |
| Missing/cancelled booking or mismatched booking, showtime, room, cinema or seat links | INVALID | Reject; never report a trusted used ticket |

Persisted status values remain case-sensitive (`Used`/`Unused`). Unknown values
such as `used` are invalid in both APIs; checking a ticket does not silently
normalize historical records or overwrite their scan history. Malformed ticket
structure and booking-link mismatches return `INVALID_TICKET`; unavailable real
room seats continue to return `INVALID_SEATS`.

`getBookingStatus` retains `isCheckedIn` and adds `isPartiallyCheckedIn` plus
`usageStatus`. Only the fully USED state reports `isCheckedIn: true`. Historical
used tickets with consistent booking links still return ALREADY_CHECKED_IN
when the showtime has ended; this does not reopen admission for remaining seats.

The staff result displays Used/Unused for each seat, its recorded scan time
and gate, and the latest valid scan across Used seats by timestamp. Seat order
does not determine the latest scan. Finishing a partial ticket preserves the
old metadata and stamps only the remaining seats. Missing/invalid metadata
shows an explicit fallback rather than an invalid date.

The admission window, full QR matching, authorization and atomic MongoDB ticket
claim continue to apply to both unused and partially used tickets.

## Concurrency and deployment boundary

The current project runs one Spring backend with standalone MongoDB.
`AdmissionCoordinator` orders verification/check-in against booking issuance,
cancellation, seat edits and showtime/room/cinema management in that process.
A cancellation which completes first makes check-in fail; a check-in which
claims the ticket first completes before cancellation can proceed.

This coordination is process-local. Multiple backend instances or database
changes made outside these services require shared coordination/transactions
and an appropriate MongoDB topology before the same cross-document guarantee
can be claimed. The atomic ticket claim itself still prevents duplicate ticket
consumption across instances.

## Verification

Run `./mvnw.cmd test` from `backend` with local MongoDB running. Integration tests
use isolated `ticket_scan_test_*` and payment test databases and drop their own
fixtures. User/data seeders and the payment scheduler are disabled in HTTP tests.

Coverage includes read-only verification, authenticated API access, exact QR
lookup, duplicate codes, missing/cancelled bookings, payment state/amount,
venue/seat consistency, counter issuance, legacy records, concurrent gates,
showtime cancellation, checked-in reporting and admission-time boundaries.

Frontend checks: `npm test`, `npm run build`, and focused lint on
`src/pages/admin/TicketCheckIn.jsx`. The existing Booking page has unrelated
lint warnings; production bundling also retains its existing chunk-size warning.

Browser regression used a real ZXing decoder on a generated QR video stream
with stubbed API responses: 12 checks passed for camera permission, full QR/auth
payload, non-consuming verification, explicit confirmation, repeated frames,
duplicate warning, scanner Enter, double-submit protection, stale verification,
network recovery and camera cleanup. Physical camera/scanner hardware and a
live VNPay checkout were not exercised by this test.

Check Used Ticket regression verification: 86 backend tests and 7 frontend
unit tests passed. Seven targeted browser cases also passed for the used
warning, partial-seat display, remaining-seat confirmation, newest scan/gate,
rescan blocking, inconsistent-data rejection, metadata fallback and seat-order
independence (some cases cover multiple assertions). The 12 camera/scanner
cases above were rerun successfully against the updated UI, for 19 browser
cases total. Browser API responses and camera input were simulated; backend
integration tests exercised the real controller/service with isolated MongoDB.
