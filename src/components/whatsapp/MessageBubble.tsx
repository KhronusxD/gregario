type Message = {
  id: string;
  sent_by: "member" | "human" | "ia" | "system" | null;
  body: string | null;
  type: string | null;
  media_url: string | null;
  media_type: string | null;
  transcription: string | null;
  ai_analysis: string | null;
  created_at: string;
};

const SENDER_LABEL: Record<string, string> = {
  ia: "IA",
  human: "Operador",
  system: "Sistema",
  member: "",
};

export function MessageBubble({ msg }: { msg: Message }) {
  const sender = msg.sent_by ?? "member";
  const isInbound = sender === "member";
  const time = new Date(msg.created_at).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex ${isInbound ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[75%] rounded-lg px-4 py-2 font-sans text-sm shadow-card ${
          isInbound
            ? "bg-card text-forest-green"
            : sender === "system"
            ? "bg-forest-green/10 text-forest-green"
            : "bg-gradient-to-br from-forest-green to-action-green text-card"
        }`}
      >
        <MediaBlock msg={msg} inbound={isInbound} />
        {msg.body ? <p className="whitespace-pre-wrap">{msg.body}</p> : null}
        {msg.transcription ? (
          <div
            className={`mt-2 rounded-sm px-2 py-1 font-sans text-xs italic ${
              isInbound ? "bg-forest-green/5 text-forest-green/80" : "bg-card/15 text-card/85"
            }`}
          >
            <span className="font-bold not-italic">Transcrição:</span> {msg.transcription}
          </div>
        ) : null}
        {msg.ai_analysis ? (
          <div
            className={`mt-2 rounded-sm px-2 py-1 font-sans text-xs ${
              isInbound ? "bg-forest-green/5 text-forest-green/80" : "bg-card/15 text-card/85"
            }`}
          >
            <span className="font-bold">Análise IA:</span> {msg.ai_analysis}
          </div>
        ) : null}
        <p
          className={`mt-1 flex items-center gap-2 text-[10px] ${
            isInbound ? "text-forest-green/40" : "text-card/70"
          }`}
        >
          <span>{time}</span>
          {SENDER_LABEL[sender] ? <span>· {SENDER_LABEL[sender]}</span> : null}
        </p>
      </div>
    </div>
  );
}

function MediaBlock({ msg, inbound }: { msg: Message; inbound: boolean }) {
  const type = msg.type ?? "text";
  if (type === "text" || !type) return null;

  if (type === "image" && msg.media_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={msg.media_url}
        alt={msg.body ?? "Imagem"}
        className="mb-2 max-h-72 rounded-sm"
      />
    );
  }

  if (type === "audio") {
    return (
      <div
        className={`mb-2 flex items-center gap-2 rounded-sm px-2 py-1 text-xs ${
          inbound ? "bg-forest-green/5" : "bg-card/10"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <path
            d="M12 15a3 3 0 003-3V6a3 3 0 10-6 0v6a3 3 0 003 3zM5 12a7 7 0 0014 0M12 19v3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {msg.media_url ? (
          <audio controls src={msg.media_url} className="h-8 flex-1" />
        ) : (
          <span>Áudio</span>
        )}
      </div>
    );
  }

  if (type === "document" && msg.media_url) {
    return (
      <a
        href={msg.media_url}
        target="_blank"
        rel="noreferrer"
        className={`mb-2 flex items-center gap-2 rounded-sm px-2 py-1 text-xs underline ${
          inbound ? "bg-forest-green/5" : "bg-card/10"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
          <path
            d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M9 13h6 M9 17h4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {msg.body ?? "Abrir documento"}
      </a>
    );
  }

  return (
    <p
      className={`mb-2 text-xs italic ${
        inbound ? "text-forest-green/50" : "text-card/70"
      }`}
    >
      [{type}]
    </p>
  );
}
