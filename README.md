# Easy Home

Plataforma web **multi-conjunto y de marca blanca** para propiedad horizontal en Colombia.
Centraliza la comunicación entre consejo, administración, propietarios, administradores de propiedad,
arrendatarios y portería.

## Módulos

| Módulo | Quién lo usa | Qué hace |
|---|---|---|
| Comunicados | Consejo y administración publican; todos leen | Difusión segmentada por rol, con confirmación de lectura |
| Votaciones | Consejo y administración crean; propietarios votan | Un voto por unidad, ponderado por coeficiente (Ley 675, art. 37). Voto secreto, cambiable hasta el cierre |
| Reglamento (RPH) | Todos consultan; administración carga | Importación masiva pegando el texto, buscador y artículos marcados como sancionables |
| Sanciones | Administración impone; destinatario responde | Llamado de atención o multa citando el artículo, plazo de descargos y decisión motivada (Ley 675, arts. 59–60). Valida el tope de dos expensas mensuales |
| Huéspedes | Propietario o administrador de propiedad | Registro de reservas de Airbnb y otras plataformas con los huéspedes autorizados |
| Portería | Vigilancia | Verificación por documento (AUTORIZADO / NO AUTORIZADO) y registro de ingreso y salida |
| Unidades / Personas | Administración | Unidades con coeficiente y cuota, asignación de personas con invitación por correo |
| Configuración | Administración | Logo, color, dominio propio, renta corta y días de descargos |
| Plataforma | Operador de la marca blanca | Alta de conjuntos clientes y su primer administrador |

## Arquitectura

- **Next.js 15** (App Router, Server Components y Server Actions) con **Tailwind CSS 4**.
- **Supabase**: Postgres, Auth (invitaciones y enlace mágico) y **Row Level Security**. El aislamiento entre
  conjuntos y los permisos por rol se aplican en la base de datos (`supabase/migrations`), no solo en la interfaz.
- **Marca blanca**: cada conjunto tiene su ruta `/c/<slug>` y opcionalmente un dominio propio. El middleware
  reescribe `app.miconjunto.com/...` hacia `/c/<slug>/...` y la pantalla de ingreso toma el logo y el color del conjunto.

## Puesta en marcha

1. Crea un proyecto en [Supabase](https://supabase.com) y aplica la migración:
   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```
2. Copia `.env.example` a `.env.local` y completa las llaves (Project Settings → API).
3. En Supabase → Authentication → URL Configuration, agrega `http://localhost:3000/auth/confirm`
   (y la URL de producción) a las *Redirect URLs*.
4. Crea tu usuario (Authentication → Users → Add user) y conviértelo en operador de la plataforma:
   ```sql
   insert into plataforma_admins (usuario_id)
   select id from auth.users where email = 'tu@correo.com';
   ```
5. `npm install && npm run dev`, ingresa en http://localhost:3000 y crea el primer conjunto desde **Plataforma**.

### Plantillas de correo

Para que los enlaces de invitación funcionen con el flujo del servidor, en Authentication → Email Templates
usa un enlace de este tipo en *Invite user* y *Magic Link*:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink
```

## Consideraciones legales (Colombia)

- **Sanciones**: la app impone el flujo de debido proceso (notificación, descargos y decisión motivada), pero
  el procedimiento y los valores deben estar previstos en el RPH del conjunto.
- **Renta corta**: solo se habilita si el RPH lo permite. Los prestadores de vivienda turística deben tener RNT;
  el reporte de huéspedes extranjeros a Migración Colombia (SIRE) sigue siendo responsabilidad del prestador.
- **Datos personales** (Ley 1581 de 2012): el registro de huéspedes exige declarar la autorización de tratamiento de datos.
  Define una política de retención y eliminación antes de salir a producción.
