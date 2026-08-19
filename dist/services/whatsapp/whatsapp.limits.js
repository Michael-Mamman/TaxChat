/**
 * WhatsApp Cloud API (v22.0) field limits, and helpers for staying inside them.
 *
 * These live at the transport boundary rather than in each flow: a flow author
 * should be able to write the message they want and have it render correctly,
 * instead of remembering that reply-button titles cap at 20 characters.
 */
export const WA = {
    TEXT_BODY_MAX: 4096,
    INTERACTIVE_BODY_MAX: 1024,
    HEADER_MAX: 60,
    FOOTER_MAX: 60,
    LIST_ROWS_MAX: 10,
    ROW_TITLE_MAX: 24,
    ROW_DESCRIPTION_MAX: 72,
    REPLY_BUTTONS_MAX: 3,
    BUTTON_TITLE_MAX: 20,
};
/** Trim to `max`, preferring a word boundary, appending an ellipsis if cut. */
export function clamp(text, max) {
    const t = text.trim();
    if (t.length <= max)
        return t;
    const cut = t.slice(0, max - 1);
    const space = cut.lastIndexOf(" ");
    return (space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd() + "…";
}
/**
 * Interactive bodies cap at 1024 characters. Truncating would eat the flow's
 * actual content (assessment breakdowns and TCC summaries run long), so instead
 * split: send the head as a plain text message and keep the tail as the
 * interactive body. Prefers a paragraph break so the split reads naturally.
 */
export function splitInteractiveBody(body) {
    const t = body.trim();
    if (t.length <= WA.INTERACTIVE_BODY_MAX)
        return { body: t };
    const tailStart = t.length - WA.INTERACTIVE_BODY_MAX;
    const brk = t.indexOf("\n\n", tailStart);
    if (brk !== -1) {
        return { preamble: t.slice(0, brk).trim(), body: t.slice(brk + 2).trim() };
    }
    return { preamble: t.slice(0, tailStart).trim(), body: t.slice(tailStart).trim() };
}
/** Build a list row inside the row title/description limits. */
export function toRow(o) {
    const row = {
        id: o.id,
        title: clamp(o.title, WA.ROW_TITLE_MAX),
    };
    if (o.description)
        row.description = clamp(o.description, WA.ROW_DESCRIPTION_MAX);
    return row;
}
