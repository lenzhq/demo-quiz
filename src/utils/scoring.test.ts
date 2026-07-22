import { describe, it, expect } from "vitest";
import {
  verdictDistance,
  scoreForDistance,
  streakBonus,
  oooTimeBonus,
  getTier,
} from "./scoring";

// ---------------------------------------------------------------------------
// verdictDistance
// ---------------------------------------------------------------------------

describe("verdictDistance", () => {
  it("returns 0 for identical verdicts", () => {
    expect(verdictDistance("True", "True")).toBe(0);
    expect(verdictDistance("False", "False")).toBe(0);
    expect(verdictDistance("Mostly True", "Mostly True")).toBe(0);
  });

  it("returns 1 for adjacent verdicts", () => {
    expect(verdictDistance("True", "Mostly True")).toBe(1);
    expect(verdictDistance("Mostly True", "Mixed")).toBe(1);
    expect(verdictDistance("Mixed", "Mostly False")).toBe(1);
    expect(verdictDistance("Mostly False", "False")).toBe(1);
  });

  it("returns 2 for two-step verdicts", () => {
    expect(verdictDistance("True", "Mixed")).toBe(2);
    expect(verdictDistance("Mostly True", "Mostly False")).toBe(2);
  });

  it("returns 4 for opposite verdicts (5-point scale)", () => {
    expect(verdictDistance("True", "False")).toBe(4);
    expect(verdictDistance("False", "True")).toBe(4);
  });

  it("maps the legacy 'Misleading' label to the Mixed slot", () => {
    expect(verdictDistance("Misleading", "Mixed")).toBe(0);
    expect(verdictDistance("True", "Misleading")).toBe(2);
  });

  it("is symmetric", () => {
    expect(verdictDistance("True", "False")).toBe(verdictDistance("False", "True"));
    expect(verdictDistance("Mostly True", "Mixed")).toBe(
      verdictDistance("Mixed", "Mostly True"),
    );
  });

  it("falls back to index 0 for unknown verdicts", () => {
    expect(verdictDistance("Unknown", "True")).toBe(0);
    expect(verdictDistance("Unknown", "False")).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// scoreForDistance
// ---------------------------------------------------------------------------

describe("scoreForDistance", () => {
  describe("5v mode", () => {
    it("awards 100 for exact match", () => {
      expect(scoreForDistance(0, "5v")).toBe(100);
    });

    it("awards 50 for distance 1", () => {
      expect(scoreForDistance(1, "5v")).toBe(50);
    });

    it("awards 25 for distance 2", () => {
      expect(scoreForDistance(2, "5v")).toBe(25);
    });

    it("awards 10 for distance 3", () => {
      expect(scoreForDistance(3, "5v")).toBe(10);
    });

    it("awards 0 for distance 4 (polar)", () => {
      expect(scoreForDistance(4, "5v")).toBe(0);
    });
  });

  describe("tf mode", () => {
    it("awards 50 for exact match", () => {
      expect(scoreForDistance(0, "tf")).toBe(50);
    });

    it("awards 0 for any miss", () => {
      expect(scoreForDistance(1, "tf")).toBe(0);
      expect(scoreForDistance(3, "tf")).toBe(0);
    });
  });

  describe("ooo mode (uses 5v scale)", () => {
    it("awards 100 for exact match", () => {
      expect(scoreForDistance(0, "ooo")).toBe(100);
    });
  });
});

// ---------------------------------------------------------------------------
// streakBonus
// ---------------------------------------------------------------------------

describe("streakBonus", () => {
  it("returns 0 when distance > 0", () => {
    expect(streakBonus(1, 5)).toBe(0);
    expect(streakBonus(2, 3)).toBe(0);
  });

  it("returns 0 when streak is 0 (even on exact match)", () => {
    expect(streakBonus(0, 0)).toBe(0);
  });

  it("returns streak * 10 on exact match with active streak", () => {
    expect(streakBonus(0, 1)).toBe(10);
    expect(streakBonus(0, 3)).toBe(30);
    expect(streakBonus(0, 7)).toBe(70);
  });
});

// ---------------------------------------------------------------------------
// oooTimeBonus
// ---------------------------------------------------------------------------

describe("oooTimeBonus", () => {
  it("awards 30 for answers within 5 seconds", () => {
    expect(oooTimeBonus(0)).toBe(30);
    expect(oooTimeBonus(3)).toBe(30);
    expect(oooTimeBonus(5)).toBe(30);
  });

  it("awards 20 for answers within 6-10 seconds", () => {
    expect(oooTimeBonus(6)).toBe(20);
    expect(oooTimeBonus(10)).toBe(20);
  });

  it("awards 10 for answers within 11-15 seconds", () => {
    expect(oooTimeBonus(11)).toBe(10);
    expect(oooTimeBonus(15)).toBe(10);
  });

  it("awards 0 for answers after 15 seconds", () => {
    expect(oooTimeBonus(16)).toBe(0);
    expect(oooTimeBonus(25)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getTier
// ---------------------------------------------------------------------------

describe("getTier", () => {
  describe("5v mode (multiplier = 1)", () => {
    it("returns Rookie Checker for low scores", () => {
      expect(getTier(0, "5v").label).toBe("Rookie Checker");
      expect(getTier(299, "5v").label).toBe("Rookie Checker");
    });

    it("returns Getting There at 300+", () => {
      expect(getTier(300, "5v").label).toBe("Getting There");
    });

    it("returns Truth Seeker at 500+", () => {
      expect(getTier(500, "5v").label).toBe("Truth Seeker");
    });

    it("returns Verification Pro at 700+", () => {
      expect(getTier(700, "5v").label).toBe("Verification Pro");
    });

    it("returns Verdict Virtuoso at 900+", () => {
      expect(getTier(900, "5v").label).toBe("Verdict Virtuoso");
      expect(getTier(1000, "5v").label).toBe("Verdict Virtuoso");
    });
  });

  describe("tf mode (multiplier = 0.5)", () => {
    it("thresholds are halved", () => {
      expect(getTier(0, "tf").label).toBe("Rookie Checker");
      expect(getTier(150, "tf").label).toBe("Getting There");
      expect(getTier(250, "tf").label).toBe("Truth Seeker");
      expect(getTier(350, "tf").label).toBe("Verification Pro");
      expect(getTier(450, "tf").label).toBe("Verdict Virtuoso");
    });
  });

  describe("ooo mode (multiplier = 0.7)", () => {
    it("thresholds are scaled to 0.7", () => {
      expect(getTier(0, "ooo").label).toBe("Rookie Checker");
      expect(getTier(210, "ooo").label).toBe("Getting There");
      expect(getTier(350, "ooo").label).toBe("Truth Seeker");
      expect(getTier(490, "ooo").label).toBe("Verification Pro");
      expect(getTier(630, "ooo").label).toBe("Verdict Virtuoso");
    });
  });

  it("includes emoji and color", () => {
    const tier = getTier(900, "5v");
    expect(tier.emoji).toBe("\u2728");
    expect(tier.color).toBe("text-true");
  });
});
