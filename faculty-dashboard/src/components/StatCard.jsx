import AnimatedCounter from './AnimatedCounter';

const COLOR_MAP = {
  primary: { bg: 'bg-blue-50', text: 'text-primary' },
  secondary: { bg: 'bg-sky-50', text: 'text-secondary' },
  success: { bg: 'bg-green-50', text: 'text-success' },
  danger: { bg: 'bg-rose-50', text: 'text-danger' },
  amber: { bg: 'bg-amber-50', text: 'text-amber' },
  violet: { bg: 'bg-violet-50', text: 'text-violet' },
};

export default function StatCard({ label, value, icon: Icon, color = 'primary', decimals = 0, onClick }) {
  const c = COLOR_MAP[color] || COLOR_MAP.primary;
  const numericValue = Number(value) || 0;
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 card-hover ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.bg}`}>
        {Icon && <Icon size={20} className={c.text} />}
      </div>
      <p className="text-2xl font-bold text-gray-800">
        <AnimatedCounter value={numericValue} decimals={decimals} />
      </p>
      <p className="text-xs text-gray-500 font-medium mt-1">{label}</p>
    </div>
  );
}
