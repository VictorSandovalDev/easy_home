import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Easy Home", template: "%s · Easy Home" },
  description: "Comunicación y convivencia para conjuntos residenciales",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CO">
      <body className={`${geist.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
