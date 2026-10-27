import type { VercelRequest, VercelResponse } from '@vercel/node';

const SYSTEM_PROMPT = `You are a schedule parser. Return ONLY valid JSON matching this exact schema:
{"classes":[{"name":"string","day":"Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday","startTime":"HH:mm","endTime":"HH:mm","location":"string or null","instructor":"string or null"}]}
Rules: times in 24-hour format; if the schedule is a recurring weekly timetable, output one entry per day; if it's a one-off dated event, output the day of week for that date; never invent information — use null for missing fields.`;

const MAX_IMAGE_DATA_URL_LENGTH = 4_000_000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error('GROQ_API_KEY is missing');
    return res.status(500).json({ error: 'Schedule parser is not configured' });
  }

  const { image } = req.body ?? {};
  if (
    typeof image !== 'string' ||
    image.length > MAX_IMAGE_DATA_URL_LENGTH ||
    !/^data:image\/(?:jpeg|png|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)
  ) {
    return res.status(400).json({ error: 'A supported schedule image is required' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.8-27b',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Extract every class from this schedule image.' },
              { type: 'image_url', image_url: { url: image } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error(`Groq schedule request failed with HTTP status ${response.status}`);
      return res.status(response.status).json({ error: 'Schedule parsing failed' });
    }

    const result = await response.json() as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = result.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      console.error('Groq returned no schedule content');
      return res.status(502).json({ error: 'Schedule parser returned an invalid response' });
    }

    return res.status(200).json({ content });
  } catch (error) {
    console.error('Schedule parser request failed:', error);
    return res.status(502).json({ error: 'Schedule parser is temporarily unavailable' });
  }
}
