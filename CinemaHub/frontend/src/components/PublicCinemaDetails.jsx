import { MapPin, Phone, Mail } from 'lucide-react';
import ProgramModal from './ProgramModal';

function DetailList({ title, items }) {
  if (!items?.length) return null;
  return <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
    <h3 className="mb-3 font-semibold">{title}</h3>
    <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-300">
      {items.map((item, index) => <li key={index} className="break-words">{item}</li>)}
    </ul>
  </section>;
}

export default function PublicCinemaDetails({ cinema, api, onClose }) {
  const image = cinema.imageUrl || (cinema.imageId ? `${api}/cinemas/images/${cinema.imageId}` : null);
  return <ProgramModal title="Chi tiết Rạp" subtitle={cinema.name} icon={MapPin} onClose={onClose}
    footer={<button type="button" onClick={onClose} className="rounded-xl bg-white/10 px-5 py-2.5 font-semibold hover:bg-white/20">Đóng</button>}>
    {image && <img src={image} alt={`Không gian ${cinema.name}`} className="max-h-72 w-full rounded-2xl object-cover" />}
    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="break-words font-display text-xl font-bold">{cinema.name}</h3>
      {cinema.description && <p className="whitespace-pre-line break-words text-sm leading-relaxed text-gray-300">{cinema.description}</p>}
      <div className="flex items-start gap-3 text-sm text-gray-300"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="mb-1 text-gray-500">Địa chỉ</p><p className="break-words">{cinema.address || 'Chưa cập nhật'}</p></div></div>
      {cinema.contactPhone && <div className="flex items-start gap-3 text-sm text-gray-300"><Phone className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="mb-1 text-gray-500">Số tổng đài</p><p>{cinema.contactPhone}</p></div></div>}
      {cinema.contactEmail && <div className="flex items-start gap-3 text-sm text-gray-300"><Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div className="min-w-0"><p className="mb-1 text-gray-500">Email liên hệ</p><p className="break-words">{cinema.contactEmail}</p></div></div>}
    </section>
    <DetailList title="Tiện ích" items={cinema.facilities} />
    <DetailList title="Dịch vụ tại rạp" items={cinema.services} />
    <DetailList title="Quy định tại rạp" items={cinema.houseRules} />
  </ProgramModal>;
}
