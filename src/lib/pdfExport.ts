import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Set RTL direction
  doc.setR2L(true);

  // Add title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const title = `פגישות - ${projectName}`;
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, doc.internal.pageSize.getWidth() - titleWidth - 15, 20);

  // Add date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const dateText = `תאריך: ${formatDateShort(new Date())}`;
  const dateWidth = doc.getTextWidth(dateText);
  doc.text(dateText, doc.internal.pageSize.getWidth() - dateWidth - 15, 28);

  let yPosition = 40;

  meetings.forEach((meeting, index) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Meeting header box
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPosition - 5, doc.internal.pageSize.getWidth() - 30, 8, 'F');

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const meetingTitle = `${index + 1}. ${meeting.title}`;
    const meetingTitleWidth = doc.getTextWidth(meetingTitle);
    doc.text(meetingTitle, doc.internal.pageSize.getWidth() - meetingTitleWidth - 20, yPosition);

    yPosition += 10;

    // Meeting details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const details = [
      { label: 'תאריך פגישה:', value: formatDateShort(meeting.meetingDate) },
      {
        label: 'סוג פגישה:',
        value: MEETING_TYPES_MAP[meeting.meetingType] || meeting.meetingType,
      },
      {
        label: 'תאריך יעד:',
        value: meeting.dueDate ? formatDateShort(meeting.dueDate) : 'לא הוגדר',
      },
    ];

    details.forEach((detail) => {
      const text = `${detail.label} ${detail.value}`;
      const textWidth = doc.getTextWidth(text);
      doc.text(text, doc.internal.pageSize.getWidth() - textWidth - 20, yPosition);
      yPosition += 6;
    });

    // Description
    if (meeting.description) {
      yPosition += 2;
      doc.setFont('helvetica', 'bold');
      const descLabel = 'תיאור:';
      const descLabelWidth = doc.getTextWidth(descLabel);
      doc.text(descLabel, doc.internal.pageSize.getWidth() - descLabelWidth - 20, yPosition);
      yPosition += 6;

      doc.setFont('helvetica', 'normal');
      // Split description into lines to fit page width
      const maxWidth = doc.internal.pageSize.getWidth() - 40;
      const descLines = doc.splitTextToSize(meeting.description, maxWidth);

      descLines.forEach((line: string) => {
        // Check if we need a new page
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        const lineWidth = doc.getTextWidth(line);
        doc.text(line, doc.internal.pageSize.getWidth() - lineWidth - 20, yPosition);
        yPosition += 5;
      });
    }

    // Action Items
    if (meeting.actionItems && meeting.actionItems.length > 0) {
      yPosition += 4;

      // Check if we need a new page
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont('helvetica', 'bold');
      const actionLabel = 'משימות פעולה:';
      const actionLabelWidth = doc.getTextWidth(actionLabel);
      doc.text(actionLabel, doc.internal.pageSize.getWidth() - actionLabelWidth - 20, yPosition);
      yPosition += 7;

      meeting.actionItems.forEach((item, idx) => {
        // Check if we need a new page
        if (yPosition > 260) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFont('helvetica', 'normal');

        // Action item number and description
        const itemText = `${idx + 1}. ${item.description}`;
        const maxWidth = doc.internal.pageSize.getWidth() - 45;
        const itemLines = doc.splitTextToSize(itemText, maxWidth);

        itemLines.forEach((line: string) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }
          const lineWidth = doc.getTextWidth(line);
          doc.text(line, doc.internal.pageSize.getWidth() - lineWidth - 25, yPosition);
          yPosition += 5;
        });

        // Vendor
        if (item.assigneeVendorId) {
          const vendor = vendors.find((v) => v.id === item.assigneeVendorId);
          if (vendor) {
            const vendorText = `   ספק: ${vendor.name}`;
            const vendorWidth = doc.getTextWidth(vendorText);
            doc.text(vendorText, doc.internal.pageSize.getWidth() - vendorWidth - 25, yPosition);
            yPosition += 5;
          }
        }

        // Assignee
        if (item.assigneeName) {
          const assigneeText = `   אחראי: ${item.assigneeName}`;
          const assigneeWidth = doc.getTextWidth(assigneeText);
          doc.text(assigneeText, doc.internal.pageSize.getWidth() - assigneeWidth - 25, yPosition);
          yPosition += 5;
        }

        // Due date
        if (item.dueDate) {
          const dueDateText = `   תאריך יעד: ${formatDateShort(item.dueDate)}`;
          const dueDateWidth = doc.getTextWidth(dueDateText);
          doc.text(dueDateText, doc.internal.pageSize.getWidth() - dueDateWidth - 25, yPosition);
          yPosition += 5;
        }

        // Status
        const statusText = `   סטטוס: ${item.status === 'COMPLETED' ? 'הושלמה' : 'בהמתנה'}`;
        const statusWidth = doc.getTextWidth(statusText);
        doc.text(statusText, doc.internal.pageSize.getWidth() - statusWidth - 25, yPosition);
        yPosition += 6;
      });
    }

    // Decisions
    if (meeting.decisions && meeting.decisions.length > 0) {
      yPosition += 2;

      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont('helvetica', 'bold');
      const decisionsLabel = 'החלטות:';
      const decisionsLabelWidth = doc.getTextWidth(decisionsLabel);
      doc.text(decisionsLabel, doc.internal.pageSize.getWidth() - decisionsLabelWidth - 20, yPosition);
      yPosition += 7;

      doc.setFont('helvetica', 'normal');
      meeting.decisions.forEach((decision, idx) => {
        if (decision) {
          // Check if we need a new page
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
          }

          const decisionText = `• ${decision}`;
          const maxWidth = doc.internal.pageSize.getWidth() - 45;
          const decisionLines = doc.splitTextToSize(decisionText, maxWidth);

          decisionLines.forEach((line: string) => {
            if (yPosition > 270) {
              doc.addPage();
              yPosition = 20;
            }
            const lineWidth = doc.getTextWidth(line);
            doc.text(line, doc.internal.pageSize.getWidth() - lineWidth - 25, yPosition);
            yPosition += 5;
          });
        }
      });
    }

    // Add spacing between meetings
    yPosition += 10;

    // Add separator line if not last meeting
    if (index < meetings.length - 1) {
      doc.setDrawColor(200, 200, 200);
      doc.line(20, yPosition, doc.internal.pageSize.getWidth() - 20, yPosition);
      yPosition += 10;
    }
  });

  // Save the PDF
  const fileName = `פגישות_${projectName}_${formatDateShort(new Date())}.pdf`;
  doc.save(fileName);
};
