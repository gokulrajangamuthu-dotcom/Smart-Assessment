import { useState } from 'react';
import { Settings, PanelLeftClose, Rows3 } from 'lucide-react';

export default function AdminSettings() {
  const [collapsedDefault, setCollapsedDefault] = useState(localStorage.getItem('admin_sidebar_collapsed') === 'true');
  const [density, setDensity] = useState(localStorage.getItem('admin_table_density') || 'comfortable');

  const toggleCollapsedDefault = () => {
    const next = !collapsedDefault;
    setCollapsedDefault(next);
    localStorage.setItem('admin_sidebar_collapsed', String(next));
  };

  const setTableDensity = (value) => {
    setDensity(value);
    localStorage.setItem('admin_table_density', value);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Settings size={22} /> Settings
        </h1>
        <p className="text-sm text-gray-400 mt-1">Local display preferences for this browser — nothing here is shared with other admins.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        <div className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <PanelLeftClose size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">Collapse sidebar by default</p>
              <p className="text-xs text-gray-400">Applies the next time you load the admin dashboard.</p>
            </div>
          </div>
          <button
            onClick={toggleCollapsedDefault}
            className={`w-12 h-7 rounded-full transition-smooth relative shrink-0 ${collapsedDefault ? 'bg-primary' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-smooth ${collapsedDefault ? 'left-6' : 'left-1'}`} />
          </button>
        </div>

        <div className="p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Rows3 size={18} className="text-amber" />
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">Table density</p>
              <p className="text-xs text-gray-400">Controls row spacing on the Faculty and Students tables.</p>
            </div>
          </div>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {['comfortable', 'dense'].map((opt) => (
              <button
                key={opt}
                onClick={() => setTableDensity(opt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-smooth ${
                  density === opt ? 'bg-white shadow text-primary' : 'text-gray-500'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
