import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp } from 'firebase/firestore';

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

async function addTestData(projectId: string) {
  console.log('🌱 מוסיף נתוני בדיקה...');

  try {
    // הוספת חדר אחד
    console.log('📦 מוסיף חדר מטבח...');
    const roomRef = await addDoc(collection(db, 'rooms'), {
      name: 'מטבח',
      roomType: 'KITCHEN',
      status: 'IN_PROGRESS',
      isUsable: false,
      icon: '👨‍🍳',
      projectId,
    });
    console.log('✅ חדר נוסף:', roomRef.id);

    // הוספת משימה אחת
    console.log('📋 מוסיף משימה...');
    const taskRef = await addDoc(collection(db, 'tasks'), {
      title: 'צביעת מטבח',
      description: 'צביעת כל הקירות והתקרה',
      category: 'PAINT',
      status: 'IN_PROGRESS',
      roomId: roomRef.id,
      budgetAllocated: 3500,
      projectId,
      dependencies: [],
    });
    console.log('✅ משימה נוספה:', taskRef.id);

    // הוספת ספק אחד
    console.log('👥 מוסיף ספק...');
    const vendorRef = await addDoc(collection(db, 'vendors'), {
      name: 'יוסי הצבע',
      category: 'צביעה',
      phone: '050-1234567',
      email: 'yossi@example.com',
      businessId: '123456789',
      contractAmount: 25000,
      projectId,
    });
    console.log('✅ ספק נוסף:', vendorRef.id);

    console.log('\n🎉 הצלחנו! רענן את הדפדפן');
  } catch (error) {
    console.error('❌ שגיאה:', error);
  }
}

const projectId = process.argv[2];
if (!projectId) {
  console.error('❌ חסר project ID');
  process.exit(1);
}

addTestData(projectId).then(() => process.exit(0));
