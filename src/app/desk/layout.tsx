import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Desk", template: "%s | Desk" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children, modal }: LayoutProps<"/desk">) {
  return (
    <>
      {children}
      {/* A request opened from any panel page shows here, in a side panel over that page. The
          slot sits at this level, not in (panel), so the sign-in page matches it too. */}
      {modal}
    </>
  );
}
