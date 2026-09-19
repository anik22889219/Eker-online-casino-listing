const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const appletConfig = require('./firebase-applet-config.json');

async function testDefaultDb() {
  console.log("=== Testing Firestore Admin Connection ===");
  try {
    const app = initializeApp({
      projectId: appletConfig.projectId
    }, 'default-db-test');
    const db = getFirestore(app);
    const snap = await db.collection("casinos").limit(1).get();
    console.log("Default Firestore connection SUCCESS! Documents found:", snap.size);
    process.exit(0);
  } catch (err) {
    console.error("Default Firestore connection FAILED:", err);
    process.exit(1);
  }
}

testDefaultDb();
