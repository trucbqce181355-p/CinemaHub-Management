// Never fabricate a shortened CINEMAHUB payload: it omits the stored QR token.
// Legacy tickets without a QR may use their real document ID, which check-in accepts.
export const getTicketQrValue = ticket => ticket?.qrCode || ticket?.id || ticket?._id || '';
