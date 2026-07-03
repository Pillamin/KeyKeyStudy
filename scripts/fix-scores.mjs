process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const API_KEY = "AIzaSyAtqTTEU9jJI6p-708K45a04D9l0fo4G0I";
const PROJECT_ID = "edu-app-926ac";

async function run() {
  const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true })
  });
  const authData = await authRes.json();
  const token = authData.idToken;

  const scoresRes = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/scores?pageSize=1000`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const scoresData = await scoresRes.json();
  if (!scoresData.documents) {
    console.log("No scores to update.");
    return;
  }

  let count = 0;
  for (const doc of scoresData.documents) {
    const id = doc.name.split('/').pop();
    const fields = doc.fields;
    
    // Calculate new scores out of 100
    const step1_acc = fields.step1_accuracy?.integerValue ? parseInt(fields.step1_accuracy.integerValue) : 0;
    const step2_acc = fields.step2_accuracy?.integerValue ? parseInt(fields.step2_accuracy.integerValue) : 0;
    
    const step1_score = Math.min(100, step1_acc);
    const step2_score = Math.min(100, step2_acc);
    
    const step3_correct = fields.step3_correct_count?.integerValue ? parseInt(fields.step3_correct_count.integerValue) : 0;
    const step3_total = fields.step3_total_count?.integerValue ? parseInt(fields.step3_total_count.integerValue) : 3;
    const step3_score = step3_total > 0 ? Math.floor((step3_correct / step3_total) * 100) : 0;
    
    const total_score = step1_score + step2_score + step3_score;

    const patchBody = {
      fields: {
        step1_score: { integerValue: step1_score.toString() },
        step2_score: { integerValue: step2_score.toString() },
        step3_score: { integerValue: step3_score.toString() },
        total_score: { integerValue: total_score.toString() }
      }
    };

    const updateRes = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/scores/${id}?updateMask.fieldPaths=step1_score&updateMask.fieldPaths=step2_score&updateMask.fieldPaths=step3_score&updateMask.fieldPaths=total_score`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(patchBody)
    });

    if (updateRes.ok) count++;
  }
  console.log(`Updated ${count} scores to max 300 pts format.`);
}

run().catch(console.error);
