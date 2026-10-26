// The look shared by every email the site sends. Kept free of server-only imports so the
// templates stay plain functions that tests can call.

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export type EmailRow = { label: string; value: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Wraps the content in the shared email layout. Every string is escaped here. */
export function renderEmail(parts: {
  brand: string;
  subject: string;
  heading: string;
  intro: string;
  rows: EmailRow[];
  action?: { label: string; url: string };
  footer: string;
}): RenderedEmail {
  const rows = parts.rows
    .map(
      (row) => `
            <tr>
              <td style="padding:10px 16px 10px 0;border-top:1px solid #e9eef6;font-size:13px;color:#5a6e8c;vertical-align:top;white-space:nowrap;">${escapeHtml(row.label)}</td>
              <td style="padding:10px 0;border-top:1px solid #e9eef6;font-size:15px;font-weight:600;color:#012754;">${escapeHtml(row.value).replace(/\r?\n/g, "<br>")}</td>
            </tr>`,
    )
    .join("");

  const action = parts.action
    ? `
          <p style="margin:24px 0 0;">
            <a href="${escapeHtml(parts.action.url)}" style="display:inline-block;padding:12px 20px;border-radius:3px;background:#012754;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">${escapeHtml(parts.action.label)}</a>
          </p>`
    : "";

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#eef3f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0b1a31;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f9;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #d9e2ee;border-radius:4px;">
            <tr>
              <td style="padding:18px 24px;border-radius:4px 4px 0 0;background:#012754;color:#ffffff;font-size:16px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">${escapeHtml(parts.brand)}</td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <h1 style="margin:0 0 8px;font-size:20px;line-height:1.3;color:#012754;">${escapeHtml(parts.heading)}</h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#5a6e8c;">${escapeHtml(parts.intro)}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
                </table>${action}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;border-top:1px solid #e9eef6;font-size:13px;line-height:1.6;color:#5a6e8c;">${escapeHtml(parts.footer)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    parts.heading,
    "",
    parts.intro,
    "",
    ...parts.rows.map((row) => `${row.label}: ${row.value}`),
    ...(parts.action ? ["", `${parts.action.label}: ${parts.action.url}`] : []),
    "",
    parts.footer,
  ].join("\n");

  return { subject: parts.subject, html, text };
}
