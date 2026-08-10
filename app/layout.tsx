import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "مدينة الصفر — النموذج الأولي",
  description: "ابنِ مدينة قادرة على الصمود، وافهم أثر كل قرار.",
  other: { "codex-preview": "development" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
