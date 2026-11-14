
import { useMemo, useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  Send,
  Sparkles,
  UserRound,
  RotateCcw,
  Film,
  Clock,
  Star,
  LoaderCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://127.0.0.1:5000/api';

const starters = [
  'Gợi ý phim phù hợp với sở thích của tôi',
  'Tôi muốn xem phim hành động',
  'Có phim kinh dị nào đang chiếu không?',
  'Gợi ý phim mới sắp chiếu',
];

function MovieResult({ item }) {
  const movie = item.movie || {};
  const id = movie.id || movie._id;

  return (
    <article className="flex gap-3 rounded-xl border border-white/10 bg-black/25 p-3">
      <Link
        to={id ? `/movie/${id}` : '/movies'}
        className="w-20 sm:w-24 shrink-0 aspect-[2/3] overflow-hidden rounded-lg bg-white/5"
      >
        <img
          src={movie.posterUrl || '/images/default-poster.jpg'}
          alt={movie.title || 'Poster phim'}
          className="h-full w-full object-cover"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          to={id ? `/movie/${id}` : '/movies'}
          className="font-bold text-white hover:text-primary line-clamp-2"
        >
          {movie.title || 'Phim CinemaHub'}
        </Link>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
          {movie.duration ? (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} />
              {movie.duration} phút
            </span>
          ) : null}

          {movie.averageRating != null ? (
            <span className="inline-flex items-center gap-1">
              <Star size={12} className="text-amber-400" />
              {Number(movie.averageRating).toFixed(1)}
            </span>
          ) : null}

          {movie.ageRating ? <span>{movie.ageRating}</span> : null}
        </div>

        {movie.genres?.length > 0 && (
          <p className="mt-2 text-xs text-gray-400">
            {movie.genres.join(' · ')}
          </p>
        )}

        {item.reasons?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.reasons.map((reason, index) => (
              <span
                key={`${reason}-${index}`}
                className="rounded-full bg-primary/10 px-2 py-1 text-[11px] text-red-200"
              >
                {reason}
              </span>
            ))}
          </div>
        )}

        <Link
          to={id ? `/movie/${id}` : '/movies'}
          className="mt-3 inline-flex text-xs font-semibold text-primary hover:text-red-300"
        >
          Xem chi tiết phim →
        </Link>
      </div>
    </article>
  );
}

export default function MovieAssistant() {
  const { user } = useAuth();

  const [messages, setMessages] = useState([{
    role: 'assistant',
    content:
      'Xin chào! Mình là trợ lý phim của CinemaHub. Bạn có thể cho mình biết thể loại, diễn viên, đạo diễn hoặc trạng thái phim bạn muốn tìm nhé.',
    recommendations: [],
  }]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const canSend = useMemo(
    () => input.trim().length > 0 && !loading,
    [input, loading]
  );

  const sendMessage = async (text = input) => {
    const message = text.trim();

    if (!message || loading) return;

    if (!user?.token) {
      setMessages(prev => [
        ...prev,
        { role: 'user', content: message },
        {
          role: 'assistant',
          content: 'Bạn vui lòng đăng nhập để sử dụng tính năng tư vấn cá nhân hóa nhé.',
          recommendations: [],
        }
      ]);

      setInput('');
      return;
    }

    setMessages(prev => [
      ...prev,
      { role: 'user', content: message }
    ]);

    setInput('');
    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/recommendations/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({ message }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));

        throw new Error(
          error.message ||
          error.error ||
          'Không thể kết nối trợ lý lúc này.'
        );
      }

      const data = await response.json();

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer || 'Đây là những phim mình tìm được.',
          recommendations: Array.isArray(data.recommendations)
            ? data.recommendations
            : [],
        }
      ]);

    } catch (error) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: error.message || 'Đã xảy ra lỗi. Vui lòng thử lại.',
          recommendations: [],
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([{
      role: 'assistant',
      content:
        'Cuộc trò chuyện đã được làm mới. Bạn đang muốn xem thể loại phim nào?',
      recommendations: [],
    }]);

    setInput('');
  };

  return (
    <div className="min-h-screen bg-[#090909] px-4 pb-12 pt-28 text-white">
      <div className="mx-auto max-w-5xl">

        <header className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-red-200">
              <Sparkles size={14} />
              CINEMAHUB MOVIE ASSISTANT
            </div>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Trợ lý tư vấn phim
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
              Trò chuyện để tìm phim theo thể loại, diễn viên, đạo diễn và lịch sử đặt vé của bạn.
            </p>
          </div>

          <button
            onClick={resetChat}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-300 transition hover:bg-white/10 sm:self-auto"
          >
            <RotateCcw size={15} />
            Cuộc trò chuyện mới
          </button>
        </header>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#141414] shadow-2xl">

          <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Bot size={22} />
            </div>

            <div>
              <p className="font-bold">CinemaHub Assistant</p>
              <p className="text-xs text-emerald-400">
                ● Sẵn sàng tư vấn
              </p>
            </div>
          </div>

          <div className="h-[min(62vh,650px)] space-y-5 overflow-y-auto p-4 sm:p-6">

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    message.role === 'user'
                      ? 'bg-white/10 text-gray-200'
                      : 'bg-primary/15 text-primary'
                  }`}
                >
                  {message.role === 'user'
                    ? <UserRound size={17} />
                    : <Bot size={17} />
                  }
                </div>

                <div
                  className={`max-w-[90%] min-w-0 sm:max-w-[82%] ${
                    message.role === 'user' ? 'text-right' : ''
                  }`}
                >
                  <div
                    className={`inline-block rounded-2xl px-4 py-3 text-left text-sm leading-6 ${
                      message.role === 'user'
                        ? 'rounded-tr-sm bg-primary text-white'
                        : 'rounded-tl-sm border border-white/10 bg-[#202020] text-gray-200'
                    }`}
                  >
                    {message.content}
                  </div>

                  {message.recommendations?.length > 0 && (
                    <div className="mt-3 space-y-3 text-left">
                      {message.recommendations.map((item, itemIndex) => (
                        <MovieResult
                          key={
                            item.movie?.id ||
                            item.movie?._id ||
                            itemIndex
                          }
                          item={item}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Bot size={17} />
                </div>

                <LoaderCircle size={16} className="animate-spin" />
                Đang tìm phim phù hợp...
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {messages.length === 1 && (
            <div className="border-t border-white/5 px-4 py-4 sm:px-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Thử hỏi trợ lý
              </p>

              <div className="flex flex-wrap gap-2">
                {starters.map(starter => (
                  <button
                    key={starter}
                    onClick={() => sendMessage(starter)}
                    disabled={loading}
                    className="rounded-full border border-white/10 px-3 py-2 text-xs text-gray-300 transition hover:border-primary/50 hover:bg-primary/10 hover:text-white disabled:opacity-50"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={event => {
              event.preventDefault();
              sendMessage();
            }}
            className="border-t border-white/10 bg-black/20 p-3 sm:p-4"
          >
            <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-[#1b1b1b] p-2 focus-within:border-primary/60">

              <textarea
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                maxLength={500}
                rows={1}
                placeholder="Ví dụ: Tôi muốn xem phim hành động có diễn viên..."
                className="max-h-28 min-h-10 flex-1 resize-y bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-gray-600"
              />

              <button
                type="submit"
                disabled={!canSend}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Gửi tin nhắn"
              >
                <Send size={17} />
              </button>
            </div>

            <p className="mt-2 text-center text-[10px] text-gray-600">
              Tối đa 500 ký tự · Enter để gửi · Shift + Enter để xuống dòng
            </p>
          </form>
        </section>

        <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-gray-600">
          <Film size={13} />
          Gợi ý dựa trên dữ liệu phim và lịch sử đặt vé có sẵn trong CinemaHub.
        </p>

      </div>
    </div>
  );
}
