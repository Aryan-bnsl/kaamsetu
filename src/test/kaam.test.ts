import { describe, it, expect } from "vitest";
import { matchJob, resolveDateWord, missingFields, EMPTY_DRAFT, distanceKm, todayIST } from "@/lib/kaam";

const job = { skill: "painter", locality: "Vaishali", work_date: "2026-11-16", wage: 900, wage_unit: "day", status: "open" };
const f = { skill: null, locality: null, date: null, minWage: null, wageUnit: null } as const;

describe("matching", () => {
  it("matches painter in Vaishali with min 900/day", () => {
    expect(matchJob(job, { ...f, skill: "painter", locality: "Vaishali", minWage: 900, wageUnit: "day" }, "2026-11-15")).toEqual(["skill", "locality", "wage"]);
  });
  it("rejects lower wage", () => {
    expect(matchJob(job, { ...f, minWage: 1000, wageUnit: "day" }, "2026-11-15")).toBeNull();
  });
  it("never compares hourly with daily wages", () => {
    expect(matchJob({ ...job, wage: 150, wage_unit: "hour" }, { ...f, minWage: 100, wageUnit: "day" }, "2026-11-15")).toBeNull();
  });
  it("excludes past and non-open jobs", () => {
    expect(matchJob(job, f, "2026-11-17")).toBeNull();
    expect(matchJob({ ...job, status: "filled" }, f, "2026-11-15")).toBeNull();
  });
});

describe("dates in Asia/Kolkata", () => {
  it("kal resolves to IST tomorrow even late UTC evening", () => {
    // 21:31 UTC on 14 Nov = 03:01 IST on 15 Nov
    const now = new Date("2026-11-14T21:31:00Z");
    expect(todayIST(now)).toBe("2026-11-15");
    expect(resolveDateWord("tomorrow", null, now)).toBe("2026-11-16");
  });
});

describe("draft", () => {
  it("requires a map pin", () => {
    expect(missingFields(EMPTY_DRAFT)).toContain("lat");
  });
  it("distance is straight-line km", () => {
    expect(distanceKm({ lat: 28.645, lng: 77.339 }, { lat: 28.646, lng: 77.3695 })).toBeGreaterThan(2.5);
  });
});
