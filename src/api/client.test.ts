import { describe, expect, it } from "vitest";

import { isApiVersionError } from "./client";

describe("isApiVersionError", () => {
  it("recognises the SDK's version error by its field", () => {
    const err = Object.assign(new Error("answered in 2026-05-13"), { apiVersion: "2026-05-13" });
    expect(isApiVersionError(err)).toBe(true);
  });

  it("leaves every other failure to the generic message", () => {
    expect(isApiVersionError(new Error("network"))).toBe(false);
    expect(isApiVersionError(null)).toBe(false);
    expect(isApiVersionError(undefined)).toBe(false);
  });
});
