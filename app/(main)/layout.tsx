import { getUser } from "@/lib/auth";
import { SiteHeader } from "@/app/components/SiteHeader";
import { Footer } from "@/app/components/Footer";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();

  return (
    <>
      <SiteHeader user={user} />
      {children}
      <Footer />
    </>
  );
}
