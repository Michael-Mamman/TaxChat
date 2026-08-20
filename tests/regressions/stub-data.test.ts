/**
 * Stub integrations stand in for NRS systems that are not yet available. They
 * must still behave plausibly: a taxpayer searching for their own name being
 * shown a different person's record reads as a data leak, whether or not the
 * data is synthetic.
 */
import { describe, it, expect } from "vitest";
import jtbService from "../../src/services/integrations/jtb.service.js";

describe("JTB stub", () => {
  it("returns records matching the name that was searched for", async () => {
    const result = await jtbService.lookupTIN({ name: "Yakubu Michael", phone: "07030034134" });

    expect(result.success).toBe(true);
    for (const match of result.data ?? []) {
      expect(match.taxpayer_name).toMatch(/Yakubu|Michael/);
    }
  });

  it("does not leak a hardcoded third party", async () => {
    const result = await jtbService.lookupTIN({ name: "Chidi Okonkwo" });
    const names = (result.data ?? []).map((m) => m.taxpayer_name).join(" ");
    expect(names).not.toMatch(/Amina Bello/);
  });
});
