import type { StudyPlan, ReviewTask } from './ebbinghaus';
import { formatUnitRange, formatCalendarDate } from './ebbinghaus';

type Language = 'zh' | 'en';

const i18n = {
  zh: {
    day: 'Day',
    newLearning: '新学习',
    review: '复习',
    weekdays: ['日', '一', '二', '三', '四', '五', '六'],
    totalDays: '共 {0} 天，平均每日 {1} 个单元',
  },
  en: {
    day: 'Day',
    newLearning: 'New',
    review: 'Review',
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    totalDays: 'Total {0} days, average {1} units per day',
  }
};

/**
 * Export study plan to CSV in calendar format (matching web display)
 */
export function exportToCSV(plan: StudyPlan, language: Language = 'zh') {
  const t = i18n[language];
  
  // Group tasks by week
  const weeks: (ReviewTask | null)[][] = [];
  let currentWeek: (ReviewTask | null)[] = [];
  
  const firstDayOfWeek = plan.tasks[0].date.getDay();
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push(null);
  }
  
  plan.tasks.forEach(task => {
    currentWeek.push(task);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }
  
  // Build CSV content with UTF-8 BOM
  let csv = '\uFEFF'; // UTF-8 BOM for proper Chinese display in Excel
  
  // Title row
  csv += `"${plan.planName}"\n`;
  
  // Info row
  const avgUnits = Math.round((plan.totalAmount * (1 + 4 * 0.5)) / plan.tasks.length);
  csv += `"${t.totalDays.replace('{0}', plan.tasks.length.toString()).replace('{1}', avgUnits.toString())}"\n`;
  csv += '\n'; // Empty row
  
  // Header row (weekday names)
  csv += t.weekdays.map(day => `"${day}"`).join(',') + '\n';
  
  // Data rows (each week)
  weeks.forEach(week => {
    const row = week.map(task => {
      if (!task) return '""';
      
      let cellContent = `${formatCalendarDate(task.date)} ${t.day} ${task.day}\n`;
      
      if (task.newLearning.length > 0) {
        cellContent += `${t.newLearning} (${task.newLearning.length}):\n`;
        task.newLearning.forEach(range => {
          cellContent += `☐ ${formatUnitRange(range, task.unitPrefix)}\n`;
        });
      }
      
      if (task.review.length > 0) {
        cellContent += `${t.review} (${task.review.length}):\n`;
        task.review.forEach(range => {
          cellContent += `☐ ${formatUnitRange(range, task.unitPrefix)}\n`;
        });
      }
      
      // Escape quotes and wrap in quotes
      return `"${cellContent.replace(/"/g, '""')}"`;
    });
    
    csv += row.join(',') + '\n';
  });
  
  // Download with UTF-8 encoding
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${plan.planName}_calendar.csv`;
  link.click();
}

/**
 * Export study plan to PDF (via print)
 */
export function exportToPDF(plan: StudyPlan, language: Language = 'zh') {
  const t = i18n[language];
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  // Calculate average units per day
  const avgUnits = Math.round((plan.totalAmount * (1 + 4 * 0.5)) / plan.tasks.length);
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${plan.planName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      text-align: center;
      color: #1f2937;
      margin-bottom: 10px;
    }
    .subtitle {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 30px;
    }
    .calendar {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 10px;
      margin-top: 20px;
    }
    .weekday {
      text-align: center;
      font-weight: bold;
      padding: 10px;
      background: #f3f4f6;
      border-radius: 4px;
    }
    .day {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
      min-height: 150px;
      background: white;
    }
    .day.empty {
      background: #f9fafb;
      border: none;
    }
    .day-header {
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .section {
      margin-top: 8px;
    }
    .section-title {
      font-weight: 600;
      font-size: 12px;
      margin-bottom: 4px;
    }
    .new-learning .section-title {
      color: #2563eb;
    }
    .review .section-title {
      color: #ea580c;
    }
    .range {
      font-size: 11px;
      color: #4b5563;
      margin-left: 4px;
      line-height: 1.6;
    }
    .checkbox {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 1px solid #9ca3af;
      border-radius: 2px;
      margin-right: 4px;
      vertical-align: middle;
    }
    @media print {
      body {
        padding: 10px;
      }
      .day {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <h1>${plan.planName}</h1>
  <div class="subtitle">${t.totalDays.replace('{0}', plan.tasks.length.toString()).replace('{1}', avgUnits.toString())}</div>
  <div class="calendar">
`;

  // Weekday headers
  t.weekdays.forEach(day => {
    html += `    <div class="weekday">${day}</div>\n`;
  });

  // Group tasks by week
  const weeks: (ReviewTask | null)[][] = [];
  let currentWeek: (ReviewTask | null)[] = [];
  
  const firstDayOfWeek = plan.tasks[0].date.getDay();
  for (let i = 0; i < firstDayOfWeek; i++) {
    currentWeek.push(null);
  }
  
  plan.tasks.forEach(task => {
    currentWeek.push(task);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  // Calendar days
  weeks.forEach(week => {
    week.forEach(task => {
      if (!task) {
        html += `    <div class="day empty"></div>\n`;
      } else {
        html += `    <div class="day">\n`;
        html += `      <div class="day-header">${formatCalendarDate(task.date)} ${t.day} ${task.day}</div>\n`;
        
        if (task.newLearning.length > 0) {
          html += `      <div class="section new-learning">\n`;
          html += `        <div class="section-title">${t.newLearning} (${task.newLearning.length})</div>\n`;
          task.newLearning.forEach(range => {
            html += `        <div class="range"><span class="checkbox"></span>${formatUnitRange(range, task.unitPrefix)}</div>\n`;
          });
          html += `      </div>\n`;
        }
        
        if (task.review.length > 0) {
          html += `      <div class="section review">\n`;
          html += `        <div class="section-title">${t.review} (${task.review.length})</div>\n`;
          task.review.forEach(range => {
            html += `        <div class="range"><span class="checkbox"></span>${formatUnitRange(range, task.unitPrefix)}</div>\n`;
          });
          html += `      </div>\n`;
        }
        
        html += `    </div>\n`;
      }
    });
  });

  html += `
  </div>
</body>
</html>
`;

  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for content to load before printing
  printWindow.onload = () => {
    printWindow.print();
  };
}

/**
 * Export study plan to Google Calendar (ICS format)
 */
export function exportToGoogleCalendar(plan: StudyPlan, language: Language = 'zh') {
  const t = i18n[language];
  
  let ics = 'BEGIN:VCALENDAR\n';
  ics += 'VERSION:2.0\n';
  ics += 'PRODID:-//Ebbinghaus Study Planner//EN\n';
  ics += `X-WR-CALNAME:${plan.planName}\n`;
  ics += 'X-WR-TIMEZONE:Asia/Shanghai\n';
  ics += 'CALSCALE:GREGORIAN\n';
  ics += 'METHOD:PUBLISH\n';

  plan.tasks.forEach(task => {
    const dateStr = task.date.toISOString().split('T')[0].replace(/-/g, '');
    
    // Create event summary
    let summary = `${plan.planName} - ${t.day} ${task.day}`;
    
    // Create event description
    let description = '';
    
    if (task.newLearning.length > 0) {
      description += `${t.newLearning}:\\n`;
      task.newLearning.forEach(range => {
        description += `- ${formatUnitRange(range, task.unitPrefix)}\\n`;
      });
    }
    
    if (task.review.length > 0) {
      if (description) description += '\\n';
      description += `${t.review}:\\n`;
      task.review.forEach(range => {
        description += `- ${formatUnitRange(range, task.unitPrefix)}\\n`;
      });
    }
    
    ics += 'BEGIN:VEVENT\n';
    ics += `DTSTART;VALUE=DATE:${dateStr}\n`;
    ics += `DTEND;VALUE=DATE:${dateStr}\n`;
    ics += `SUMMARY:${summary}\n`;
    ics += `DESCRIPTION:${description}\n`;
    ics += `UID:${plan.planName}-${task.day}@ebbinghaus-planner\n`;
    ics += 'END:VEVENT\n';
  });

  ics += 'END:VCALENDAR\n';

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${plan.planName}.ics`;
  link.click();
}
