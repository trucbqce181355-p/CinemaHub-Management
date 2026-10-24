# Verify Ticket Validity

## Staff workflow

Staff first select a date and the screening being checked at `/admin/checkin`.
Camera, external scanner and manual entry then call `POST /api/tickets/verify`
with JSON `{ "code": "<complete QR, ticket ID or booking reference>",
"expectedShowtimeId": "<selected screening ID>" }`.
Successful verification returns `TICKET_VALID` for an unused ticket or
`TICKET_PARTIALLY_USED` for a partially used ticket, with `valid: true`,
`canCheckIn: true`, `usageStatus` and the ticket. It does not change ticket
status, seat usage or scan metadata.

The staff member selects **Xác nhận check-in** to call
`POST /api/tickets/check-in` with the same code and `expectedShowtimeId`. The server repeats every
validation; the earlier verification is not an admission authorization token.
Only a successful conditional MongoDB update marks the ticket and unused seats
as Used. The legacy `/check-in/{code}` endpoint remains available, but requires
the `expectedShowtimeId` query parameter. Clients must send the screening
context; context-free HTTP admission is no longer supported.

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

## Verify Showtime Matching

All HTTP verification/check-in routes require an explicit expected screening.
The scanned ticket's `showtimeId` must equal that ID, even if another screening
has the same movie, date or start time. The check happens before the used-ticket
warning so a used ticket for another screening still returns a mismatch.

| Condition | HTTP response |
| --- | --- |
| Missing/blank screening context | 400 SHOWTIME_REQUIRED |
| Oversized or malformed screening context | 400 INVALID_SHOWTIME_CONTEXT |
| Ticket belongs to another screening | 409 SHOWTIME_MISMATCH |
| Correct context | Continue existing booking, payment, venue, seat and time checks |

The selector labels the movie, cinema, room, current start time and non-active
status. Its date query includes past and inactive screenings for historical
lookups; this does not make an inactive screening eligible for new admission.
No screening is selected automatically. Camera/manual entry stay disabled
until the staff member chooses a screening.

Changing the date or screening clears the code/result; refreshing the schedule
also invalidates prior verification. Changing screenings stops the old camera
session. Delayed list requests or scan responses cannot restore an old context.
Confirmation retains the context of the verified result and the backend checks
the latest screening status, room, cinema, movie and admission window again.

Successful responses include a separate `showtime` object read from current
screening data. The UI displays its start/end, cinema and room. The historical
`ticket.showtimeStart` is unchanged and is explicitly labeled as the issued
snapshot when the schedule differs. For example, a change from 19:10 to 19:25
displays 19:25 as the current time and 19:10 only as the old time on the ticket.
If a previously used ticket's screening has since been deleted, the used-ticket
response can have `showtime: null`; the UI labels the remaining time as historical.

Manual acceptance checks:

1. Select screening A, then submit a valid ticket for screening B: expect a
   mismatch with no confirmation button and no ticket consumption.
2. Select B and verify the same ticket: expect the normal valid/partial result.
3. Switch screenings before confirming: the old confirmation must disappear.
4. Verify a rescheduled ticket: current schedule and issued snapshot must be
   separately labeled; verification must leave the ticket document unchanged.
5. Cancel/reschedule the screening after verification: confirmation must repeat
   validation and reject an unavailable or out-of-window screening.

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

Previous Check Used Ticket regression verification: 86 backend tests and 7 frontend
unit tests passed. Seven targeted browser cases also passed for the used
warning, partial-seat display, remaining-seat confirmation, newest scan/gate,
rescan blocking, inconsistent-data rejection, metadata fallback and seat-order
independence (some cases cover multiple assertions). The 12 camera/scanner
cases above were rerun successfully against the updated UI, for 19 browser
cases total. Browser API responses and camera input were simulated; backend
integration tests exercised the real controller/service with isolated MongoDB.

Verify Showtime Matching verification: 97 backend tests and 7 frontend tests
passed, with successful production build and focused TicketCheckIn lint. The
backend tests include mandatory context, both JSON routes, legacy-route bypass
prevention, two screenings of the same movie, rescheduling without snapshot
rewrites, confirmation revalidation and independent concurrent gate claims.
Browser regressions passed 31 cases: 11 matching/list/context cases, 13 camera
and external scanner cases, and 7 used/partial-ticket cases. Browser APIs and
camera input were simulated; the ZXing decoder processed a generated QR video
stream. Physical scanning hardware and a live payment were not exercised.

## Confirmation recovery

Successful confirmation returns the showtime snapshot validated before the atomic
ticket write. It performs no additional database read after committing admission.
A network interruption can still lose the write reply even when MongoDB saved it.

The staff UI handles confirmation timeouts, network errors, HTTP 5xx and malformed
success responses by calling `/tickets/verify` once with the same code and screening.
It never automatically repeats the confirmation write. A consistent `USED` /
`ALREADY_CHECKED_IN` result displays the saved usage and scan history, without claiming
which request or staff member performed that admission.

If verification fails or does not establish full usage, the UI displays
`Chưa xác định kết quả check-in`, retains the ticket details and offers
`Kiểm tra lại trạng thái`. This button only verifies. A currently unused or partially
used result does not establish that the original confirmation failed: that request
may still be processing. Changing the screening clears the old recovery action.
Each request has a 15-second deadline; automatic recovery may take another 15 seconds.

Confirmation regression verification: 99 backend tests, 18 frontend unit tests,
production build and focused lint passed. Backend regressions inject faults after
real MongoDB writes in isolated test databases. Browser regressions passed 38 cases
(7 confirmation recovery, 11 showtime matching, 13 camera/scanner, 7 used/partial
ticket). Browser API responses and camera input were simulated; the camera tests
use the real ZXing decoder. Physical hardware and a live payment were not tested.
