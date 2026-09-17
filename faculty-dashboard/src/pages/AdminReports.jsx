import { useEffect, useMemo, useState } from 'react';
import { FileBarChart, Download, ChevronDown, ChevronUp, Search, FileSpreadsheet, FileText } from 'lucide-react';
import api from '../api/client';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import { downloadBlobResponse } from '../utils/download';
import { exportAssessmentToExcel } from '../utils/exportExcel';
import { exportAssessmentPdf } from '../utils/exportPdf';

export default function AdminReports() {
  const [assessments, setAssessments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [statsCache, setStatsCache] = useState({});
  const [statsLoading, setStatsLoading] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/assessments'), api.get('/departments')])
      .then(([a, d]) => {
        setAssessments(a.data || []);
        setDepartments(d.data || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = [...assessments];
    if (deptFilter !== 'all') list = list.filter((a) => a.departments?.code === deptFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((a) => a.title?.toLowerCase().includes(q));
    }
    return list.sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date));
  }, [assessments, deptFilter, search]);

  const toggleExpand = async (id) => {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    setExpanded(id);
    if (!statsCache[id]) {
      setStatsLoading(id);
      try {
        const res = await api.get(`/results/summary/${id}`);
        setStatsCache((prev) => ({ ...prev, [id]: res.data.analytics }));
      } catch (err) {
        console.error(err);
      } finally {
        setStatsLoading(null);
      }
    }
  };

  const fetchAssessmentResults = async (assessmentId) => {
    const res = await api.get(`/results/assessment/${assessmentId}`);
    return res.data?.results || res.data || [];
  };

  const handleExportExcel = async (assessment) => {
    setDownloadingId(`excel-${assessment.id}`);
    try {
      const studentResults = await fetchAssessmentResults(assessment.id);
      exportAssessmentToExcel(assessment, studentResults);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to export Excel report');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleExportPdf = async (assessment) => {
    setDownloadingId(`pdf-${assessment.id}`);
    try {
      const studentResults = await fetchAssessmentResults(assessment.id);
      exportAssessmentPdf(assessment, studentResults);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to export PDF report');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadCsv = async (assessment) => {
    setDownloadingId(`csv-${assessment.id}`);
    try {
      const res = await api.get(`/results/export/${assessment.id}`, { responseType: 'blob' });
      downloadBlobResponse(res, `${assessment.title}-results.csv`);
    } catch (err) {
      alert(err.response?.data?.error || 'Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assessments..."
            className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-secondary transition-smooth"
          />
        </div>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="border border-gray-100 bg-gray-50 rounded-xl px-3 py-2 text-sm">
          <option value="all">All Departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.code}>{d.name} ({d.code})</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 h-20"><div className="skeleton h-full w-full" /></div>)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
          <EmptyState icon={FileBarChart} title="No assessments to report on" message="Reports will appear here once assessments exist." />
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((a, i) => {
          const stats = statsCache[a.id];
          const isExpanded = expanded === a.id;
          return (
            <div key={a.id} className="stagger-item bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden" style={{ '--delay': `${i * 0.03}s` }}>
              <div className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800 truncate">{a.title}</p>
                    <StatusBadge assessment={a} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {a.departments?.code || 'No dept'} · by {a.faculty?.name || 'Unknown'} · {new Date(a.scheduled_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <button
                    onClick={() => handleExportExcel(a)}
                    disabled={downloadingId === `excel-${a.id}`}
                    className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-smooth disabled:opacity-50"
                    title="Export Batch Excel Spreadsheet"
                  >
                    <FileSpreadsheet size={13} /> {downloadingId === `excel-${a.id}` ? 'Exporting...' : 'Excel'}
                  </button>

                  <button
                    onClick={() => handleExportPdf(a)}
                    disabled={downloadingId === `pdf-${a.id}`}
                    className="flex items-center gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-smooth disabled:opacity-50"
                    title="Export Batch Evaluation PDF"
                  >
                    <FileText size={13} /> {downloadingId === `pdf-${a.id}` ? 'Exporting...' : 'PDF'}
                  </button>

                  <button
                    onClick={() => handleDownloadCsv(a)}
                    disabled={downloadingId === `csv-${a.id}`}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-2 rounded-xl transition-smooth disabled:opacity-50"
                    title="Export CSV"
                  >
                    <Download size={13} /> CSV
                  </button>

                  <button
                    onClick={() => toggleExpand(a.id)}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 px-3 py-2 rounded-xl hover:bg-gray-100 transition-smooth"
                  >
                    Stats {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-50 p-4 bg-gray-50/50 animate-fade-in">
                  {statsLoading === a.id && <div className="skeleton h-16 w-full" />}
                  {stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                      <ReportStat label="Attempted" value={stats.attempted} />
                      <ReportStat label="Average" value={stats.average_score} />
                      <ReportStat label="Highest" value={stats.highest_score} />
                      <ReportStat label="Lowest" value={stats.lowest_score} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReportStat({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 py-3">
      <p className="text-lg font-bold text-primary">{value}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}
