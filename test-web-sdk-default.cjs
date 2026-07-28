const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, limit, query } = require('firebase/firestore');
const appletConfig = require('./firebase-applet-config.json');

async function testWebSdkDefault() {
  console.log("=== Testing Web SDK Default Database ===");
  try {
    const firebaseConfig = {
      apiKey: appletConfig.apiKey,
      authDomain: appletConfig.authDomain,
      projectId: appletConfig.projectId,
      storageBucket: appletConfig.storageBucket,
      messagingSenderId: appletConfig.messagingSenderId,
      appId: appletConfig.appId,
    };
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    console.log("Web SDK Initialized. Querying 'casinos' collection on (default)...");
    const q = query(collection(db, "casinos"), limit(1));
    const snap = await getDocs(q);
    console.log("Web SDK connection SUCCESS on (default)! Documents found:", snap.size);
  } catch (err) {
    console.error("Web SDK connection FAILED on (default):", err);
  }
}

testWebSdkDefault();
