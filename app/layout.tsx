import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { SiteHeader } from "@/app/components/SiteHeader";
import "./globals.css";
import { Footer } from "./components/Footer";

export const metadata: Metadata = {
  title: "MakeCode Games!",
  description: "A community library of MakeCode Arcade games and extensions.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <SiteHeader user={user} />
        {children}
        <Footer />
      </body>
    </html>
  );
}
