import * as XLSX from 'xlsx';

export function exportAssessmentToExcel(assessment, studentResults = []) {
  const wb = XLSX.utils.book_new();

  // Overview Sheet Data
  const overviewData = [
    ['SmartAssess Assessment Report'],
    ['Generated At', new Date().toLocaleString()],
    [''],
    ['Assessment Title', assessment.title || 'N/A'],
    ['Department', assessment.departments?.name || assessment.departments?.code || 'N/A'],
    ['Scheduled Date', assessment.scheduled_date ? new Date(assessment.scheduled_date).toLocaleString() : 'N/A'],
    ['Duration (Mins)', assessment.duration_minutes || 'N/A'],
    ['Total Marks', assessment.total_marks || 'N/A'],
    ['Negative Marking', assessment.negative_marking ? `Yes (-${assessment.negative_mark_value || 0.25})` : 'No'],
    ['Reattempt Allowed', assessment.reattempt_enabled ? `Yes (Max: ${assessment.max_reattempts})` : 'No'],
    [''],
    ['Summary Statistics'],
    ['Total Submissions', studentResults.length],
  ];

  if (studentResults.length > 0) {
    const scores = studentResults.map(r => Number(r.score) || 0);
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2);
    const passCount = studentResults.filter(r => (Number(r.score) || 0) >= (Number(r.total_marks || assessment.total_marks || 1) * 0.4)).length;
    const passPercentage = ((passCount / studentResults.length) * 100).toFixed(1);

    overviewData.push(
      ['Highest Score', highest],
      ['Lowest Score', lowest],
      ['Average Score', avg],
      ['Pass Count (>=40%)', `${passCount} / ${studentResults.length}`],
      ['Pass Rate', `${passPercentage}%`]
    );
  }

  const overviewWs = XLSX.utils.aoa_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(wb, overviewWs, 'Overview');

  // Student Results Sheet Data
  const studentRows = studentResults.map((r, idx) => ({
    'Rank': r.rank || idx + 1,
    'Register No': r.students?.register_no || 'N/A',
    'Student Name': r.students?.name || 'N/A',
    'Department': r.students?.departments?.code || assessment.departments?.code || 'N/A',
    'Score': r.score ?? 0,
    'Total Marks': r.total_marks || assessment.total_marks || 0,
    'Percentage (%)': r.total_marks ? ((r.score / r.total_marks) * 100).toFixed(1) : '0.0',
    'Correct': r.correct_count ?? 0,
    'Wrong': r.wrong_count ?? 0,
    'Attempts Used': r.attempts_used || 1,
    'Violations / Tab Switches': r.violations || 0,
    'Submitted At': r.submitted_at ? new Date(r.submitted_at).toLocaleString() : 'N/A'
  }));

  const studentsWs = studentRows.length > 0
    ? XLSX.utils.json_to_sheet(studentRows)
    : XLSX.utils.aoa_to_sheet([
        ['Rank', 'Register No', 'Student Name', 'Department', 'Score', 'Total Marks', 'Percentage (%)', 'Correct', 'Wrong', 'Attempts Used', 'Violations / Tab Switches', 'Submitted At'],
        ['No student submissions recorded yet']
      ]);
  XLSX.utils.book_append_sheet(wb, studentsWs, 'Student Results');

  const fileName = `${(assessment.title || 'Assessment').replace(/[^a-z0-9]/gi, '_')}_Report.xlsx`;
  XLSX.writeFile(wb, fileName);
}
