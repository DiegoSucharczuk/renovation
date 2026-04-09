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
      <link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap" rel="stylesheet">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Rubik', Arial, sans-serif;
          direction: rtl;
          padding: 20px;
          color: #333;
        }
        .header {
          text-align: right;
          margin-bottom: 10px;
        }
        .header h1 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 5px;
        }
        .header .date {
          font-size: 12px;
          color: #666;
          margin-bottom: 20px;
        }
        .meeting {
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        .meeting-header {
          background-color: #f0f0f0;
          padding: 8px 12px;
          font-size: 16px;
          font-weight: 700;
          margin-bottom: 10px;
          border-radius: 4px;
        }
        .meeting-details {
          margin-bottom: 8px;
        }
        .meeting-details .detail-row {
          font-size: 11px;
          margin-bottom: 4px;
          line-height: 1.4;
        }
        .section-title {
          font-weight: 700;
          font-size: 11px;
          margin-top: 10px;
          margin-bottom: 5px;
        }
        .description {
          font-size: 11px;
          line-height: 1.5;
          margin-bottom: 8px;
          white-space: pre-wrap;
        }
        .action-item {
          font-size: 10px;
          margin-bottom: 6px;
          padding: 6px;
          background-color: #f9f9f9;
          border-radius: 3px;
          line-height: 1.4;
        }
        .action-item-detail {
          margin-right: 15px;
          color: #666;
        }
        .decision-item {
          font-size: 10px;
          margin-bottom: 4px;
          line-height: 1.4;
        }
        .separator {
          border-bottom: 1px solid #ddd;
          margin: 15px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>פגישות - ${projectName}</h1>
        <div class="date">תאריך: ${formatDateShort(new Date())}</div>
      </div>

      ${meetings.map((meeting, index) => `
        <div class="meeting">
          <div class="meeting-header">${index + 1}. ${meeting.title}</div>

          <div class="meeting-details">
            <div class="detail-row">תאריך פגישה: ${formatDateShort(meeting.meetingDate)}</div>
            <div class="detail-row">סוג פגישה: ${MEETING_TYPES_MAP[meeting.meetingType] || meeting.meetingType}</div>
            <div class="detail-row">תאריך יעד: ${meeting.dueDate ? formatDateShort(meeting.dueDate) : 'לא הוגדר'}</div>
          </div>

          ${meeting.description ? `
            <div class="section-title">תיאור:</div>
            <div class="description">${meeting.description}</div>
          ` : ''}

          ${meeting.actionItems && meeting.actionItems.length > 0 ? `
            <div class="section-title">משימות פעולה:</div>
            ${meeting.actionItems.map((item, idx) => {
              const vendor = item.assigneeVendorId ? vendors.find(v => v.id === item.assigneeVendorId) : null;
              return `
                <div class="action-item">
                  <div>${idx + 1}. ${item.description}</div>
                  ${vendor ? `<div class="action-item-detail">ספק: ${vendor.name}</div>` : ''}
                  ${item.assigneeName ? `<div class="action-item-detail">אחראי: ${item.assigneeName}</div>` : ''}
                  ${item.dueDate ? `<div class="action-item-detail">תאריך יעד: ${formatDateShort(item.dueDate)}</div>` : ''}
                  <div class="action-item-detail">סטטוס: ${item.status === 'COMPLETED' ? 'הושלמה' : 'בהמתנה'}</div>
                </div>
              `;
            }).join('')}
          ` : ''}

          ${meeting.decisions && meeting.decisions.length > 0 && meeting.decisions.some(d => d) ? `
            <div class="section-title">החלטות:</div>
            ${meeting.decisions.filter(d => d).map(decision => `
              <div class="decision-item">• ${decision}</div>
            `).join('')}
          ` : ''}
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
    margin: 10,
    filename: `פגישות_${projectName}_${formatDateShort(new Date())}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
    },
    jsPDF: {
      unit: 'mm' as const,
      format: 'a4' as const,
      orientation: 'portrait' as const
    },
  };

  // Generate PDF
  html2pdf().set(opt).from(element).save();
};
