import { useEffect, useState } from 'react';
import { AlertCircle, Edit2, Tag, TrendingUp } from 'lucide-react';
import ProgramModal from '../../components/ProgramModal';
import { weekendDaysLabel } from '../../utils/pricingRuleForm';

const money = value => Number(value || 0).toLocaleString('vi-VN') + 'đ';
const date = value => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleString('vi-VN') : 'Chưa cập nhật';
const names = { WEEKEND: 'Cuối tuần', HOLIDAY: 'Ngày lễ', LATE_NIGHT: 'Giờ vàng', SNEAK_SHOW: 'Suất chiếu sớm' };
const legacy = { 'Cuối tuần': 'WEEKEND', 'Ngày Lễ': 'HOLIDAY', 'Giờ vàng': 'LATE_NIGHT', 'Suất chiếu sớm': 'SNEAK_SHOW' };
function Field({ label, children, full = false }) {
  return <div className={full ? 'sm:col-span-2' : ''}><dt className="mb-1 text-gray-500">{label}</dt><dd className="break-words text-gray-200">{children}</dd></div>;
}

export default function ProgramDetailsModal({ item, promotion, request, onClose, onEdit }) {
  const [details, setDetails] = useState(item);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [retry, setRetry] = useState(0);
  const [screenings, setScreenings] = useState([]), [scheduleError, setScheduleError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    const resource = promotion ? '/promotions/' : '/pricing-rules/';
    request(resource + item.id, { signal: controller.signal }).then(data => {
      if (!data || data.id !== item.id || data.archived) throw new Error('Thông tin chương trình không hợp lệ.');
      if (!controller.signal.aborted) { setDetails(data); setError(''); }
    }).catch(cause => { if (!controller.signal.aborted) setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [item.id, promotion, request, retry]);
  const trigger = legacy[details.triggerVariable] || details.triggerVariable;
  useEffect(() => {
    if (promotion || trigger !== 'SNEAK_SHOW') return;
    const controller = new AbortController();
    request('/showtimes?includePast=true&allStatuses=true', { signal: controller.signal })
      .then(data => { if (!Array.isArray(data)) throw new Error('Dữ liệu suất chiếu không hợp lệ.'); if (!controller.signal.aborted) { setScreenings(data); setScheduleError(''); } })
      .catch(cause => { if (!controller.signal.aborted) setScheduleError(cause.message); });
    return () => controller.abort();
  }, [promotion, trigger, request, retry]);
  const expired = promotion && details.status === 'Active' && new Date(details.endDate) <= new Date();
  const status = expired ? 'Hết hạn' : ({ Active: 'Đang hoạt động', Disabled: 'Vô hiệu hóa', Used: 'Đã sử dụng' }[details.status] || details.status);
  const statusStyle = expired ? 'border-orange-500/20 bg-orange-500/10 text-orange-400' : details.status === 'Active' ? 'border-green-500/20 bg-green-500/10 text-green-400' : 'border-red-500/20 bg-red-500/10 text-red-400';
  return <ProgramModal title={promotion ? 'Chi tiết Khuyến mãi' : 'Chi tiết Giá động'} subtitle={promotion ? details.code : names[trigger] || trigger} icon={promotion ? Tag : TrendingUp} onClose={onClose} footer={<>
    <button type="button" onClick={onClose} className="rounded-xl px-5 py-3 text-gray-300 hover:bg-white/10">Đóng</button>
    <button type="button" disabled={loading || Boolean(error)} onClick={() => onEdit(details)} className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold hover:bg-red-700 disabled:opacity-50"><Edit2 className="h-4 w-4" />Chỉnh sửa</button>
  </>}>
    {loading && <p role="status" className="text-sm text-gray-400">Đang cập nhật thông tin...</p>}
    {error && <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300"><AlertCircle className="h-4 w-4" />{error}<button type="button" onClick={() => { setLoading(true); setRetry(value => value + 1); }} className="ml-auto underline">Thử lại</button></div>}
    {promotion && /^https?:\/\//i.test(details.bannerImage || '') && <img src={details.bannerImage} alt="Banner khuyến mãi" className="block h-auto w-full rounded-2xl border border-white/10" />}
    <section className="space-y-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="break-words text-xl font-bold">{promotion ? details.title : names[trigger] || trigger}</h3>
      <dl className="grid gap-6 text-sm sm:grid-cols-2">
        <Field label={promotion ? 'Mã khuyến mãi' : 'Loại luật'}>{promotion ? details.code : names[trigger] || trigger}</Field>
        <Field label="Trạng thái hoạt động"><span className={'inline-flex rounded-full border px-3 py-1 text-xs font-medium ' + statusStyle}>{status}</span></Field>
        <Field label={promotion ? 'Mức giảm' : 'Điều chỉnh mỗi ghế'}>{promotion ? (details.discountType?.toUpperCase() === 'PERCENTAGE' ? `${details.discountValue}%` : money(details.discountValue)) : `${Number(details.adjustmentValue) > 0 ? '+' : ''}${money(details.adjustmentValue)}`}</Field>
        {promotion ? <>
          <Field label="Hình thức giảm">{details.discountType?.toUpperCase() === 'PERCENTAGE' ? 'Theo phần trăm' : 'Số tiền cố định'}</Field>
          <Field label="Bắt đầu">{date(details.startDate)}</Field><Field label="Kết thúc">{date(details.endDate)}</Field>
          <Field label="Mô tả" full><p className="whitespace-pre-wrap">{details.description || 'Chưa có mô tả'}</p></Field>
          {[['minSpend', 'Đơn tối thiểu', true], ['maxDiscount', 'Giảm tối đa', true], ['usageLimit', 'Tổng lượt dùng'], ['perUserLimit', 'Lượt dùng / tài khoản']].map(([key, label, currency]) => <Field key={key} label={label}>{details.conditions?.[key] == null ? 'Không giới hạn' : currency ? money(details.conditions[key]) : Number(details.conditions[key]).toLocaleString('vi-VN')}</Field>)}
          {(details.conditions?.redeemedByUserId || details.conditions?.rewardVoucherId) && <Field label="Phạm vi voucher" full>Voucher thành viên dành cho tài khoản được chỉ định.</Field>}
        </> : <Field label="Điều kiện áp dụng">
          {trigger === 'WEEKEND' ? weekendDaysLabel(details.conditionParams?.daysOfWeek) : trigger === 'LATE_NIGHT' ? `Từ ${String(details.conditionParams?.startHour ?? 22).padStart(2, '0')}:00 đến hết ngày` : trigger === 'HOLIDAY' ? <div className="flex flex-wrap gap-2">{(details.conditionParams?.dates || []).map(day => <span key={day} className="rounded-lg bg-white/5 px-3 py-2">{new Date(day + 'T00:00:00').toLocaleDateString('vi-VN')}</span>)}</div> : trigger === 'SNEAK_SHOW' ? <div className="space-y-2">
            {scheduleError && <p role="alert" className="text-orange-300">{scheduleError}</p>}
            {(details.conditionParams?.showtimeIds || []).map(id => { const showtime = screenings.find(s => s.id === id); return <p key={id} className="rounded-lg bg-white/5 p-3">{showtime ? `${showtime.movieTitle || 'Phim'} · ${showtime.cinemaName || 'Rạp'} · ${showtime.roomName || 'Phòng'} · ${date(showtime.startTime)}` : 'Suất chiếu chưa tải được hoặc không còn tồn tại'}</p>; })}
          </div> : 'Chưa cấu hình'}
        </Field>}
      </dl>
    </section>
  </ProgramModal>;
}
