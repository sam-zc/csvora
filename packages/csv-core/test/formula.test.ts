import { describe, expect, it } from "bun:test";
import { isPotentialFormula } from "../src/formula";

describe("isPotentialFormula", () => {
  it("identifies formulas beginning with =", () => {
    expect(isPotentialFormula("=SUM(A1:B1)")).toBe(true);
    expect(isPotentialFormula("=1+1")).toBe(true);
    expect(isPotentialFormula("=cmd|' /C calc'!A0")).toBe(true);
  });

  it("identifies formulas beginning with +", () => {
    expect(isPotentialFormula("+123")).toBe(true);
    expect(isPotentialFormula("+cmd")).toBe(true);
  });

  it("identifies formulas beginning with -", () => {
    expect(isPotentialFormula("-42")).toBe(true);
    expect(isPotentialFormula("-calc")).toBe(true);
  });

  it("identifies formulas beginning with @", () => {
    expect(isPotentialFormula("@SUM(A1)")).toBe(true);
    expect(isPotentialFormula("@A1")).toBe(true);
  });

  it("identifies formula triggers after leading whitespace or tabs", () => {
    expect(isPotentialFormula("  =SUM(A1)")).toBe(true);
    expect(isPotentialFormula("\t+cmd")).toBe(true);
    expect(isPotentialFormula("\r\n-calc")).toBe(true);
  });

  it("returns false for benign strings", () => {
    expect(isPotentialFormula("CSVora")).toBe(false);
    expect(isPotentialFormula("hello world")).toBe(false);
    expect(isPotentialFormula("42")).toBe(false);
    expect(isPotentialFormula("3.14")).toBe(false);
    expect(isPotentialFormula("2026-10-07")).toBe(false);
  });

  it("returns false for empty string and whitespace-only string", () => {
    expect(isPotentialFormula("")).toBe(false);
    expect(isPotentialFormula("   ")).toBe(false);
    expect(isPotentialFormula("\t\n")).toBe(false);
  });
});
