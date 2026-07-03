import admin from 'firebase-admin';

admin.initializeApp();

const db = admin.firestore();
db.collection('classes').get().then(snap => {
  console.log("Classes found: " + snap.docs.length);
}).catch(e => console.error(e));
