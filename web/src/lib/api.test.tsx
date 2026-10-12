import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";

afterEach(() => vi.unstubAllGlobals());
describe("private API boundary", () => {
  it("sends financial values only in JSON to loopback with no cache or credentials", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ programs: [] }) });
    vi.stubGlobal("fetch", fetcher);
    await api.screen({
      state: "NY",
      household_size: 1,
      monthly_gross_income: 1456,
      household_confirmed: null,
      lifeline_already_received: null,
      school_participating: null,
      wic_category: null,
    });
    expect(fetcher.mock.calls[0][0]).toBe("http://127.0.0.1:8000/api/screen");
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      method: "POST",
      cache: "no-store",
      credentials: "omit",
    });
    expect(fetcher.mock.calls[0][1].body).toContain("1456");
  });
  it("reports unavailable engine without a fabricated response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(api.health()).rejects.toThrow(
      "local engine could not respond",
    );
  });
});
