import "server-only";

export async function transcribeAudio(params: {
  url: string;
  mimeType?: string;
}): Promise<{ text: string | null; error?: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { text: null, error: "OPENAI_API_KEY ausente" };
  }

  try {
    const audioRes = await fetch(params.url);
    if (!audioRes.ok) {
      return { text: null, error: `download falhou: ${audioRes.status}` };
    }
    const buf = await audioRes.arrayBuffer();
    const mime = params.mimeType || audioRes.headers.get("content-type") || "audio/ogg";
    const ext = mime.includes("mpeg") ? "mp3" : mime.includes("wav") ? "wav" : mime.includes("mp4") || mime.includes("m4a") ? "m4a" : "ogg";
    const blob = new Blob([buf], { type: mime });

    const form = new FormData();
    form.append("file", blob, `audio.${ext}`);
    form.append("model", "whisper-1");
    form.append("language", "pt");
    form.append("response_format", "text");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!res.ok) {
      return { text: null, error: `whisper ${res.status}: ${await res.text()}` };
    }
    const text = (await res.text()).trim();
    return { text: text || null };
  } catch (err) {
    return { text: null, error: err instanceof Error ? err.message : String(err) };
  }
}
