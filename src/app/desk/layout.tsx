import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children, modal }: LayoutProps<"/admin">) {
  return (
    <>
      {children}
      {/* A request opened from any admin page shows here, in a side panel over that page. The
          slot sits at this level, not in (panel), so the sign-in page matches it too. */}
      {modal}
    </>
  );
}
