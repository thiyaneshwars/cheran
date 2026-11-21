import { describe, it, expect } from "vitest";
import {
  calculateDhothiPieces,
  calculateSareePieces,
  calculatePiecesFromMeters,
  calculateWeftRequirementSuggestion,
  GOVT_DHOTHI_LENGTH_METERS,
  GOVT_DHOTHI_WEFT_KG_PER_PIECE,
  GOVT_DHOTHI_KG_PER_BAG,
  GOVT_SAREE_LENGTH_METERS,
  GOVT_SAREE_WEFT_KG_PER_PIECE,
  GOVT_SAREE_KG_PER_BAG,
} from "../src/lib/veatti-calculations";

describe("Government Free Dhothi & Saree Scheme Weft Calculations", () => {
  it("should calculate Dhothi pieces ignoring decimals (floor integer)", () => {
    // 1 Dhothi = 3.65m
    expect(calculateDhothiPieces(3.65)).toBe(1);
    expect(calculateDhothiPieces(7.3)).toBe(2);
    // 3650 meters = 1000 Dhothis
    expect(calculateDhothiPieces(3650)).toBe(1000);
    // 3651.9 meters = still 1000 Dhothis (decimals strictly ignored per scheme standard)
    expect(calculateDhothiPieces(3651.9)).toBe(1000);
    expect(calculateDhothiPieces(0)).toBe(0);
    expect(calculateDhothiPieces(-50)).toBe(0);
  });

  it("should calculate Saree pieces ignoring decimals (floor integer)", () => {
    // 1 Saree = 5.50m
    expect(calculateSareePieces(5.5)).toBe(1);
    expect(calculateSareePieces(11.0)).toBe(2);
    // 2200 meters = 400 Sarees
    expect(calculateSareePieces(2200)).toBe(400);
    // 2204.8 meters = still 400 Sarees (decimals ignored)
    expect(calculateSareePieces(2204.8)).toBe(400);
    expect(calculateSareePieces(0)).toBe(0);
  });

  it("should calculate pieces via unified helper calculatePiecesFromMeters", () => {
    expect(calculatePiecesFromMeters(3650, "VEATTI")).toBe(1000);
    expect(calculatePiecesFromMeters(2200, "SAREE")).toBe(400);
  });

  it("should suggest correct weft KG and bags when loom has shortfall (Dhothi)", () => {
    // 1000 Dhothis pending
    // 1000 Dhothis * 0.119 kg = 119.00 KG weft required
    // Loom has 30 KG in stock
    // Shortfall = 119 - 30 = 89.00 KG
    // 89 KG / 60 kg/bag = ceil(1.483) = 2 Bags (120 KG)
    const suggestion = calculateWeftRequirementSuggestion({
      clothType: "VEATTI",
      remainingPaavuPieces: 1000,
      currentLoomStockKg: 30,
      godownStockKg: 3000,
    });

    expect(suggestion.piecesToRun).toBe(1000);
    expect(suggestion.weftRequiredKg).toBe(119.0);
    expect(suggestion.currentLoomStockKg).toBe(30);
    expect(suggestion.currentLoomStockBags).toBe(0.5);
    expect(suggestion.shortfallKg).toBe(89.0);
    expect(suggestion.suggestedBags).toBe(2);
    expect(suggestion.suggestedKg).toBe(120.0);
    expect(suggestion.isGodownSufficient).toBe(true);
    expect(suggestion.status).toBe("DISPATCH_NEEDED");
  });

  it("should detect when loom stock is already sufficient (Dhothi)", () => {
    // 500 Dhothis pending
    // 500 * 0.119 = 59.50 KG weft required
    // Loom already has 65 KG in stock
    // Shortfall = max(0, 59.50 - 65) = 0 KG
    // Suggested bags = 0
    const suggestion = calculateWeftRequirementSuggestion({
      clothType: "VEATTI",
      remainingPaavuPieces: 500,
      currentLoomStockKg: 65,
      godownStockKg: 1000,
    });

    expect(suggestion.piecesToRun).toBe(500);
    expect(suggestion.weftRequiredKg).toBe(59.5);
    expect(suggestion.shortfallKg).toBe(0);
    expect(suggestion.suggestedBags).toBe(0);
    expect(suggestion.suggestedKg).toBe(0);
    expect(suggestion.status).toBe("ENOUGH_AT_LOOM");
  });

  it("should correctly handle Saree 50kg bags and 0.182 kg/piece rate", () => {
    // 400 Sarees pending
    // 400 Sarees * 0.182 kg = 72.80 KG weft required
    // Loom has 15 KG in stock
    // Shortfall = 72.80 - 15 = 57.80 KG
    // 57.80 KG / 50 kg/bag = ceil(1.156) = 2 Bags (100 KG)
    const suggestion = calculateWeftRequirementSuggestion({
      clothType: "SAREE",
      remainingPaavuPieces: 400,
      currentLoomStockKg: 15,
      godownStockKg: 200,
    });

    expect(suggestion.piecesToRun).toBe(400);
    expect(suggestion.weftRequiredKg).toBe(72.8);
    expect(suggestion.shortfallKg).toBe(57.8);
    expect(suggestion.suggestedBags).toBe(2);
    expect(suggestion.suggestedKg).toBe(100.0);
    expect(suggestion.isGodownSufficient).toBe(true);
    expect(suggestion.status).toBe("DISPATCH_NEEDED");
  });

  it("should flag GODOWN_LOW_STOCK when society godown does not have enough bags", () => {
    // 1000 Dhothis requires 119 KG weft. Loom has 0 KG.
    // Shortfall = 119 KG -> 2 Bags (120 KG) needed from Godown.
    // Godown only has 50 KG (less than 120 KG needed).
    const suggestion = calculateWeftRequirementSuggestion({
      clothType: "VEATTI",
      remainingPaavuPieces: 1000,
      currentLoomStockKg: 0,
      godownStockKg: 50,
    });

    expect(suggestion.suggestedBags).toBe(2);
    expect(suggestion.suggestedKg).toBe(120.0);
    expect(suggestion.isGodownSufficient).toBe(false);
    expect(suggestion.status).toBe("GODOWN_LOW_STOCK");
  });

  it("should allow simulating custom pieces to run", () => {
    // Loom has 500 pcs paavu, but user simulates running exactly 300 Dhothis
    // 300 Dhothis * 0.119 = 35.70 KG
    // Loom stock = 10 KG
    // Shortfall = 25.70 KG -> 1 Bag (60 KG)
    const suggestion = calculateWeftRequirementSuggestion({
      clothType: "VEATTI",
      remainingPaavuPieces: 500,
      customPiecesToRun: 300,
      currentLoomStockKg: 10,
    });

    expect(suggestion.piecesToRun).toBe(300);
    expect(suggestion.weftRequiredKg).toBe(35.7);
    expect(suggestion.shortfallKg).toBe(25.7);
    expect(suggestion.suggestedBags).toBe(1);
    expect(suggestion.suggestedKg).toBe(60.0);
  });
});
