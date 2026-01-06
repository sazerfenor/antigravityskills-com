const fs = require('fs');
const data = JSON.parse(fs.readFileSync('./src/data/cases.json', 'utf-8'));

const needsImageKeywords = [
  'upload',
  'reference image',
  'reference character',
  'based on the uploaded',
  'use the uploaded',
  'using this building', // from example_9
  'add a giant creature', // likely needs base image
];

const casesNeedingImage = [];
const textOnlyCases = [];

data.cases.forEach(c => {
  const promptLower = c.prompt.toLowerCase();
  const needsImage = needsImageKeywords.some(keyword => promptLower.includes(keyword));
  
  if (needsImage) {
    casesNeedingImage.push({ id: c.id, title: c.title, prompt: c.prompt.substring(0, 100) });
  } else {
    textOnlyCases.push({ id: c.id, title: c.title });
  }
});

console.log('='.repeat(60));
console.log(`Total cases: ${data.cases.length}`);
console.log(`Text-only cases: ${textOnlyCases.length}`);
console.log(`Cases needing image input: ${casesNeedingImage.length}`);
console.log('='.repeat(60));

console.log('\nCases that need image input:');
casesNeedingImage.forEach(c => {
  console.log(`\n- ${c.id}: ${c.title}`);
  console.log(`  Prompt: ${c.prompt}...`);
});

console.log('\n' + '='.repeat(60));
console.log('Text-only case IDs (for batch generation):');
console.log(textOnlyCases.map(c => c.id).join(', '));
