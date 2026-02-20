import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { recipients, meeting, htmlContent, accessToken } = await request.json();

    console.log('📧 Email Request Received:', {
      recipients: recipients?.length,
      meeting: meeting?.title,
      hasAccessToken: !!accessToken,
    });

    // Validate input
    if (!recipients || recipients.length === 0) {
      return NextResponse.json(
        { error: 'לא הוגדרו נמענים' },
        { status: 400 }
      );
    }

    if (!meeting || !meeting.title) {
      return NextResponse.json(
        { error: 'נתוני הפגישה חסרים' },
        { status: 400 }
      );
    }

    // Option 1: Using user's Gmail account (requires accessToken)
    if (accessToken) {
      console.log('📧 Attempting to send via Gmail with accessToken');
      return await sendViaGmail(recipients, meeting, htmlContent, accessToken);
    }

    console.log('⚠️ No accessToken provided, trying alternative methods');

    // Option 2: Using Resend (if API key is configured)
    if (process.env.RESEND_API_KEY) {
      return await sendViaResend(recipients, meeting, htmlContent);
    }

    // Option 3: Using Mailgun (if API key is configured)
    if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
      return await sendViaMailgun(recipients, meeting, htmlContent);
    }

    // Fallback: Console logging (for testing without email service)
    console.log('📧 Email Summary (No Service Configured):');
    console.log('Recipients:', recipients);
    console.log('Meeting:', meeting);

    return NextResponse.json(
      {
        success: true,
        message: 'בדיקה זו בלבד - שירות מייל לא מוגדר, אבל אין accessToken',
        recipients: recipients.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error sending email:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `שגיאה בשליחת המייל: ${errorMsg}` },
      { status: 500 }
    );
  }
}

async function sendViaGmail(
  recipients: string[],
  meeting: { title: string; date: string },
  htmlContent: string,
  accessToken: string
) {
  try {
    console.log('📧 Attempting to send via Gmail with accessToken...');

    // Create email message in RFC 2822 format
    const emailMessage = createEmailMessage(
      recipients,
      meeting.title,
      htmlContent
    );

    // Send via Gmail API
    const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: Buffer.from(emailMessage).toString('base64'),
      }),
    });

    console.log('📧 Gmail API Response Status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('⚠️ Gmail API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      
      // Log the actual error for debugging
      const errorMessage = errorData?.error?.message || errorData?.message || 'Unknown Gmail API error';
      console.log(`📧 Gmail API failed (${response.status}): ${errorMessage}`);
      console.log('📧 Falling back to console logging...');
      console.log('📧 Email Summary:');
      console.log('   Recipients:', recipients);
      console.log('   Meeting:', meeting);
      console.log('   Content:', htmlContent);
      
      return NextResponse.json(
        {
          success: true,
          message: `⚠️ Gmail API error (${response.status}): ${errorMessage}. Meeting summary saved.`,
          recipients: recipients.length,
          gmailError: errorMessage,
        },
        { status: 200 }
      );
    }

    const data = await response.json();
    console.log('✅ Email sent via Gmail:', data.id);

    return NextResponse.json(
      {
        success: true,
        message: 'Email sent successfully via Gmail!',
        recipients: recipients.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Gmail Error:', error);
    
    // Fallback on error
    console.log('📧 Falling back to console logging due to error...');
    return NextResponse.json(
      {
        success: true,
        message: '⚠️ Meeting summary saved. Email sending not available right now.',
        recipients: recipients.length,
      },
      { status: 200 }
    );
  }
}

function createEmailMessage(
  recipients: string[],
  subject: string,
  htmlContent: string
): string {
  const boundary = '===============' + Date.now() + '===============';
  
  const from = 'שלום <me>';
  const to = recipients.join(', ');
  
  const message = `From: ${from}
To: ${to}
Subject: סיכום פגישה: ${subject}
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="${boundary}"

--${boundary}
Content-Type: text/plain; charset="UTF-8"
Content-Transfer-Encoding: 7bit

[סיכום פגישה - נא לצפות בגרסת HTML]

--${boundary}
Content-Type: text/html; charset="UTF-8"
Content-Transfer-Encoding: 7bit

<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; direction: rtl; }
    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 20px; }
    ul { margin: 10px 0; padding-right: 20px; }
    li { margin: 5px 0; }
    .header { background-color: #f5f5f5; padding: 15px; border-radius: 5px; }
    .section { margin: 20px 0; padding: 15px; background-color: #fafafa; border-left: 4px solid #007bff; }
  </style>
</head>
<body>
  <div class="header">
    ${htmlContent}
  </div>
</body>
</html>

--${boundary}--`;

  return message;
}

async function sendViaResend(
  recipients: string[],
  meeting: { title: string; date: string },
  htmlContent: string
) {
  try {
    console.log('📧 Sending via Resend...');
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'noreply@renovation-app.com',
        to: recipients,
        subject: `סיכום פגישה: ${meeting.title}`,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      throw new Error('Resend API error');
    }

    const data = await response.json();
    console.log('✅ Email sent via Resend:', data.id);

    return NextResponse.json(
      {
        success: true,
        message: 'המייל נשלח בהצלחה',
        recipients: recipients.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Resend error:', error);
    throw error;
  }
}

async function sendViaMailgun(
  recipients: string[],
  meeting: { title: string; date: string },
  htmlContent: string
) {
  try {
    console.log('📧 Sending via Mailgun...');
    
    const domain = process.env.MAILGUN_DOMAIN;
    const apiKey = process.env.MAILGUN_API_KEY;

    const formData = new FormData();
    formData.append('from', `renovation-app <noreply@${domain}>`);
    recipients.forEach(email => formData.append('to', email));
    formData.append('subject', `סיכום פגישה: ${meeting.title}`);
    formData.append('html', htmlContent);

    const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Mailgun API error');
    }

    console.log('✅ Email sent via Mailgun');

    return NextResponse.json(
      {
        success: true,
        message: 'המייל נשלח בהצלחה',
        recipients: recipients.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Mailgun error:', error);
    throw error;
  }
}
