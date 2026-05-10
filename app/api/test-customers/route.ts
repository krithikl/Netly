import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    error: "Test customer fixtures are not available in the Akahu branch."
  }, { status: 410 });
}
