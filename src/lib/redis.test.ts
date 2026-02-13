import { describe, it, expect } from "vitest";

describe("getAppSetting / setAppSetting", () => {
  it("getAppSetting retorna string ou null para chaves conhecidas", async () => {
    const { getAppSetting } = await import("./redis");
    const allow = await getAppSetting("allow_custom_matches");
    const queues = await getAppSetting("queues_disabled");
    expect(allow === "0" || allow === "1" || allow === null).toBe(true);
    expect(queues === "0" || queues === "1" || queues === null).toBe(true);
  });

  it("setAppSetting e getAppSetting round-trip", async () => {
    const { getAppSetting, setAppSetting } = await import("./redis");
    await setAppSetting("allow_custom_matches", "1");
    const v = await getAppSetting("allow_custom_matches");
    expect(v).toBe("1");
    await setAppSetting("allow_custom_matches", "0");
  });
});
