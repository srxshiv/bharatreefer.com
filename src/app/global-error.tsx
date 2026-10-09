"use client";

import { site } from "@/config/site";

// Replaces the root layout when it fails, so it cannot rely on the app's fonts or stylesheet.
export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en-IN">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "2rem",
          background: "#06131b",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <title>{`Something went wrong | ${site.name}`}</title>
        <h1 style={{ margin: 0, fontSize: "2rem", lineHeight: 1.1 }}>Something went wrong.</h1>
        <p style={{ maxWidth: "28rem", color: "#b4c5ce", lineHeight: 1.6 }}>
          Please try again. If you need a truck now, call dispatch on{" "}
          <a href={`tel:${site.phone.e164}`} style={{ color: "#ffffff" }}>
            {site.phone.display}
          </a>
          .
        </p>
        <div>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              height: "3rem",
              padding: "0 1.25rem",
              border: 0,
              borderRadius: "0.5rem",
              background: "#ffffff",
              color: "#06131b",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
