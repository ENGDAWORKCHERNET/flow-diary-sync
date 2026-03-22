import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body || {};
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error('GROQ_API_KEY is missing');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const payload = {
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: 'You are StudyFlow AI, a smart assistant for students. Help them manage tasks and stay productive. IMPORTANT: If you need to add a task, include the tag [add_task: Task Title] exactly in your response. For completing, use [complete_task: ID]. To show tasks, use [show_tasks]. Responses should be concise and encouraging.',
        },
        ...(messages || []),
      ],
      stream: false,
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Groq API Error Response:', JSON.stringify(data));
      return res.status(response.status).json({ error: data.error || 'Groq API Error' });
    }

    if (!data?.choices?.[0]?.message) {
      console.error('Groq API Invalid Structure:', JSON.stringify(data));
      return res.status(502).json({ error: 'Invalid response structure from AI' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Groq API Fatal Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
