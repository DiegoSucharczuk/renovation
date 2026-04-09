import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import type { Meeting } from '@/types';
import type { Vendor } from '@/types/vendor';
import { formatDateShort } from './dateUtils';

// Register fonts
(pdfMake as any).vfs = (pdfFonts as any).pdfMake.vfs;

const MEETING_TYPES_MAP: Record<string, string> = {
  SITE_VISIT: 'ביקור באתר',
  PLANNING: 'תכנון',
  REVIEW: 'בדיקה',
  DECISION: 'החלטה',
  OTHER: 'אחר',
};

const STATUS_MAP: Record<string, string> = {
  NOT_STARTED: 'לא התחילה',
  IN_PROGRESS: 'בתהליך',
  PARTIAL: 'בחלקה',
  COMPLETED: 'בוצעה',
};

export const exportMeetingsToPDF = (
  meetings: Meeting[],
  vendors: Vendor[],
  projectName: string
) => {
  const content: any[] = [];

  // Add title
  content.push({
    text: `פגישות - ${projectName}`,
    style: 'header',
    alignment: 'right',
    margin: [0, 0, 0, 10],
  });

  // Add date
  content.push({
    text: `תאריך: ${formatDateShort(new Date())}`,
    alignment: 'right',
    margin: [0, 0, 0, 20],
    fontSize: 10,
  });

  // Add each meeting
  meetings.forEach((meeting, index) => {
    // Meeting header
    content.push({
      text: `${index + 1}. ${meeting.title}`,
      style: 'meetingTitle',
      alignment: 'right',
      margin: [0, 10, 0, 5],
      fillColor: '#f0f0f0',
    });

    // Meeting details
    const details = [
      `תאריך פגישה: ${formatDateShort(meeting.meetingDate)}`,
      `סוג פגישה: ${MEETING_TYPES_MAP[meeting.meetingType] || meeting.meetingType}`,
      `תאריך יעד: ${meeting.dueDate ? formatDateShort(meeting.dueDate) : 'לא הוגדר'}`,
    ];

    details.forEach((detail) => {
      content.push({
        text: detail,
        alignment: 'right',
        margin: [0, 2, 0, 2],
        fontSize: 10,
      });
    });

    // Description
    if (meeting.description) {
      content.push({
        text: 'תיאור:',
        bold: true,
        alignment: 'right',
        margin: [0, 5, 0, 2],
        fontSize: 10,
      });

      content.push({
        text: meeting.description,
        alignment: 'right',
        margin: [0, 2, 0, 5],
        fontSize: 10,
      });
    }

    // Action Items
    if (meeting.actionItems && meeting.actionItems.length > 0) {
      content.push({
        text: 'משימות פעולה:',
        bold: true,
        alignment: 'right',
        margin: [0, 5, 0, 3],
        fontSize: 10,
      });

      meeting.actionItems.forEach((item, idx) => {
        const itemDetails: string[] = [`${idx + 1}. ${item.description}`];

        if (item.assigneeVendorId) {
          const vendor = vendors.find((v) => v.id === item.assigneeVendorId);
          if (vendor) {
            itemDetails.push(`   ספק: ${vendor.name}`);
          }
        }

        if (item.assigneeName) {
          itemDetails.push(`   אחראי: ${item.assigneeName}`);
        }

        if (item.dueDate) {
          itemDetails.push(`   תאריך יעד: ${formatDateShort(item.dueDate)}`);
        }

        itemDetails.push(`   סטטוס: ${item.status === 'COMPLETED' ? 'הושלמה' : 'בהמתנה'}`);

        content.push({
          text: itemDetails.join('\n'),
          alignment: 'right',
          margin: [0, 2, 0, 3],
          fontSize: 9,
        });
      });
    }

    // Decisions
    if (meeting.decisions && meeting.decisions.length > 0 && meeting.decisions.some(d => d)) {
      content.push({
        text: 'החלטות:',
        bold: true,
        alignment: 'right',
        margin: [0, 5, 0, 3],
        fontSize: 10,
      });

      meeting.decisions.forEach((decision) => {
        if (decision) {
          content.push({
            text: `• ${decision}`,
            alignment: 'right',
            margin: [0, 2, 0, 2],
            fontSize: 9,
          });
        }
      });
    }

    // Add separator between meetings
    if (index < meetings.length - 1) {
      content.push({
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 5,
            x2: 515,
            y2: 5,
            lineWidth: 1,
            lineColor: '#cccccc',
          },
        ],
        margin: [0, 10, 0, 10],
      });
    }
  });

  const docDefinition: any = {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    content: content,
    defaultStyle: {
      font: 'Roboto',
    },
    styles: {
      header: {
        fontSize: 18,
        bold: true,
      },
      meetingTitle: {
        fontSize: 14,
        bold: true,
      },
    },
  };

  // Generate and download PDF
  const fileName = `פגישות_${projectName}_${formatDateShort(new Date())}.pdf`;
  pdfMake.createPdf(docDefinition).download(fileName);
};
