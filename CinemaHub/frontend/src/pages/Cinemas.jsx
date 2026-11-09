import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import PublicListFilters from '../components/PublicListFilters';
import PublicCinemaDetails from '../components/PublicCinemaDetails';
import { listFilterOptions, matchesCinemaFilters } from '../utils/publicListFilters';

const Cinemas = () => {
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [facility, setFacility] = useState('');
  const [service, setService] = useState('');
  const [selectedCinema, setSelectedCinema] = useState(null);

  const filteredCinemas = cinemas.filter(cinema => matchesCinemaFilters(cinema, { search, facility, service }));
  const clearFilters = () => { setSearch(''); setFacility(''); setService(''); };

  const api = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
  useEffect(() => {
    const fetchCinemas = async () => {
      try {
        const res = await fetch(`${api}/cinemas`);
        if (res.ok) {
          const data = await res.json();
          // Filter only Active cinemas for public view
          setCinemas(data.filter(c => c.status === 'Active' && !c.deleted));
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchCinemas();
  }, [api]);

  return (
    <div className="pt-24 pb-20 min-h-screen bg-background relative overflow-hidden">
      {/* Background blobs for premium feel */}
      <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -z-10 mix-blend-screen pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] -z-10 mix-blend-screen pointer-events-none"></div>

      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center mb-10 relative z-10">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold text-white mb-4"
          >
            Hệ thống Rạp <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">CinemaHub</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 max-w-2xl mx-auto text-lg"
          >
            Trải nghiệm điện ảnh đỉnh cao với hệ thống phòng chiếu hiện đại và trang thiết bị tân tiến nhất trên toàn quốc.
          </motion.p>
        </div>

        <PublicListFilters label="Bộ lọc rạp phim" search={search} onSearchChange={setSearch} searchLabel="Tìm kiếm theo tên hoặc địa chỉ rạp" searchPlaceholder="Tìm tên rạp, địa chỉ..." onClear={clearFilters} filters={[
          { key: 'facility', label: 'Lọc theo tiện ích', value: facility, onChange: setFacility, options: [{ value: '', label: 'Tất cả tiện ích' }, ...listFilterOptions(cinemas, 'facilities').map(value => ({ value, label: value }))] },
          { key: 'service', label: 'Lọc theo dịch vụ', value: service, onChange: setService, options: [{ value: '', label: 'Tất cả dịch vụ' }, ...listFilterOptions(cinemas, 'services').map(value => ({ value, label: value }))] },
        ]} />

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredCinemas.length === 0 && <div className="col-span-full py-12 text-center text-gray-400"><p className="mb-2 text-xl font-bold">{cinemas.length ? 'Không tìm thấy rạp phù hợp.' : 'Chưa có rạp chiếu nào.'}</p>{cinemas.length > 0 && <p className="text-sm text-gray-500">Vui lòng thử điều kiện khác hoặc xóa bộ lọc.</p>}</div>}
            {filteredCinemas.map((cinema, idx) => (
              <motion.button
                type="button"
                key={cinema.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.04, 0.3) }}
                onClick={() => setSelectedCinema(cinema)}
                aria-label={cinema.name}
                aria-haspopup="dialog"
                className="group flex h-full min-w-0 flex-col rounded-3xl border border-white/10 bg-surface/50 p-5 text-left transition-colors hover:border-primary/50 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-6"
              >
                {(cinema.imageUrl || cinema.imageId) ? (
                  <img src={cinema.imageUrl || `${api}/cinemas/images/${cinema.imageId}`} alt={`Không gian ${cinema.name}`} loading="lazy" className="mb-5 aspect-[1.82/1] w-full rounded-2xl object-cover" />
                ) : (
                  <div className="mb-5 flex aspect-[1.82/1] w-full items-center justify-center rounded-2xl bg-white/5" aria-hidden="true"><MapPin className="h-12 w-12 text-primary/50" /></div>
                )}
                <div className="mb-5 flex w-full items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-orange-500/20 text-primary"><MapPin className="h-6 w-6" /></div>
                  <h2 className="min-w-0 break-words font-display text-xl font-bold leading-snug text-white group-hover:text-primary">{cinema.name}</h2>
                </div>
                <p className="line-clamp-4 break-words text-sm leading-relaxed text-gray-300">{cinema.description || 'Thông tin giới thiệu rạp đang được cập nhật.'}</p>
              </motion.button>
            ))}
          </div>
        )}
      </div>
      {selectedCinema && <PublicCinemaDetails cinema={selectedCinema} api={api} onClose={() => setSelectedCinema(null)} />}
    </div>
  );
};

export default Cinemas;
