import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "./components/Footer";

export const metadata: Metadata = {
  title: "MakeCode Games!",
  description: "A community library of MakeCode Arcade games.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {children}
        <Footer />
      </body>
    </html>
  );
}
