import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Batch Assessment Report PDF (for Faculty/Admin)
export function exportAssessmentPdf(assessment, studentResults = []) {
  const doc = new jsPDF();

  // Primary Header Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, 210, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SmartAssess - Performance Report', 14, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 23);
  doc.text('Official Department Evaluation Record', 14, 28);

  // Assessment Info Box
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Assessment Summary', 14, 42);

  const deptName = assessment.departments?.name || assessment.departments?.code || 'All Departments';
  const scheduledStr = assessment.scheduled_date ? new Date(assessment.scheduled_date).toLocaleString() : 'N/A';

  const summaryInfo = [
    [
      { content: `Title: ${assessment.title || 'N/A'}`, fontStyle: 'bold' },
      { content: `Department: ${deptName}` },
    ],
    [
      { content: `Scheduled: ${scheduledStr}` },
      { content: `Duration: ${assessment.duration_minutes || 'N/A'} mins` },
    ],
    [
      { content: `Total Marks: ${assessment.total_marks || 'N/A'}` },
      { content: `Negative Marking: ${assessment.negative_marking ? `Yes (-${assessment.negative_mark_value || 0.25})` : 'No'}` },
    ],
  ];

  autoTable(doc, {
    startY: 46,
    body: summaryInfo,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 2, textColor: [51, 65, 85] },
  });

  // Calculate Key Metrics
  let startAfterSummary = doc.lastAutoTable.finalY + 6;
  if (studentResults.length > 0) {
    const scores = studentResults.map((r) => Number(r.score) || 0);
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const passCount = studentResults.filter(
      (r) => (Number(r.score) || 0) >= (Number(r.total_marks || assessment.total_marks || 1) * 0.4)
    ).length;
    const passRate = ((passCount / studentResults.length) * 100).toFixed(1);

    autoTable(doc, {
      startY: startAfterSummary,
      head: [['Total Submissions', 'Highest Score', 'Lowest Score', 'Average Score', 'Pass Rate (>=40%)']],
      body: [[`${studentResults.length}`, `${highest}`, `${lowest}`, `${avg}`, `${passRate}% (${passCount}/${studentResults.length})`]],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 8.5, halign: 'center' },
      styles: { fontSize: 8.5, halign: 'center', fontStyle: 'bold', textColor: [30, 41, 59] },
    });
    startAfterSummary = doc.lastAutoTable.finalY + 8;
  }

  // Student Results Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Student Merit & Rank List', 14, startAfterSummary);

  const tableRows = studentResults.length > 0
    ? studentResults.map((r, idx) => [
        r.rank || idx + 1,
        r.students?.register_no || 'N/A',
        r.students?.name || 'N/A',
        r.students?.departments?.code || assessment.departments?.code || 'N/A',
        `${r.score ?? 0} / ${r.total_marks || assessment.total_marks || 0}`,
        r.total_marks ? `${((r.score / r.total_marks) * 100).toFixed(1)}%` : '0%',
        `${r.correct_count ?? 0} / ${r.wrong_count ?? 0}`,
        r.violations || 0,
      ])
    : [['-', '-', 'No student submissions recorded yet', '-', '-', '-', '-', '-']];

  autoTable(doc, {
    startY: startAfterSummary + 4,
    head: [['Rank', 'Reg No', 'Student Name', 'Dept', 'Score', 'Percentage', 'Correct/Wrong', 'Violations']],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8.5, halign: 'center' },
    styles: { fontSize: 8, cellPadding: 2.5, halign: 'center', textColor: [51, 65, 85] },
    columnStyles: {
      1: { halign: 'left' },
      2: { halign: 'left' },
    },
    didDrawPage: (data) => {
      // Footer page numbering
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `SmartAssess Automated Evaluation - Page ${doc.internal.getNumberOfPages()}`,
        14,
        doc.internal.pageSize.height - 8
      );
    },
  });

  const fileName = `${(assessment.title || 'Assessment').replace(/[^a-z0-9]/gi, '_')}_Report.pdf`;
  doc.save(fileName);
}

// Student Scorecard / Certificate PDF
export function exportStudentScorecardPdf(studentResult, assessment) {
  const doc = new jsPDF();

  // Outer Border Box
  doc.setDrawColor(79, 70, 229);
  doc.setLineWidth(1.5);
  doc.rect(8, 8, 194, 281);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.rect(11, 11, 188, 275);

  // Top Header Banner
  doc.setFillColor(79, 70, 229);
  doc.rect(11, 11, 188, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('SmartAssess', 105, 23, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Official Assessment Scorecard & Performance Summary', 105, 31, { align: 'center' });

  // Student & Assessment Details
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Student Scorecard', 20, 56);

  const studentName = studentResult.students?.name || 'Student';
  const regNo = studentResult.students?.register_no || 'N/A';
  const dept = studentResult.students?.departments?.name || studentResult.students?.departments?.code || 'N/A';
  const assessmentTitle = assessment?.title || studentResult.assessments?.title || 'Assessment';
  const dateStr = studentResult.submitted_at ? new Date(studentResult.submitted_at).toLocaleDateString() : new Date().toLocaleDateString();

  const studentDetails = [
    [{ content: 'Student Name:', fontStyle: 'bold' }, studentName, { content: 'Register Number:', fontStyle: 'bold' }, regNo],
    [{ content: 'Department:', fontStyle: 'bold' }, dept, { content: 'Assessment Date:', fontStyle: 'bold' }, dateStr],
    [{ content: 'Assessment:', fontStyle: 'bold' }, assessmentTitle, { content: 'Attempts Used:', fontStyle: 'bold' }, `${studentResult.attempts_used || 1}`],
  ];

  autoTable(doc, {
    startY: 62,
    body: studentDetails,
    theme: 'plain',
    styles: { fontSize: 9.5, cellPadding: 2.5, textColor: [51, 65, 85] },
  });

  // Score Highlights Grid
  const totalMarks = studentResult.total_marks || assessment?.total_marks || 1;
  const score = studentResult.score ?? 0;
  const percentage = ((score / totalMarks) * 100).toFixed(1);
  const rank = studentResult.rank ? `#${studentResult.rank}` : 'N/A';
  const correct = studentResult.correct_count ?? 0;
  const wrong = studentResult.wrong_count ?? 0;

  const scoreGridY = doc.lastAutoTable.finalY + 8;
  autoTable(doc, {
    startY: scoreGridY,
    head: [['Final Score', 'Total Marks', 'Percentage', 'Class Rank', 'Correct', 'Incorrect']],
    body: [[`${score}`, `${totalMarks}`, `${percentage}%`, `${rank}`, `${correct}`, `${wrong}`]],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9.5, halign: 'center' },
    styles: { fontSize: 11, halign: 'center', fontStyle: 'bold', textColor: [79, 70, 229], cellPadding: 4 },
  });

  // Performance Badge / Message
  const badgeY = doc.lastAutoTable.finalY + 16;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);

  let statusText = 'Good Effort! Keep practicing to improve accuracy.';
  if (percentage >= 80) statusText = 'Outstanding Performance! Excellent problem-solving speed and accuracy.';
  else if (percentage >= 60) statusText = 'Commendable Performance! You have strong core concepts.';

  doc.text(`Evaluation Status: ${statusText}`, 20, badgeY);

  // Authenticity & Verification Signature Block
  const sigY = 240;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(20, sigY, 80, sigY);
  doc.line(130, sigY, 190, sigY);

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Faculty / Evaluator Signature', 20, sigY + 6);
  doc.text('Authorized Controller of Examination', 130, sigY + 6);

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('This is a system-generated credential verified by SmartAssess. No manual signature required for electronic verification.', 105, 275, { align: 'center' });

  const fileName = `${regNo}_${assessmentTitle.replace(/[^a-z0-9]/gi, '_')}_Scorecard.pdf`;
  doc.save(fileName);
}
