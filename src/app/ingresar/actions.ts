"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EstadoAccion } from "@/lib/tipos";

export async function ingresar(_: EstadoAccion, datos: FormData): Promise<EstadoAccion> {
  const email = String(datos.get("email") ?? "").trim();
  const clave = String(datos.get("clave") ?? "");
  const destino = String(datos.get("destino") ?? "/");
  const supabase = await createClient();

  if (!clave) {
    const origen = (await headers()).get("origin");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${origen}/auth/confirm?next=${encodeURIComponent(destino)}` },
    });
    if (error) return { error: "No pudimos enviar el enlace. Verifica que tu correo esté registrado." };
    return { ok: "Te enviamos un enlace de acceso a tu correo." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password: clave });
  if (error) return { error: "Correo o contraseña incorrectos." };
  redirect(destino.startsWith("/") ? destino : "/");
}
