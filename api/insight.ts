import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tasks = [], time = '', userName = 'Miki' } = req.body || {};
  const apiKey = process.env.GROK_API_KEY;

  if (!apiKey) {
    console.error('GROK_API_KEY is missing');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const payload = {
      model: 'grok-beta',
      messages: [
        {
          role: 'system',
          content: 'Generate a short, personal greeting and dynamic study insight for the student. Use the context provided (tasks, time, userName) to make it highly relevant. Keep it under 25 words.',
        },
        {
          role: 'user',
          content: `User: ${userName}, Time: ${time}, Tasks: ${JSON.stringify((tasks || []).slice(0, 3))}`,
        },
      ],
      stream: false,
    };

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('xAI API Error Response (Insight):', JSON.stringify(data));
      return res.status(response.status).json({ error: data.error || 'xAI API Error' });
    }

    if (!data?.choices?.[0]?.message) {
      console.error('xAI API Invalid Structure (Insight):', JSON.stringify(data));
      return res.status(502).json({ error: 'Invalid response structure from AI' });
    }

    const greeting = data.choices[0].message.content || `Good day, ${userName}! Let's crush those tasks.`;
    return res.status(200).json({ greeting });
  } catch (error) {
    console.error('Grok Insight Fatal Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
