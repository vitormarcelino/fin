import "server-only";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { pushUnsubscribeSchema } from "@/lib/push/schema";
import { deletePushSubscription } from "@/lib/push/queries";

/** Drops this browser's push subscription for the signed-in user. */
export async function POST(request: NextRequest) {
  const session = await requireSession();

  const body = await request.json().catch(() => null);
  const parsed = pushUnsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  await deletePushSubscription(session.user.id, parsed.data.endpoint);
  return NextResponse.json({ success: true });
}
