export function isWithinAttendanceHours(opts: {
  start?: string | null;
  end?: string | null;
  now?: Date;
}): boolean {
  const start = opts.start ?? "08:00";
  const end = opts.end ?? "22:00";
  const now = opts.now ?? new Date();

  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [h, m] = fmt.format(now).split(":").map(Number);
  const current = h * 60 + m;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  return current >= s && current <= e;
}
