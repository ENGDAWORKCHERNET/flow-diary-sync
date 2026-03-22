import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body || {};
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
          content: 'You are StudyFlow AI, a smart assistant for students. Help them manage tasks and stay productive. You can suggest commands like [add_task: Title], [complete_task: ID], or [show_tasks] in your response if the user asks. Keep responses concise and encouraging.',
        },
        ...(messages || []),
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
      console.error('xAI API Error Response:', JSON.stringify(data));
      return res.status(response.status).json({ error: data.error || 'xAI API Error' });
    }

    if (!data?.choices?.[0]?.message) {
      console.error('xAI API Invalid Structure:', JSON.stringify(data));
      return res.status(502).json({ error: 'Invalid response structure from AI' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Grok API Fatal Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
