import "server-only";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { pushSubscriptionSchema } from "@/lib/push/schema";
import { upsertPushSubscription } from "@/lib/push/queries";

/** Registers (or refreshes) a browser's push subscription for the signed-in user. */
export async function POST(request: NextRequest) {
  const session = await requireSession();

  const body = await request.json().catch(() => null);
  const parsed = pushSubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados de inscrição inválidos." }, { status: 400 });
  }

  await upsertPushSubscription(session.user.id, parsed.data);
  return NextResponse.json({ success: true });
}
