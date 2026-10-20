# Ticket QR check-in

The check-in page supports a browser camera, an external scanner that types a code and Enter, and manual entry. Camera decoding uses the locally bundled `@zxing/browser` package. The camera starts only after the employee selects **Bật camera**; its media tracks are stopped on switching modes, stopping the camera or leaving the page. HTTPS or localhost is required for browser camera access.

Camera reader API reference: [ZXing browser documentation](https://github.com/zxing-js/browser).

## API and codes

`POST /api/tickets/check-in`, authenticated as Staff, Manager or Admin:

```json
{"code":"CINEMAHUB|CH-261020-ABCD|<full stored random token>"}
```

Accepted inputs are the exact `tickets.qrCode` payload (online or counter), a real ticket document ID, or a booking reference such as `CH-261020-ABCD`. QR payloads are matched in full; an incomplete or altered QR is never resolved by extracting its booking reference. The old `POST /api/tickets/check-in/{code}` endpoint remains available for existing clients.

Success returns `code=CHECKED_IN` and the updated ticket. A repeat scan returns HTTP 409, `code=ALREADY_CHECKED_IN` and the existing ticket/scan metadata. Other failures include `INVALID_CODE`, `TICKET_NOT_FOUND`, `TICKET_NOT_PAID`, `INVALID_TICKET`, `INVALID_SHOWTIME`, `SHOWTIME_UNAVAILABLE`, `CHECK_IN_NOT_OPEN`, `CHECK_IN_CLOSED` and `TICKET_CHANGED`.

## Admission window and persistence

Check-in opens **30 minutes before the canonical showtime start** and closes **at the canonical showtime end**. At the exact end time, admission is closed. An inactive/cancelled or missing showtime, missing times, and tickets with no valid seats are rejected. Ticket snapshot times do not override the current showtime record.

- `TICKET_CHECK_IN_EARLY_MINUTES` changes the early admission window (default 30).
- `TICKET_CHECK_IN_GATE` supplies the stored gate label (default `Main Gate 1`).

One conditional MongoDB `findAndModify` changes a Paid ticket with Unused seats to Used, marks the remaining unused seats and stores scan metadata. Concurrent gates cannot both claim the same ticket. Existing metadata on already-used seats is preserved for partial legacy tickets. Legacy tickets whose seats are already Used but whose top-level status is still Paid are reported as duplicates.

## Validation

Run `mvnw.cmd test` from `backend` with local MongoDB available at `127.0.0.1:27017`. `TicketCheckInIntegrationTest` creates a unique `ticket_scan_test_<UUID>` database and drops only that database after each case; it does not modify the normal `cinemahub` database. It covers stored online/counter QR codes, manual lookup, tampering, concurrent gates, duplicate scans, time boundaries, cancelled/missing showtimes and legacy/malformed seat records. `TicketHttpSecurityTest` covers request validation and endpoint authorization.

From `frontend`, run `npm.cmd test` and `npm.cmd run build`. Browser checks should include camera permission allowed/denied, unavailable cameras, actual QR decoding, duplicate-frame suppression, camera shutdown, external scanner Enter, manual entry and switching modes. A physical camera/scanner still needs acceptance testing on the intended deployment devices.
