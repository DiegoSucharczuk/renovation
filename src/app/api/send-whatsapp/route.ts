import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumbers, meeting, messageText } = await request.json();

    console.log('💬 WhatsApp Request Received:', {
      phoneNumbers: phoneNumbers?.length,
      meeting: meeting?.title,
    });

    // Validate input
    if (!phoneNumbers || phoneNumbers.length === 0) {
      return NextResponse.json(
        { error: 'לא הוגדרו מספרי טלפון' },
        { status: 400 }
      );
    }

    if (!meeting || !meeting.title) {
      return NextResponse.json(
        { error: 'נתוני הפגישה חסרים' },
        { status: 400 }
      );
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneNumberId || !accessToken) {
      console.warn('⚠️ WhatsApp credentials not configured');
      return NextResponse.json(
        {
          success: false,
          message: 'WhatsApp not configured - add WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN to .env',
          recipients: 0,
        },
        { status: 400 }
      );
    }

    // Send to each phone number
    const results = await Promise.allSettled(
      phoneNumbers.map((phoneNumber: string) =>
        sendWhatsAppMessage(phoneNumber, meeting, messageText, phoneNumberId, accessToken)
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`💬 WhatsApp Results: ${successful} sent, ${failed} failed`);

    if (successful === 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Failed to send WhatsApp messages to ${phoneNumbers.length} recipients`,
          recipients: 0,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `💬 סיכום הפגישה נשלח ל-${successful} מספרי טלפון בחץ'אפ'`,
        recipients: successful,
        failed,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ WhatsApp Error:', error);
    return NextResponse.json(
      { error: 'שגיאה בשליחת הודעת WhatsApp' },
      { status: 500 }
    );
  }
}

async function sendWhatsAppMessage(
  phoneNumber: string,
  meeting: { title: string; date: string },
  messageText: string,
  phoneNumberId: string,
  accessToken: string
) {
  // Clean phone number (remove spaces, dashes, etc.)
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  // Format: +{country_code}{phone}
  // Assuming Israeli numbers (add 972 if starting with 0)
  let formattedPhone = cleanPhone;
  if (cleanPhone.startsWith('0')) {
    formattedPhone = '972' + cleanPhone.substring(1);
  } else if (!cleanPhone.startsWith('972')) {
    formattedPhone = '972' + cleanPhone;
  }

  const url = `https://graph.instagram.com/v18.0/${phoneNumberId}/messages`;

  const body = {
    messaging_product: 'whatsapp',
    to: formattedPhone,
    type: 'text',
    text: {
      body: messageText,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error(`❌ Failed to send WhatsApp to ${phoneNumber}:`, error);
    throw new Error(`WhatsApp API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  console.log(`✅ WhatsApp sent to ${phoneNumber}:`, data.messages[0].id);
  return data;
}
