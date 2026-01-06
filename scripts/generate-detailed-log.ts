/**
 * 详细日志测试 - 输出完整的 Input/Prompt/Output
 * 供产品经理分析
 */

import casesData from '../src/data/cases.json';
import fs from 'fs';

async function generateDetailedLog() {
  console.log('='.repeat(80));
  console.log('📋 生成详细日志用于产品分析');
  console.log('='.repeat(80));

  const testCase = casesData.cases[0]; // example_1

  // ==================== PART 1: 输入数据 ====================
  const inputData = {
    userPrompt: testCase.prompt,
    referenceCaseId: testCase.id,
    referenceCaseTitle: testCase.title,
    referenceCaseSubject: testCase.structured?.subject,
    referenceCaseStyle: testCase.structured?.style,
    referenceCaseTechnique: testCase.structured?.technique,
    userLanguage: 'zh',
  };

  console.log('\n📥 PART 1: 输入数据');
  console.log(JSON.stringify(inputData, null, 2));

  // ==================== PART 2: Prompt Template ====================
  const promptTemplatePath = 'src/prompts/cases-optimization-combined.txt';
  const promptTemplate = fs.readFileSync(promptTemplatePath, 'utf-8');

  console.log('\n📄 PART 2: Prompt Template (完整内容)');
  console.log('文件路径:', promptTemplatePath);
  console.log('长度:', promptTemplate.length, '字符');
  console.log('\n--- Template 完整内容 ---');
  console.log(promptTemplate);
  console.log('--- Template 结束 ---\n');

  // ==================== PART 3: 替换后的 AI Prompt ====================
  const aiPrompt = promptTemplate
    .replace(/\{\{user_language\}\}/g, inputData.userLanguage)
    .replace(/\{\{reference_case_id\}\}/g, inputData.referenceCaseId)
    .replace(/\{\{reference_case_title\}\}/g, inputData.referenceCaseTitle)
    .replace(/\{\{reference_case_prompt\}\}/g, inputData.userPrompt)
    .replace(/\{\{reference_case_subject\}\}/g, inputData.referenceCaseSubject || '')
    .replace(/\{\{reference_case_style\}\}/g, inputData.referenceCaseStyle || '')
    .replace(/\{\{reference_case_technique\}\}/g, inputData.referenceCaseTechnique || '');

  console.log('\n🤖 PART 3: 发送给 AI 的完整 Prompt（变量已替换）');
  console.log('长度:', aiPrompt.length, '字符');
  console.log('\n--- AI Prompt 完整内容 ---');
  console.log(aiPrompt);
  console.log('--- AI Prompt 结束 ---\n');

  // ==================== PART 4: 调用 AI ====================
  console.log('\n⏳ PART 4: 调用 AI...');

  try {
    const { optimizeCasePrompt } = await import('../src/app/api/admin/cases/optimize/route');
    
    const aiResponse = await optimizeCasePrompt(inputData);

    console.log('\n✅ AI 返回成功');
    console.log('\n📤 PART 5: AI 返回的完整内容');
    console.log(JSON.stringify(aiResponse, null, 2));

    // ==================== PART 6: 保存到文件 ====================
    const logData = {
      timestamp: new Date().toISOString(),
      test_case_id: testCase.id,
      test_case_title: testCase.title,
      
      input: inputData,
      
      prompt_template: {
        path: promptTemplatePath,
        length: promptTemplate.length,
        content: promptTemplate,
      },
      
      ai_prompt: {
        length: aiPrompt.length,
        content: aiPrompt,
      },
      
      ai_response: aiResponse,
      
      analysis: {
        input_subject: inputData.referenceCaseSubject,
        input_title: inputData.referenceCaseTitle,
        output_prompt_preview: aiResponse.optimizedPrompt?.substring(0, 500),
        output_subject: aiResponse.structuredExtraction?.subject,
        
        subject_preserved: (
          aiResponse.optimizedPrompt?.toLowerCase().includes('ukiyoe') ||
          aiResponse.optimizedPrompt?.toLowerCase().includes('trading card')
        ) ? 'YES ✅' : 'NO ❌',
        
        wrong_subject_detected: (
          aiResponse.optimizedPrompt?.toLowerCase().includes('cat') ||
          aiResponse.optimizedPrompt?.toLowerCase().includes('lion') ||
          aiResponse.optimizedPrompt?.toLowerCase().includes('dragon')
        ) ? 'YES ❌ (Found wrong subject)' : 'NO ✅',
      }
    };

    const logFilePath = 'detailed-optimization-log.json';
    fs.writeFileSync(logFilePath, JSON.stringify(logData, null, 2));

    console.log('\n💾 完整日志已保存到:', logFilePath);
    console.log('\n' + '='.repeat(80));
    console.log('📊 快速分析结果:');
    console.log('  输入 Subject:', logData.analysis.input_subject);
    console.log('  输入 Title:', logData.analysis.input_title);
    console.log('  Subject 保留?', logData.analysis.subject_preserved);
    console.log('  检测到错误 Subject?', logData.analysis.wrong_subject_detected);
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('\n❌ 错误:', error.message);
    console.error(error.stack);
    
    // 即使出错也保存已有信息
    const errorLog = {
      timestamp: new Date().toISOString(),
      input: inputData,
      prompt_template: {
        path: promptTemplatePath,
        content: promptTemplate,
      },
      ai_prompt: {
        content: aiPrompt,
      },
      error: {
        message: error.message,
        stack: error.stack,
      }
    };
    
    fs.writeFileSync('detailed-optimization-log-ERROR.json', JSON.stringify(errorLog, null, 2));
    console.log('\n错误日志已保存到: detailed-optimization-log-ERROR.json');
  }
}

generateDetailedLog().catch(console.error);
