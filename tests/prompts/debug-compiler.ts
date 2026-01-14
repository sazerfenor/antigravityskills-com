/**
 * Debug Compiler API 响应结构
 */

const ADMIN_COOKIE = 'better-auth.session_token=l1jt4w9tTnZ1nBj2uTYTwGUqrRwWNgca.DTT37M2E1187OQWu0Zf%2FyQ7RB2O96eTtaP3e4w4C2p4%3D';

async function debugCompiler() {
  const plo = {
    core: {
      subject: 'a young woman',
      action: '',
    },
    custom_input: 'Golden hour beach portrait',
    layout_constraints: {
      ar: '1:1',
      text_render: false,
    },
    content_category: 'photography',
    primary_intent: {
      phrase: 'Golden Hour Aesthetic',
      category: 'aesthetic',
      confidence: 0.9,
    },
  };

  console.log('📤 Sending PLO:', JSON.stringify(plo, null, 2));

  const response = await fetch('http://localhost:3000/api/logic/compile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': ADMIN_COOKIE,
    },
    body: JSON.stringify({ plo }),
  });

  console.log('\n📥 Response status:', response.status);
  console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

  const data = await response.json();
  console.log('\n📥 Response body:', JSON.stringify(data, null, 2));
}

debugCompiler().catch(console.error);
