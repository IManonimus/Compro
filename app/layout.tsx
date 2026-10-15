import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Administrasi Ekspedisi | CV. Lautan Sejati Trans Cargo",
  description: "Sistem informasi administrasi ekspedisi CV. Lautan Sejati Trans Cargo",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body className="bg-white min-h-screen overflow-x-hidden">{children}</body>
    </html>
  );
}
