export function formatScanTime(value) {
  if (typeof value !== 'string' || !value.trim()) return 'Chưa có thông tin';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('vi-VN') : 'Chưa có thông tin';
}

export function getTicketScanDetails(ticket) {
  const seats = Array.isArray(ticket?.seats) ? ticket.seats.filter(Boolean) : [];
  let latestScan = null;
  for (const seat of seats) {
    if (seat.usageStatus !== 'Used') continue;
    const scan = seat.scanMetadata;
    if (typeof scan?.scannedAt !== 'string' || !scan.scannedAt.trim()) continue;
    const timestamp = new Date(scan.scannedAt).getTime();
    if (Number.isFinite(timestamp) && (!latestScan || timestamp > latestScan.timestamp)) {
      latestScan = { ...scan, timestamp };
    }
  }
  return { seats, latestScan };
}
