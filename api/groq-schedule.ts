import type { VercelRequest, VercelResponse } from '@vercel/node';

const SYSTEM_PROMPT = `You are an expert schedule parser. Return ONLY valid JSON matching this exact schema:
{"classes":[{"name":"string","day":"Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday","startTime":"HH:mm","endTime":"HH:mm","location":"string or null","instructor":"string or null"}]}

Extraction Rules:
1. Class Name: Check the entire image for course codes and titles, including any legend or key at the bottom or top of the timetable (e.g., "SE2223 : Web Design & Development II"). When a course code matches a title in the legend, combine both into the name in the format: "<Code> - <Title>" (e.g. "SE2223 - Web Design & Development II"). If only the code or only the title is present, use what is shown.
2. Accurate Times (24-hour format HH:mm):
   - Read the exact start and end minutes printed on the period/time slots (e.g., 08:00-09:30, 09:45-11:15, 02:00-03:30, 03:30-05:00). NEVER round or truncate minutes like :30 or :15 to :00.
   - For daytime/school schedules, afternoon and evening hours must be converted to 24-hour time (e.g., 01:00 -> 13:00, 02:00 -> 14:00, 03:30 -> 15:30, 05:00 -> 17:00), even if the timetable incorrectly labels them with "AM".
   - The endTime MUST be chronologically after startTime (e.g. for a slot labeled 11:30-01:00, the 24-hour time is 11:30 to 13:00).
3. Day of Week: Map column headers to full day names (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday).
4. Location & Instructor: Extract room/hall numbers (e.g., "LR 301") into location. If instructor is not stated, use null. Never invent details.`;

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
              { type: 'text', text: 'Extract every class from this schedule image. Look at any legend or key to get full class names, read exact time slot minutes without rounding, and output all times in 24-hour format.' },
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
