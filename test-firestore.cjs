const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

async function testDefaultDb() {
  console.log("=== Testing Korean Skin Food Default Database ===");
  try {
    const app = initializeApp({
      projectId: 'korean-skin-food'
    }, 'default-db-test');
    const db = getFirestore(app);
    const snap = await db.collection("casinos").limit(1).get();
    console.log("Default Firestore connection SUCCESS! Documents found:", snap.size);
  } catch (err) {
    console.error("Default Firestore connection FAILED:", err);
  }
}

testDefaultDb();
