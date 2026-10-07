import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/** Devuelve el id del usuario con ese correo, invitándolo por email si aún no existe. */
export async function asegurarUsuario(email: string, nombre: string): Promise<string> {
  const admin = createAdminClient();
  const correo = email.trim().toLowerCase();

  const { data: existente } = await admin.from("perfiles").select("id").eq("email", correo).maybeSingle();
  if (existente) return existente.id;

  const origen = (await headers()).get("origin");
  const { data, error } = await admin.auth.admin.inviteUserByEmail(correo, {
    data: { nombre },
    redirectTo: `${origen}/auth/confirm`,
  });
  if (error || !data.user) throw new Error(`No se pudo invitar a ${correo}: ${error?.message}`);
  return data.user.id;
}
