import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    error: "Payment test is not available in the Akahu data branch yet."
  }, { status: 410 });
}
