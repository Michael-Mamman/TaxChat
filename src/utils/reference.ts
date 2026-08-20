import crypto from "crypto";

/**
 * A short, human-readable reference the taxpayer can quote back.
 *
 * Unambiguous alphabet: no O/0 or I/1, because these get read aloud over the
 * phone and copied off a screen.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomReference(length = 8): string {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}
