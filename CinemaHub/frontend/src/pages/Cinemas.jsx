import { useState, useEffect } from 'react';
import { MapPin, Phone, Mail, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

const Cinemas = () => {
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCinemas = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/cinemas');
        if (res.ok) {
          const data = await res.json();
          // Filter only Active cinemas for public view
          setCinemas(data.filter(c => c.status === 'Active'));
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchCinemas();
  }, []);

  return (
    <div className="pt-24 pb-20 min-h-screen bg-background relative overflow-hidden">
      {/* Background blobs for premium feel */}
      <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -z-10 mix-blend-screen pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] -z-10 mix-blend-screen pointer-events-none"></div>

      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center mb-16 relative z-10">
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

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {cinemas.length === 0 && <p className="col-span-full text-center text-gray-400">Chưa có rạp chiếu nào.</p>}
            {cinemas.map((cinema, idx) => (
              <motion.div 
                key={cinema.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group relative bg-surface/50 backdrop-blur-xl p-8 rounded-3xl border border-white/10 hover:border-primary/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(229,9,20,0.3)] overflow-hidden"
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-orange-500/20 flex items-center justify-center text-primary group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(229,9,20,0.4)] transition-all duration-500">
                      <MapPin className="w-7 h-7" />
                    </div>
                    <h3 className="text-2xl font-display font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all">{cinema.name}</h3>
                  </div>

                  <div className="space-y-4 text-gray-300">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                      <MapPin className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                      <p className="text-sm leading-relaxed">{cinema.address}</p>
                    </div>
                    
                    {cinema.contactPhone && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                        <Phone className="w-5 h-5 text-gray-400 shrink-0" />
                        <p className="text-sm font-medium tracking-wide">{cinema.contactPhone}</p>
                      </div>
                    )}

                    {cinema.contactEmail && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                        <Mail className="w-5 h-5 text-gray-400 shrink-0" />
                        <p className="text-sm">{cinema.contactEmail}</p>
                      </div>
                    )}
                  </div>

                  {cinema.facilities && cinema.facilities.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-white/10">
                      <h4 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-widest">Tiện ích bao gồm</h4>
                      <div className="flex flex-wrap gap-2">
                        {cinema.facilities.map((fac, i) => (
                          <span key={i} className="flex items-center gap-1.5 text-xs bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-gray-300 group-hover:border-white/20 transition-colors">
                            <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                            {fac}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Cinemas;
