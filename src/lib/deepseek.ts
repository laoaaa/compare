import axios from 'axios';

export async function convertToSimplified(text: string, apiKey: string): Promise<string> {
  if (!apiKey) {
    throw new Error('请先在设置中配置 DeepSeek API Key');
  }

  try {
    const response = await axios.post(
      'https://api.deepseek.com/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的繁简转换工具。请将用户输入的繁体中文文本转换为简体中文。直接输出转换后的文本，不要包含任何解释、前缀或后缀。保持原有标点和换行格式不变。'
          },
          {
            role: 'user',
            content: text
          }
        ],
        temperature: 0.1
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek API Error:', error);
    throw new Error('繁简转换失败，请检查 API Key 是否正确或网络连接');
  }
}
