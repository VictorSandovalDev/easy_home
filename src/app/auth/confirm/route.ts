import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Recibe enlaces de invitación, acceso por correo y recuperación de contraseña.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const supabase = await createClient();

  let ok = false;
  if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  else if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;

  const destino = !ok ? "/ingresar" : type === "invite" || type === "recovery" ? "/cuenta?nueva=1" : next;
  return NextResponse.redirect(new URL(destino.startsWith("/") ? destino : "/", request.url));
}
