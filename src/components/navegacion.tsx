"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navegacion({ base, items }: { base: string; items: { href: string; texto: string }[] }) {
  const ruta = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      {items.map((i) => {
        const href = base + i.href;
        const activo = i.href === "" ? ruta === base : ruta.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
              activo ? "bg-marca/10 font-medium text-marca" : "text-tenue hover:bg-fondo hover:text-texto"
            }`}
          >
            {i.texto}
          </Link>
        );
      })}
    </nav>
  );
}
