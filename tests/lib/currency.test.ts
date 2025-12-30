import {
  dollarsToCents,
  centsToDollars,
  formatCurrency,
  formatCentsAsDecimal,
  addCents,
  subtractCents,
  multiplyCentsInt,
  divideCentsInt,
  applyBasisPoints,
  percentageOfCents,
  applyMarkup,
  applyMarkupBasisPoints,
  splitCents,
  isNegative,
  isZero,
  isPositive,
  absCents,
  minCents,
  maxCents,
  compareCents,
  sumCents,
  percentToBasisPoints,
  basisPointsToPercent,
  parseCents,
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

    it("should accept string inputs", () => {
      expect(dollarsToCents("10.50")).toBe(1050n);
      expect(dollarsToCents("10.999")).toBe(1100n);
    });
  });

  describe("centsToDollars (deprecated - display only)", () => {
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

  describe("parseCents", () => {
    it("should parse string cents to BigInt", () => {
      expect(parseCents("1050")).toBe(1050n);
      expect(parseCents("-500")).toBe(-500n);
      expect(parseCents("0")).toBe(0n);
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

  describe("formatCentsAsDecimal", () => {
    it("should format cents as decimal string", () => {
      expect(formatCentsAsDecimal(1050n)).toBe("10.50");
      expect(formatCentsAsDecimal(100n)).toBe("1.00");
      expect(formatCentsAsDecimal(-500n)).toBe("-5.00");
    });

    it("should support custom decimal places", () => {
      expect(formatCentsAsDecimal(1050n, 0)).toBe("11");
      expect(formatCentsAsDecimal(1050n, 4)).toBe("10.5000");
    });
  });

  describe("basis points", () => {
    it("should convert percent to basis points", () => {
      expect(percentToBasisPoints(15)).toBe(1500n);
      expect(percentToBasisPoints(100)).toBe(10000n);
      expect(percentToBasisPoints(0.5)).toBe(50n);
      expect(percentToBasisPoints(15.5)).toBe(1550n);
    });

    it("should convert basis points to percent", () => {
      expect(basisPointsToPercent(1500n)).toBe(15);
      expect(basisPointsToPercent(10000n)).toBe(100);
      expect(basisPointsToPercent(50n)).toBe(0.5);
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

    it("should multiply cents by integer correctly", () => {
      expect(multiplyCentsInt(1000n, 2n)).toBe(2000n);
      expect(multiplyCentsInt(1000n, 0n)).toBe(0n);
    });

    it("should divide cents by integer correctly", () => {
      expect(divideCentsInt(1000n, 2n)).toBe(500n);
      expect(divideCentsInt(1000n, 3n)).toBe(333n); // Integer division
    });

    it("should throw on division by zero", () => {
      expect(() => divideCentsInt(1000n, 0n)).toThrow("Division by zero");
    });
  });

  describe("applyBasisPoints (pure BigInt percentage)", () => {
    it("should calculate percentage using basis points", () => {
      // 15% of $100.00 = $15.00
      expect(applyBasisPoints(10000n, 1500n)).toBe(1500n);
      // 100% of $100.00 = $100.00
      expect(applyBasisPoints(10000n, 10000n)).toBe(10000n);
      // 50% of $100.00 = $50.00
      expect(applyBasisPoints(10000n, 5000n)).toBe(5000n);
    });

    it("should handle decimal percentages via basis points", () => {
      // 15.5% of $100.00 = $15.50
      expect(applyBasisPoints(10000n, 1550n)).toBe(1550n);
      // 0.5% of $100.00 = $0.50
      expect(applyBasisPoints(10000n, 50n)).toBe(50n);
    });

    it("should round to nearest cent", () => {
      // 33.33% of $100.00 should round properly
      // 10000 * 3333 + 5000 = 33335000
      // 33335000 / 10000 = 3333 (with rounding)
      expect(applyBasisPoints(10000n, 3333n)).toBe(3333n);
    });
  });

  describe("percentageOfCents", () => {
    it("should calculate percentage correctly", () => {
      expect(percentageOfCents(10000n, 15)).toBe(1500n);
      expect(percentageOfCents(10000n, 100)).toBe(10000n);
      expect(percentageOfCents(10000n, 50)).toBe(5000n);
    });

    it("should handle decimal percentages", () => {
      expect(percentageOfCents(10000n, 15.5)).toBe(1550n);
    });
  });

  describe("applyMarkup", () => {
    it("should apply markup correctly", () => {
      expect(applyMarkup(10000n, 15)).toBe(11500n);
      expect(applyMarkup(10000n, 0)).toBe(10000n);
      expect(applyMarkup(10000n, 100)).toBe(20000n);
    });

    it("should handle the agency use case (15% markup)", () => {
      // $100 base cost + 15% = $115
      const baseCost: CentsAmount = 10000n;
      const withMarkup = applyMarkup(baseCost, 15);
      expect(withMarkup).toBe(11500n);
      expect(formatCurrency(withMarkup)).toBe("$115.00");
    });
  });

  describe("applyMarkupBasisPoints", () => {
    it("should apply markup using basis points", () => {
      // 15% markup = 1500 basis points
      expect(applyMarkupBasisPoints(10000n, 1500n)).toBe(11500n);
      // 15.5% markup = 1550 basis points
      expect(applyMarkupBasisPoints(10000n, 1550n)).toBe(11550n);
    });
  });

  describe("splitCents", () => {
    it("should split evenly when divisible", () => {
      const result = splitCents(900n, 3n);
      expect(result).toEqual([300n, 300n, 300n]);
      expect(sumCents(result)).toBe(900n);
    });

    it("should distribute remainder to first portions", () => {
      const result = splitCents(1000n, 3n);
      expect(result).toEqual([334n, 333n, 333n]);
      expect(sumCents(result)).toBe(1000n);
    });

    it("should handle single split", () => {
      expect(splitCents(1000n, 1n)).toEqual([1000n]);
    });

    it("should throw for zero or negative parts", () => {
      expect(() => splitCents(1000n, 0n)).toThrow("Parts must be positive");
      expect(() => splitCents(1000n, -1n)).toThrow("Parts must be positive");
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

    it("should detect positive amounts", () => {
      expect(isPositive(1n)).toBe(true);
      expect(isPositive(0n)).toBe(false);
      expect(isPositive(-1n)).toBe(false);
    });

    it("should get absolute value", () => {
      expect(absCents(-100n)).toBe(100n);
      expect(absCents(100n)).toBe(100n);
      expect(absCents(0n)).toBe(0n);
    });

    it("should get min value", () => {
      expect(minCents(100n, 200n)).toBe(100n);
      expect(minCents(200n, 100n)).toBe(100n);
    });

    it("should get max value", () => {
      expect(maxCents(100n, 200n)).toBe(200n);
      expect(maxCents(200n, 100n)).toBe(200n);
    });

    it("should compare amounts correctly", () => {
      expect(compareCents(100n, 200n)).toBe(-1);
      expect(compareCents(200n, 100n)).toBe(1);
      expect(compareCents(100n, 100n)).toBe(0);
    });

    it("should sum amounts correctly", () => {
      expect(sumCents([100n, 200n, 300n])).toBe(600n);
      expect(sumCents([])).toBe(0n);
      expect(sumCents([100n])).toBe(100n);
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

  describe("Double-entry invariant simulation", () => {
    it("should demonstrate balanced transaction", () => {
      // Simulate a transaction with multiple entries
      const entries: Array<{ amount: bigint }> = [
        { amount: 10000n },  // Debit: Platform Cash +$100
        { amount: -10000n }, // Credit: Agency Deposits -$100
      ];

      const sum = sumCents(entries.map(e => e.amount));
      expect(sum).toBe(0n); // Balanced transaction
    });

    it("should demonstrate unbalanced transaction detection", () => {
      // Simulate an unbalanced transaction
      const entries: Array<{ amount: bigint }> = [
        { amount: 10000n },  // Debit: +$100
        { amount: -9000n },  // Credit: -$90 (missing $10!)
      ];

      const sum = sumCents(entries.map(e => e.amount));
      expect(sum).not.toBe(0n); // Unbalanced!
      expect(sum).toBe(1000n); // Missing $10
    });
  });
});
