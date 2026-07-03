process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Deletes demo@mock.com from the whitelist using Firebase REST API + anonymous auth
// Firestore rules allow writes to @mock.com docs from any authenticated user
const API_KEY = "AIzaSyAtqTTEU9jJI6p-708K45a04D9l0fo4G0I";
const PROJECT_ID = "edu-app-926ac";

async function run() {
  // Sign in anonymously to get an auth token
  const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true })
  });
  const authData = await authRes.json();
  const token = authData.idToken;
  
  if (!token) {
    console.error('Failed to get auth token:', authData);
    return;
  }
  console.log('Got auth token (anonymous)');

  const email = 'demo@mock.com';
  const encodedEmail = encodeURIComponent(email);
  const docUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/whitelist/${encodedEmail}`;

  // Check if exists
  const getRes = await fetch(docUrl, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (getRes.status === 404) {
    console.log(`ℹ️  ${email} not found in whitelist (already clean).`);
    return;
  }
  
  const docData = await getRes.json();
  if (docData.error) {
    console.log(`ℹ️  ${email} not found or error:`, docData.error.message);
    return;
  }
  
  console.log(`Found ${email} in whitelist. Deleting...`);
  
  // Delete the document
  const deleteRes = await fetch(docUrl, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (deleteRes.ok) {
    console.log(`✅ Successfully deleted ${email} from whitelist.`);
  } else {
    const errData = await deleteRes.json();
    console.error('Failed to delete:', errData);
  }
}

run().catch(console.error);

