import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { BarChart3, TrendingUp, Building2, GraduationCap } from 'lucide-react';
import api from '../api/client';
import EmptyState from '../components/EmptyState';

const PIE_COLORS = ['#1E3A5F', '#4F8EF7', '#22C55E', '#F5A623', '#E85D75', '#7C6FE0'];

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState([]);
  const [deptCounts, setDeptCounts] = useState([]);
  const [summaries, setSummaries] = useState([]); // [{assessment, analytics}]

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [a, d] = await Promise.all([api.get('/assessments'), api.get('/departments/counts')]);
        const allAssessments = a.data || [];
        setAssessments(allAssessments);
        setDeptCounts(d.data || []);

        const recent = [...allAssessments]
          .sort((x, y) => new Date(y.scheduled_date) - new Date(x.scheduled_date))
          .slice(0, 10);

        const results = await Promise.all(
          recent.map((assessment) =>
            api.get(`/results/summary/${assessment.id}`).then((res) => ({ assessment, analytics: res.data.analytics }))
          )
        );
        if (!cancelled) setSummaries(results);
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const completionData = useMemo(() => {
    const byDept = {};
    summaries
      .filter((s) => s.analytics.total_students_in_department > 0)
      .forEach((s) => {
        const name = s.assessment.departments?.code || 'Unknown';
        const bucket = byDept[name] || (byDept[name] = { attempted: 0, total: 0 });
        bucket.attempted += s.analytics.attempted;
        bucket.total += s.analytics.total_students_in_department;
      });
    return Object.entries(byDept)
      .map(([name, { attempted, total }]) => ({ name, completion: Math.round((attempted / total) * 100) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [summaries]);

  const performanceData = useMemo(() => {
    const byDept = {};
    summaries
      .filter((s) => s.analytics.attempted > 0)
      .forEach((s) => {
        const name = s.assessment.departments?.code || 'Unknown';
        const bucket = byDept[name] || (byDept[name] = { weightedSum: 0, attempted: 0 });
        bucket.weightedSum += s.analytics.average_score * s.analytics.attempted;
        bucket.attempted += s.analytics.attempted;
      });
    return Object.entries(byDept)
      .map(([name, { weightedSum, attempted }]) => ({ name, average: Math.round((weightedSum / attempted) * 100) / 100 }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [summaries]);

  const departmentData = useMemo(() => deptCounts.map((d) => ({
    name: d.code,
    assessments: d.assessment_count,
    students: d.student_count,
  })), [deptCounts]);

  const facultyActivity = useMemo(() => {
    const counts = {};
    assessments.forEach((a) => {
      if (a.faculty?.is_admin) return; // admins aren't faculty — exclude from faculty activity
      const name = a.faculty?.name || 'Unknown';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [assessments]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 h-72">
            <div className="skeleton h-full w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-1">Admin</p>
        <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
        <p className="text-sm text-gray-400 mt-1">Based on the {summaries.length} most recent assessment(s).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Assessment Completion by Department" icon={BarChart3}>
          {completionData.length === 0 ? (
            <EmptyState icon={BarChart3} title="No completion data yet" message="Once students attempt assessments, completion rates will show here." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={completionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis unit="%" />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="completion" fill="#4F8EF7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Average Performance by Department" icon={TrendingUp}>
          {performanceData.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No performance data yet" message="Average scores will appear here once assessments are attempted." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="average" fill="#22C55E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Department-wise Analysis" icon={Building2}>
          {departmentData.length === 0 ? (
            <EmptyState icon={Building2} title="No departments yet" message="Add departments to see cross-department analysis." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="assessments" name="Assessments" fill="#1E3A5F" radius={[6, 6, 0, 0]} />
                <Bar dataKey="students" name="Students" fill="#F5A623" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Faculty Activity" icon={GraduationCap}>
          {facultyActivity.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No activity yet" message="Assessments created by faculty will be summarized here." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={facultyActivity} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {facultyActivity.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-fade-in-up">
      <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-3">
        <Icon size={17} className="text-secondary" /> {title}
      </h2>
      {children}
    </div>
  );
}
