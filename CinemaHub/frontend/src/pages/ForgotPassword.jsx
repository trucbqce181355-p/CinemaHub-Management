import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleForgot = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    setLoading(true);

    try {
      const res = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        navigate(`/verify-reset-otp?email=${encodeURIComponent(email)}`);
      } else {
        setMessage({ text: data.message || 'Có lỗi xảy ra', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: 'Lỗi kết nối đến máy chủ', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-50"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md glass-panel p-8 rounded-3xl relative z-10"
      >
        <div className="mb-6">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Quay lại đăng nhập
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Quên mật khẩu?</h1>
          <p className="text-gray-400 text-sm">Đừng lo lắng! Hãy nhập email của bạn và chúng tôi sẽ gửi liên kết để đặt lại mật khẩu.</p>
        </div>

        {message.text && (
          <div className={`mb-6 p-4 rounded-xl text-sm text-center ${message.type === 'error' ? 'bg-red-500/10 border border-red-500/50 text-red-500' : 'bg-green-500/10 border border-green-500/50 text-green-500'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleForgot} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">Email đã đăng ký</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
                <Mail className="w-5 h-5" />
              </div>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                placeholder="Nhập email của bạn"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2 group mt-8 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang gửi...' : 'Gửi liên kết'}
            {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
