import html2pdf from 'html2pdf.js';
import type { Meeting } from '@/types';
import type { Vendor } from '@/types/vendor';
import { formatDateShort } from './dateUtils';

const MEETING_TYPES_MAP: Record<string, string> = {
  SITE_VISIT: 'ביקור באתר',
  PLANNING: 'תכנון',
  REVIEW: 'בדיקה',
  DECISION: 'החלטה',
  OTHER: 'אחר',
};

export const exportMeetingsToPDF = (
  meetings: Meeting[],
  vendors: Vendor[],
  projectName: string
) => {
  // Create HTML content with Hebrew font support
  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="he">
    <head>
      <meta charset="UTF-8">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Heebo', 'Assistant', Arial, sans-serif;
          direction: rtl;
          padding: 30px;
          color: #1a1a1a;
          background-color: #ffffff;
        }
        .header {
          text-align: right;
          margin-bottom: 30px;
          padding-bottom: 15px;
          border-bottom: 3px solid #1565c0;
        }
        .header h1 {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
          color: #0d47a1;
        }
        .header .date {
          font-size: 13px;
          color: #666;
          font-weight: 500;
        }
        .meeting {
          margin-bottom: 25px;
          page-break-inside: avoid;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .meeting-header {
          background: linear-gradient(135deg, #1565c0 0%, #0d47a1 100%);
          color: white;
          padding: 12px 16px;
          font-size: 17px;
          font-weight: 700;
        }
        .meeting-body {
          padding: 16px;
          background-color: #fafafa;
        }
        .meeting-details {
          background-color: white;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 12px;
          border-right: 4px solid #1565c0;
        }
        .meeting-details .detail-row {
          font-size: 12px;
          margin-bottom: 6px;
          line-height: 1.6;
          display: flex;
          align-items: flex-start;
        }
        .meeting-details .detail-row:last-child {
          margin-bottom: 0;
        }
        .detail-label {
          font-weight: 600;
          color: #0d47a1;
          min-width: 90px;
          display: inline-block;
        }
        .detail-value {
          color: #333;
        }
        .section-title {
          font-weight: 700;
          font-size: 13px;
          margin-top: 14px;
          margin-bottom: 8px;
          color: #0d47a1;
          padding-right: 8px;
          border-right: 3px solid #1565c0;
        }
        .description {
          font-size: 12px;
          line-height: 1.7;
          margin-bottom: 12px;
          white-space: pre-wrap;
          padding: 12px;
          background-color: white;
          border-radius: 6px;
          color: #333;
        }
        .action-item {
          font-size: 11px;
          margin-bottom: 8px;
          padding: 10px 12px;
          background-color: white;
          border-radius: 6px;
          line-height: 1.6;
          border: 1px solid #e0e0e0;
        }
        .action-item-title {
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 6px;
        }
        .action-item-detail {
          margin-right: 12px;
          color: #666;
          margin-bottom: 3px;
          display: flex;
          align-items: center;
        }
        .action-item-detail::before {
          content: "•";
          margin-left: 6px;
          color: #1565c0;
          font-weight: bold;
        }
        .decision-item {
          font-size: 11px;
          margin-bottom: 6px;
          line-height: 1.6;
          padding: 8px 12px;
          background-color: white;
          border-radius: 6px;
          border-right: 3px solid #4caf50;
        }
        .separator {
          height: 2px;
          background: linear-gradient(to left, #e0e0e0, transparent);
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>פגישות - ${projectName}</h1>
        <div class="date">תאריך הפקה: ${formatDateShort(new Date())}</div>
      </div>

      ${meetings.map((meeting, index) => `
        <div class="meeting">
          <div class="meeting-header">${index + 1}. ${meeting.title}</div>

          <div class="meeting-body">
            <div class="meeting-details">
              <div class="detail-row">
                <span class="detail-label">תאריך פגישה:</span>
                <span class="detail-value">${formatDateShort(meeting.meetingDate)}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">סוג פגישה:</span>
                <span class="detail-value">${MEETING_TYPES_MAP[meeting.meetingType] || meeting.meetingType}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">תאריך יעד:</span>
                <span class="detail-value">${meeting.dueDate ? formatDateShort(meeting.dueDate) : 'לא הוגדר'}</span>
              </div>
            </div>

            ${meeting.description ? `
              <div class="section-title">תיאור</div>
              <div class="description">${meeting.description}</div>
            ` : ''}

            ${meeting.actionItems && meeting.actionItems.length > 0 ? `
              <div class="section-title">משימות פעולה</div>
              ${meeting.actionItems.map((item, idx) => {
                const vendor = item.assigneeVendorId ? vendors.find(v => v.id === item.assigneeVendorId) : null;
                return `
                  <div class="action-item">
                    <div class="action-item-title">${idx + 1}. ${item.description}</div>
                    ${vendor ? `<div class="action-item-detail">ספק: ${vendor.name}</div>` : ''}
                    ${item.assigneeName ? `<div class="action-item-detail">אחראי: ${item.assigneeName}</div>` : ''}
                    ${item.dueDate ? `<div class="action-item-detail">תאריך יעד: ${formatDateShort(item.dueDate)}</div>` : ''}
                    <div class="action-item-detail">סטטוס: ${item.status === 'COMPLETED' ? '✓ הושלמה' : '○ בהמתנה'}</div>
                  </div>
                `;
              }).join('')}
            ` : ''}

            ${meeting.decisions && meeting.decisions.length > 0 && meeting.decisions.some(d => d) ? `
              <div class="section-title">החלטות</div>
              ${meeting.decisions.filter(d => d).map(decision => `
                <div class="decision-item">${decision}</div>
              `).join('')}
            ` : ''}
          </div>
        </div>

        ${index < meetings.length - 1 ? '<div class="separator"></div>' : ''}
      `).join('')}
    </body>
    </html>
  `;

  // Create a temporary container
  const element = document.createElement('div');
  element.innerHTML = htmlContent;
  element.style.width = '210mm'; // A4 width

  // Configure html2pdf options
  const opt = {
    margin: [15, 15, 15, 15] as [number, number, number, number],
    filename: `פגישות_${projectName}_${formatDateShort(new Date())}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.99 },
    html2canvas: {
      scale: 3,
      useCORS: true,
      letterRendering: true,
      logging: false,
      dpi: 300,
      backgroundColor: '#ffffff',
    },
    jsPDF: {
      unit: 'mm' as const,
      format: 'a4' as const,
      orientation: 'portrait' as const,
      compress: true,
    },
  };

  // Generate PDF
  html2pdf().set(opt).from(element).save();
};
