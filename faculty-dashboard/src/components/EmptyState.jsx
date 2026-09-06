export default function EmptyState({ icon: Icon, title = 'Nothing here yet', message, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 text-gray-400">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
          <Icon size={26} className="text-gray-300" />
        </div>
      )}
      <p className="font-semibold text-gray-500">{title}</p>
      {message && <p className="text-sm mt-1 max-w-sm">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
