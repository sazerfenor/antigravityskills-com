/**
 * Debug script to inspect actual API response structure
 */

const API_ENDPOINT = 'http://localhost:3000/api/logic/intent';
const ADMIN_COOKIE = 'better-auth.session_token=l1jt4w9tTnZ1nBj2uTYTwGUqrRwWNgca.DTT37M2E1187OQWu0Zf%2FyQ7RB2O96eTtaP3e4w4C2p4%3D';

async function debugAPIResponse() {
  console.log('🔍 Debugging API Response Structure\n');

  const testInput = { input: '一个女孩' };
  console.log('📤 Sending request:', JSON.stringify(testInput));

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': ADMIN_COOKIE,
    },
    body: JSON.stringify(testInput),
  });

  if (!response.ok) {
    console.error('❌ API Error:', response.status, response.statusText);
    const errorText = await response.text();
    console.error('Response:', errorText);
    return;
  }

  const data = await response.json();
  console.log('\n📥 Raw API Response:');
  console.log(JSON.stringify(data, null, 2));

  console.log('\n📊 Response Structure Analysis:');
  console.log('- Top-level keys:', Object.keys(data));
  console.log('- Has "data" key?', 'data' in data);
  console.log('- Has "schema" key?', 'schema' in data);

  if (data.data) {
    console.log('- data keys:', Object.keys(data.data));
  }
  if (data.schema) {
    console.log('- schema keys:', Object.keys(data.schema));
    console.log('- schema.primary_intent:', data.schema.primary_intent);
    console.log('- schema.content_category:', data.schema.content_category);
    console.log('- schema.fields?.length:', data.schema.fields?.length);
  }
}

debugAPIResponse().catch(console.error);
