"use client";

import { DEFAULT_BUSINESS } from "@/config/site";
import { formatIndianMobile } from "@/lib/phone";

// Replaces the root layout when it fails, so it cannot rely on the app's fonts, stylesheet
// or the content loaded from the database.
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
          background: "#f4f7fb",
          color: "#0b1a31",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <title>{`Something went wrong | ${DEFAULT_BUSINESS.name}`}</title>
        <h1 style={{ margin: 0, fontSize: "2rem", lineHeight: 1.1 }}>Something went wrong.</h1>
        <p style={{ maxWidth: "28rem", color: "#5a6e8c", lineHeight: 1.6 }}>
          Please try again. If you need a truck now, call dispatch on{" "}
          <a href={`tel:${DEFAULT_BUSINESS.phone}`} style={{ color: "#0b1a31" }}>
            {formatIndianMobile(DEFAULT_BUSINESS.phone)}
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
              borderRadius: "8px",
              background: "#012754",
              color: "#ffffff",
              fontSize: "1rem",
              fontWeight: 500,
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
