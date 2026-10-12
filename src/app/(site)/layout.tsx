export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <a
        href="#quote"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-navy-900 focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to the quote form
      </a>
      {children}
    </>
  );
}
