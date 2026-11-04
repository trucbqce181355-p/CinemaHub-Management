const screenTypeStyles = {
  '2D': 'border-white/10 bg-white/5 text-gray-300',
  '3D': 'border-blue-500/20 bg-blue-500/10 text-blue-300',
  IMAX: 'border-purple-500/20 bg-purple-500/10 text-purple-300',
  '4DX': 'border-orange-500/20 bg-orange-500/10 text-orange-300',
};

export default function ScreenTypeBadge({ screenType }) {
  const type = String(screenType || '').trim().toUpperCase();
  return <span className={`inline-flex rounded-lg border px-3 py-1 text-xs font-semibold ${screenTypeStyles[type] || screenTypeStyles['2D']}`}>
    {type || 'Chưa cập nhật'}
  </span>;
}
