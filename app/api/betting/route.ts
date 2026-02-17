import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

interface BetRow {
  betNum: string;
  date: string;
  sport: string;
  event: string;
  betType: string;
  legs: string;
  legDetails: string;
  stake: number;
  odds: string;
  potentialPayout: string;
  result: string;
  profitLoss: number;
  runningBankroll: number;
  notes: string;
}

function parseCSV(content: string): BetRow[] {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return [];
  const rows: BetRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 13) continue;
    rows.push({
      betNum: cols[0]?.trim() || "",
      date: cols[1]?.trim() || "",
      sport: cols[2]?.trim() || "",
      event: cols[3]?.trim() || "",
      betType: cols[4]?.trim() || "",
      legs: cols[5]?.trim() || "",
      legDetails: cols[6]?.trim() || "",
      stake: parseFloat(cols[7]) || 0,
      odds: cols[8]?.trim() || "",
      potentialPayout: cols[9]?.trim() || "",
      result: cols[10]?.trim() || "",
      profitLoss: parseFloat(cols[11]) || 0,
      runningBankroll: parseFloat(cols[12]) || 0,
      notes: cols[13]?.trim() || "",
    });
  }
  return rows;
}

export async function GET() {
  try {
    const filePath = path.join(
      process.env.WORKSPACE_PATH || "/Users/claraadkinson/.openclaw/workspace",
      "betting-tracker.csv"
    );
    const content = await fs.readFile(filePath, "utf-8");
    const rows = parseCSV(content);

    const bets = rows.filter(
      (r) => r.betNum && !r.betNum.startsWith("W") && r.betNum !== "0" && r.result !== "N/A"
    );

    const wins = bets.filter((r) => r.result === "WIN").length;
    const losses = bets.filter((r) => r.result === "LOSS").length;
    const pushes = bets.filter((r) => r.result === "PUSH").length;

    const lastRow = rows[rows.length - 1];
    const currentBankroll = lastRow?.runningBankroll || 59.5;

    return NextResponse.json({
      rows,
      bets,
      wins,
      losses,
      pushes,
      currentBankroll,
      startingBankroll: 14.5,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      {
        error: error.message,
        rows: [],
        bets: [],
        wins: 2,
        losses: 4,
        pushes: 0,
        currentBankroll: 59.5,
        startingBankroll: 14.5,
      },
      { status: 200 }
    );
  }
}
