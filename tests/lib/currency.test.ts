import {
  dollarsToCents,
  centsToDollars,
  formatCurrency,
  addCents,
  subtractCents,
  multiplyCents,
  percentageOfCents,
  applyMarkup,
  isNegative,
  isZero,
  absCents,
  compareCents,
  type CentsAmount,
} from "@/lib/types/currency";

describe("Currency Utilities", () => {
  describe("dollarsToCents", () => {
    it("should convert whole dollars to cents", () => {
      expect(dollarsToCents(10)).toBe(1000n);
      expect(dollarsToCents(1)).toBe(100n);
      expect(dollarsToCents(0)).toBe(0n);
    });

    it("should convert dollars with cents to cents", () => {
      expect(dollarsToCents(10.5)).toBe(1050n);
      expect(dollarsToCents(10.99)).toBe(1099n);
      expect(dollarsToCents(0.01)).toBe(1n);
    });

    it("should round to nearest cent for sub-cent amounts", () => {
      expect(dollarsToCents(10.999)).toBe(1100n);
      expect(dollarsToCents(10.994)).toBe(1099n);
      expect(dollarsToCents(10.995)).toBe(1100n);
    });

    it("should handle negative amounts", () => {
      expect(dollarsToCents(-10.5)).toBe(-1050n);
    });
  });

  describe("centsToDollars", () => {
    it("should convert cents to dollars", () => {
      expect(centsToDollars(1000n)).toBe(10);
      expect(centsToDollars(1050n)).toBe(10.5);
      expect(centsToDollars(1n)).toBe(0.01);
      expect(centsToDollars(0n)).toBe(0);
    });

    it("should handle negative amounts", () => {
      expect(centsToDollars(-1050n)).toBe(-10.5);
    });
  });

  describe("formatCurrency", () => {
    it("should format positive amounts", () => {
      expect(formatCurrency(1050n)).toBe("$10.50");
      expect(formatCurrency(1000n)).toBe("$10.00");
      expect(formatCurrency(1n)).toBe("$0.01");
    });

    it("should format negative amounts", () => {
      expect(formatCurrency(-1050n)).toBe("-$10.50");
    });

    it("should format zero", () => {
      expect(formatCurrency(0n)).toBe("$0.00");
    });

    it("should format large amounts with commas", () => {
      expect(formatCurrency(100000000n)).toBe("$1,000,000.00");
    });
  });

  describe("arithmetic operations", () => {
    it("should add cents correctly", () => {
      expect(addCents(1000n, 500n)).toBe(1500n);
      expect(addCents(-100n, 100n)).toBe(0n);
    });

    it("should subtract cents correctly", () => {
      expect(subtractCents(1000n, 500n)).toBe(500n);
      expect(subtractCents(100n, 200n)).toBe(-100n);
    });

    it("should multiply cents correctly", () => {
      expect(multiplyCents(1000n, 2)).toBe(2000n);
      expect(multiplyCents(1000n, 1.5)).toBe(1500n);
      expect(multiplyCents(1000n, 0.5)).toBe(500n);
    });

    it("should round multiplication to nearest cent", () => {
      expect(multiplyCents(1000n, 1.015)).toBe(1015n);
      expect(multiplyCents(1000n, 1.014)).toBe(1014n);
    });
  });

  describe("percentageOfCents", () => {
    it("should calculate percentage correctly", () => {
      expect(percentageOfCents(1000n, 15)).toBe(150n);
      expect(percentageOfCents(1000n, 100)).toBe(1000n);
      expect(percentageOfCents(1000n, 50)).toBe(500n);
    });

    it("should handle decimal percentages", () => {
      expect(percentageOfCents(1000n, 15.5)).toBe(155n);
    });
  });

  describe("applyMarkup", () => {
    it("should apply markup correctly", () => {
      expect(applyMarkup(1000n, 15)).toBe(1150n);
      expect(applyMarkup(1000n, 0)).toBe(1000n);
      expect(applyMarkup(1000n, 100)).toBe(2000n);
    });

    it("should handle the agency use case (15% markup)", () => {
      // $100 base cost + 15% = $115
      const baseCost: CentsAmount = 10000n;
      const withMarkup = applyMarkup(baseCost, 15);
      expect(withMarkup).toBe(11500n);
      expect(formatCurrency(withMarkup)).toBe("$115.00");
    });
  });

  describe("comparison functions", () => {
    it("should detect negative amounts", () => {
      expect(isNegative(-1n)).toBe(true);
      expect(isNegative(0n)).toBe(false);
      expect(isNegative(1n)).toBe(false);
    });

    it("should detect zero", () => {
      expect(isZero(0n)).toBe(true);
      expect(isZero(1n)).toBe(false);
      expect(isZero(-1n)).toBe(false);
    });

    it("should get absolute value", () => {
      expect(absCents(-100n)).toBe(100n);
      expect(absCents(100n)).toBe(100n);
      expect(absCents(0n)).toBe(0n);
    });

    it("should compare amounts correctly", () => {
      expect(compareCents(100n, 200n)).toBe(-1);
      expect(compareCents(200n, 100n)).toBe(1);
      expect(compareCents(100n, 100n)).toBe(0);
    });
  });

  describe("BigInt type safety", () => {
    it("should not allow number operations", () => {
      const amount: CentsAmount = 1000n;
      // This should fail type checking if uncommented:
      // const wrong = amount + 100; // Error: cannot mix BigInt and number
      
      // Correct way:
      const correct = amount + 100n;
      expect(correct).toBe(1100n);
    });
  });
});

