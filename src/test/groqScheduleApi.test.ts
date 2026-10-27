import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/groq-schedule';

const validImage = `data:image/png;base64,${'a'.repeat(32)}`;
const validGroqResponse = {
  choices: [{
    message: {
      content: '{"classes":[]}',
    },
  }],
};

function createResponse() {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return response;
}

describe('schedule image API proxy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('forwards a validated image request using the server-only key', async () => {
    vi.stubEnv('GROQ_API_KEY', 'test-server-key');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => validGroqResponse,
    });
    vi.stubGlobal('fetch', fetchMock);

    const req = { method: 'POST', body: { image: validImage } };
    const res = createResponse();
    await handler(req as never, res as never);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect((options.headers as Record<string, string>).Authorization).toBe('Bearer test-server-key');
    const request = JSON.parse(options.body as string);
    expect(request.model).toBe('qwen/qwen3.8-27b');
    expect(request.temperature).toBe(0);
    expect(request.response_format).toEqual({ type: 'json_object' });
    expect(request.messages[1].content[1].image_url.url).toBe(validImage);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ content: '{"classes":[]}' });
  });

  it('rejects unsupported methods and malformed images without calling Groq', async () => {
    vi.stubEnv('GROQ_API_KEY', 'test-server-key');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const methodResponse = createResponse();
    await handler({ method: 'GET', body: {} } as never, methodResponse as never);
    expect(methodResponse.statusCode).toBe(405);

    const imageResponse = createResponse();
    await handler({ method: 'POST', body: { image: 'not-an-image' } } as never, imageResponse as never);
    expect(imageResponse.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves upstream error statuses without leaking the upstream response', async () => {
    vi.stubEnv('GROQ_API_KEY', 'test-server-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));

    const res = createResponse();
    await handler({ method: 'POST', body: { image: validImage } } as never, res as never);

    expect(res.statusCode).toBe(429);
    expect(res.body).toEqual({ error: 'Schedule parsing failed' });
  });

  it('returns a clear configuration error when the server key is missing', async () => {
    vi.stubEnv('GROQ_API_KEY', '');
    const res = createResponse();
    await handler({ method: 'POST', body: { image: validImage } } as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Schedule parser is not configured' });
  });
});
