#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { homedir } from 'os';

interface SubagentResult {
  status: 'completed' | 'running' | 'error' | 'not_found';
  result: string | null;
  error: string | null;
  agentId: string;
}

function findJsonlFile(agentId: string): string | null {
  try {
    const homeDir = homedir();
    const searchPath = `${homeDir}/.claude/projects`;

    // 使用 find 命令查找文件
    const cmd = `find "${searchPath}" -name "agent-${agentId}.jsonl" -type f 2>/dev/null | head -1`;
    const result = execSync(cmd, { encoding: 'utf-8' }).trim();

    if (result && existsSync(result)) {
      return result;
    }

    return null;
  } catch (error) {
    return null;
  }
}

function parseJsonlFile(filePath: string): SubagentResult | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    if (lines.length === 0) {
      return null;
    }

    // 从后向前查找最后一条 assistant 消息，包含文本内容
    let lastAssistantWithText: any = null;
    let lastStopReason: string | null = null;

    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]);

        if (entry.message?.role === 'assistant') {
          const contentArray = entry.message.content;

          // 提取文本内容
          let resultText = null;
          if (Array.isArray(contentArray) && contentArray.length > 0) {
            // 尝试多种方式提取文本
            for (const item of contentArray) {
              if (item.text) {
                resultText = item.text;
                break;
              } else if (item.type === 'text' && item.content) {
                resultText = item.content;
                break;
              }
            }
          }

          // 如果找到了文本内容，记录这条消息
          if (resultText && !lastAssistantWithText) {
            lastAssistantWithText = {
              text: resultText,
              agentId: entry.session_id || 'unknown'
            };
          }

          // 记录最后一条消息的 stop_reason
          if (i === lines.length - 1 || (entry.message.stop_reason && !lastStopReason)) {
            lastStopReason = entry.message.stop_reason;
          }
        }
      } catch (parseError) {
        // 跳过损坏的行
        continue;
      }
    }

    // 如果找到了文本内容，返回结果
    if (lastAssistantWithText) {
      return {
        status: lastStopReason === 'end_turn' ? 'completed' : 'running',
        result: lastAssistantWithText.text,
        error: null,
        agentId: lastAssistantWithText.agentId
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function main() {
  const agentId = process.argv[2];

  if (!agentId) {
    console.error('Usage: tsx get-subagent-result.ts <agentId>');
    process.exit(1);
  }

  // 查找文件
  const filePath = findJsonlFile(agentId);

  if (!filePath) {
    const result: SubagentResult = {
      status: 'not_found',
      result: null,
      error: 'Agent output file not found. Subagent may still be initializing. Wait 5-10 seconds and retry.',
      agentId
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  // 解析文件
  const parsed = parseJsonlFile(filePath);

  if (!parsed) {
    const result: SubagentResult = {
      status: 'error',
      result: null,
      error: 'Failed to parse agent output file. File may be corrupted or empty.',
      agentId
    };
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  // 输出结果
  console.log(JSON.stringify(parsed, null, 2));

  // 如果已完成，额外输出结果内容
  if (parsed.status === 'completed' && parsed.result) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('SUBAGENT RESULT:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(parsed.result);
  }

  process.exit(0);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
