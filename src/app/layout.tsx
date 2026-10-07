import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Easy Home", template: "%s · Easy Home" },
  description: "Comunicación y convivencia para conjuntos residenciales",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CO">
      <body className={`${inter.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
