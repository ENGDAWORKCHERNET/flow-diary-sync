import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseScheduleImage } from '@/lib/groqSchedule';

const parsedResponse = {
  choices: [{
    message: {
      content: JSON.stringify({
        classes: [{
          name: 'Math',
          day: 'Monday',
          startTime: '09:00',
          endTime: '10:00',
          location: 'Room 2',
          instructor: null,
        }],
      }),
    },
  }],
};

describe('parseScheduleImage', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('sends the image to the server proxy and returns parsed classes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: parsedResponse.choices[0].message.content }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(parseScheduleImage('data:image/png;base64,abc')).resolves.toEqual(
      JSON.parse(parsedResponse.choices[0].message.content).classes
    );

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/groq-schedule');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(options.body as string)).toEqual({ image: 'data:image/png;base64,abc' });
  });

  it('includes the proxy HTTP status when a request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));

    await expect(parseScheduleImage('data:image/png;base64,abc'))
      .rejects.toThrow('HTTP status 429');
  });

  it('throws a clear error for invalid response JSON content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: '{bad json' }),
    }));

    await expect(parseScheduleImage('data:image/png;base64,abc'))
      .rejects.toThrow('Groq returned invalid JSON for the schedule');
  });

  it('rejects invalid class data from the proxy', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ content: JSON.stringify({ classes: [{ name: 'Math' }] }) }),
    }));

    await expect(parseScheduleImage('data:image/png;base64,abc'))
      .rejects.toThrow('Groq returned schedule data in an invalid format');
  });
});
