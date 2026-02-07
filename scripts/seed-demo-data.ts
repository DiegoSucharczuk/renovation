import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc, Timestamp } from 'firebase/firestore';

// Firebase config - עותק מ-.env.local
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedDemoData(projectId: string) {
  console.log('🌱 מתחיל להוסיף נתוני דוגמה...');

  try {
    // 1. הוספת חדרים
    console.log('📦 מוסיף חדרים...');
    const rooms = [
      {
        name: 'מטבח',
        roomType: 'KITCHEN',
        status: 'IN_PROGRESS',
        isUsable: false,
        icon: '👨‍🍳',
        projectId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        name: 'סלון',
        roomType: 'LIVING_ROOM',
        status: 'IN_PROGRESS',
        isUsable: true,
        icon: '🛋️',
        projectId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        name: 'חדר שינה ראשי',
        roomType: 'BEDROOM',
        status: 'DONE',
        isUsable: true,
        icon: '🛏️',
        projectId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        name: 'חדר אמבטיה',
        roomType: 'BATHROOM',
        status: 'NOT_STARTED',
        isUsable: false,
        icon: '🛁',
        projectId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    ];

    const roomIds: { [key: string]: string } = {};
    for (const room of rooms) {
      const docRef = await addDoc(collection(db, 'rooms'), room);
      roomIds[room.name] = docRef.id;
      console.log(`  ✓ ${room.icon} ${room.name}`);
    }

    // 2. הוספת משימות
    console.log('\n📋 מוסיף משימות...');
    const tasks = [
      // מטבח
      {
        title: 'צביעת מטבח',
        description: 'צביעת כל הקירות והתקרה בלבן',
        category: 'PAINT',
        status: 'DONE',
        roomId: roomIds['מטבח'],
        budgetAllocated: 3500,
        projectId,
        dependencies: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        title: 'התקנת ארונות מטבח',
        description: 'ארונות עליונים ותחתונים לפי תכנית',
        category: 'CARPENTRY',
        status: 'IN_PROGRESS',
        roomId: roomIds['מטבח'],
        budgetAllocated: 45000,
        projectId,
        dependencies: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        title: 'חשמל למטבח',
        description: 'נקודות חשמל לכל המכשירים',
        category: 'ELECTRICITY',
        status: 'DONE',
        roomId: roomIds['מטבח'],
        budgetAllocated: 8000,
        projectId,
        dependencies: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        title: 'אינסטלציה למטבח',
        description: 'צנרת למים חמים וקרים, ניקוז',
        category: 'PLUMBING',
        status: 'WAITING',
        roomId: roomIds['מטבח'],
        budgetAllocated: 6500,
        projectId,
        dependencies: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      // סלון
      {
        title: 'פרקט לסלון',
        description: 'פרקט למינציה איכותי',
        category: 'FLOORING',
        status: 'IN_PROGRESS',
        roomId: roomIds['סלון'],
        budgetAllocated: 12000,
        projectId,
        dependencies: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        title: 'גבס לתקרה',
        description: 'תקרת גבס עם תאורה שקועה',
        category: 'GENERAL',
        status: 'IN_PROGRESS',
        roomId: roomIds['סלון'],
        budgetAllocated: 8500,
        projectId,
        dependencies: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      // חדר שינה ראשי
      {
        title: 'צביעת חדר שינה',
        description: 'צביעה בגוון אפור בהיר',
        category: 'PAINT',
        status: 'DONE',
        roomId: roomIds['חדר שינה ראשי'],
        budgetAllocated: 2500,
        projectId,
        dependencies: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        title: 'ארון קיר לחדר שינה',
        description: 'ארון 3 מטר מקצה לקצה',
        category: 'CARPENTRY',
        status: 'DONE',
        roomId: roomIds['חדר שינה ראשי'],
        budgetAllocated: 18000,
        projectId,
        dependencies: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      // אמבטיה
      {
        title: 'ריצוף אמבטיה',
        description: 'ריצוף קרמיקה אנטי סליפ',
        category: 'FLOORING',
        status: 'NOT_STARTED',
        roomId: roomIds['חדר אמבטיה'],
        budgetAllocated: 7500,
        projectId,
        dependencies: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        title: 'אינסטלציה לאמבטיה',
        description: 'כל צנרת המים והניקוז',
        category: 'PLUMBING',
        status: 'NOT_STARTED',
        roomId: roomIds['חדר אמבטיה'],
        budgetAllocated: 9000,
        projectId,
        dependencies: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    ];

    for (const task of tasks) {
      await addDoc(collection(db, 'tasks'), task);
      console.log(`  ✓ ${task.title} (${task.status})`);
    }

    // 3. הוספת ספקים
    console.log('\n👥 מוסיף ספקים...');
    const vendors = [
      {
        name: 'יוסי הצבע',
        category: 'צביעה',
        phone: '050-1234567',
        email: 'yossi@example.com',
        businessId: '123456789',
        contractAmount: 25000,
        logoUrl: '',
        contractFileUrl: '',
        projectId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        name: 'אבי הנגר',
        category: 'נגרות',
        phone: '052-9876543',
        email: 'avi@example.com',
        businessId: '987654321',
        contractAmount: 85000,
        logoUrl: '',
        contractFileUrl: '',
        projectId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        name: 'דוד החשמלאי',
        category: 'חשמל',
        phone: '054-5555555',
        email: 'david@example.com',
        businessId: '555555555',
        contractAmount: 35000,
        logoUrl: '',
        contractFileUrl: '',
        projectId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        name: 'משה האינסטלטור',
        category: 'אינסטלציה',
        phone: '053-7777777',
        email: 'moshe@example.com',
        businessId: '777777777',
        contractAmount: 42000,
        logoUrl: '',
        contractFileUrl: '',
        projectId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    ];

    const vendorIds: { [key: string]: string } = {};
    for (const vendor of vendors) {
      const docRef = await addDoc(collection(db, 'vendors'), vendor);
      vendorIds[vendor.name] = docRef.id;
      console.log(`  ✓ ${vendor.name} - ${vendor.category}`);
    }

    // 4. הוספת תשלומים
    console.log('\n💰 מוסיף תשלומים...');
    const payments = [
      // יוסי הצבע
      {
        vendorId: vendorIds['יוסי הצבע'],
        projectId,
        date: Timestamp.fromDate(new Date('2026-01-15')),
        amount: 10000,
        method: 'העברה בנקאית',
        status: 'שולם',
        description: 'מקדמה',
        invoiceUrl: '',
        invoiceDescription: '',
        receiptUrl: '',
        receiptDescription: '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        vendorId: vendorIds['יוסי הצבע'],
        projectId,
        date: Timestamp.fromDate(new Date('2026-02-10')),
        amount: 15000,
        method: 'צ\'ק',
        status: 'מתוכנן',
        description: 'תשלום סופי',
        invoiceUrl: '',
        invoiceDescription: '',
        receiptUrl: '',
        receiptDescription: '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      // אבי הנגר
      {
        vendorId: vendorIds['אבי הנגר'],
        projectId,
        date: Timestamp.fromDate(new Date('2026-01-20')),
        amount: 30000,
        method: 'העברה בנקאית',
        status: 'שולם',
        description: 'מקדמה 35%',
        invoiceUrl: '',
        invoiceDescription: '',
        receiptUrl: '',
        receiptDescription: '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      {
        vendorId: vendorIds['אבי הנגר'],
        projectId,
        date: Timestamp.fromDate(new Date('2026-02-05')),
        amount: 25000,
        method: 'צ\'ק',
        status: 'שולם',
        description: 'תשלום ביניים',
        invoiceUrl: '',
        invoiceDescription: '',
        receiptUrl: '',
        receiptDescription: '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      // דוד החשמלאי
      {
        vendorId: vendorIds['דוד החשמלאי'],
        projectId,
        date: Timestamp.fromDate(new Date('2026-01-25')),
        amount: 15000,
        method: 'העברה בנקאית',
        status: 'שולם',
        description: 'מקדמה',
        invoiceUrl: '',
        invoiceDescription: '',
        receiptUrl: '',
        receiptDescription: '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
    ];

    for (const payment of payments) {
      await addDoc(collection(db, 'payments'), payment);
      console.log(`  ✓ ₪${payment.amount.toLocaleString()} - ${payment.description} (${payment.status})`);
    }

    console.log('\n✅ הושלם! נתוני הדוגמה נוספו בהצלחה');
    console.log(`\n📊 סיכום:`);
    console.log(`   • ${rooms.length} חדרים`);
    console.log(`   • ${tasks.length} משימות`);
    console.log(`   • ${vendors.length} ספקים`);
    console.log(`   • ${payments.length} תשלומים`);

  } catch (error) {
    console.error('❌ שגיאה:', error);
    throw error;
  }
}

// הרצה
const projectId = process.argv[2];
if (!projectId) {
  console.error('❌ חסר project ID');
  console.log('שימוש: npx ts-node scripts/seed-demo-data.ts <PROJECT_ID>');
  process.exit(1);
}

seedDemoData(projectId)
  .then(() => {
    console.log('\n🎉 סיימנו!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ נכשל:', error);
    process.exit(1);
  });
