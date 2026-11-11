import StoreHeader from "./components/StoreHeader";
import StoreFooter from "./components/StoreFooter";

export default function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <StoreHeader />
      <main className="min-h-screen">{children}</main>
      <StoreFooter />
    </>
  );
}