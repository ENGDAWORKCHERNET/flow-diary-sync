import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;
  const apiKey = process.env.GROK_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          {
            role: 'system',
            content: 'You are StudyFlow AI, a smart assistant for students. Help them manage tasks and stay productive. You can suggest commands like [add_task: Title], [complete_task: ID], or [show_tasks] in your response if the user asks. Keep responses concise and encouraging.',
          },
          ...(messages || []),
        ],
        stream: false,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('xAI API Client Error:', data);
      return res.status(response.status).json({ error: data.error || 'xAI API Error' });
    }

    if (!data.choices || !data.choices[0]) {
      console.error('xAI API Unexpected Response:', data);
      return res.status(502).json({ error: 'Invalid response from AI provider' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Grok API Server Error:', error);
    return res.status(500).json({ error: 'Failed to communicate with Grok AI' });
  }
}
