export function isUpcomingPricingShowtime(showtime, now = Date.now()) {
  return Boolean(showtime?.id) && String(showtime.status).trim().toLowerCase() === 'active'
    && Number.isFinite(Date.parse(showtime.startTime)) && Date.parse(showtime.startTime) > now;
}

export function filterPricingShowtimes(showtimes, { cinema = '', movie = '', date = '', search = '', now = Date.now() } = {}) {
  const query = search.trim().toLocaleLowerCase('vi-VN');
  return showtimes.filter(showtime => isUpcomingPricingShowtime(showtime, now)
    && (!cinema || showtime.cinemaId === cinema) && (!movie || showtime.movieId === movie)
    && (!date || showtime.startTime?.slice(0, 10) === date)
    && [showtime.movieTitle, showtime.cinemaName, showtime.roomName].join(' ').toLocaleLowerCase('vi-VN').includes(query))
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime));
}
