/**
 * Captures everything the bot tries to send, as structured replies.
 *
 * The stubbed axios in tests/setup.ts funnels every Graph API request here, so
 * assertions run against the actual request body WhatsApp would have received -
 * including interactive type, button count and title lengths.
 */
export type ReplyKind = "text" | "buttons" | "list" | "flow" | "template" | "document" | "image" | "read" | "other";

export interface Reply {
  kind: ReplyKind;
  /** Body text as the taxpayer would read it. */
  body: string;
  /** Selectable options, for buttons and lists alike. */
  options: Array<{ id: string; title: string; description?: string }>;
  raw: Record<string, unknown>;
}

const captured: Reply[] = [];

export function recordOutbound(url: string, body: unknown): void {
  if (!/graph\.facebook\.com/.test(url)) return;
  captured.push(classify(body as Record<string, unknown>));
}

function classify(payload: Record<string, unknown>): Reply {
  const base = { raw: payload, options: [] as Reply["options"] };

  if (payload.status === "read") return { ...base, kind: "read", body: "" };
  if (payload.type === "template") return { ...base, kind: "template", body: String((payload.template as any)?.name ?? "") };
  if (payload.type === "document") return { ...base, kind: "document", body: String((payload.document as any)?.caption ?? "") };
  if (payload.type === "image") return { ...base, kind: "image", body: String((payload.image as any)?.caption ?? "") };

  const interactive = payload.interactive as any;
  if (interactive) {
    const body = String(interactive.body?.text ?? "");
    if (interactive.type === "button") {
      return {
        ...base,
        kind: "buttons",
        body,
        options: (interactive.action?.buttons ?? []).map((b: any) => ({ id: b.reply.id, title: b.reply.title })),
      };
    }
    if (interactive.type === "list") {
      const rows = (interactive.action?.sections ?? []).flatMap((s: any) => s.rows ?? []);
      return { ...base, kind: "list", body, options: rows.map((r: any) => ({ id: r.id, title: r.title, description: r.description })) };
    }
    if (interactive.type === "flow") return { ...base, kind: "flow", body };
  }

  if (payload.text) return { ...base, kind: "text", body: String((payload.text as any).body ?? "") };
  return { ...base, kind: "other", body: "" };
}

/** Return everything captured since the last drain, and reset. Read receipts are dropped. */
export function drainOutbound(): Reply[] {
  const out = captured.splice(0, captured.length);
  return out.filter((r) => r.kind !== "read");
}

export function resetOutbound(): void {
  captured.length = 0;
}
