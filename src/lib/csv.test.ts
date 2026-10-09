import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

const BOM = "﻿";

describe("toCsv", () => {
  it("starts with a byte-order mark and ends every row with CRLF", () => {
    expect(toCsv([["a", "b"], ["c", "d"]])).toBe(`${BOM}a,b\r\nc,d\r\n`);
  });

  it("quotes cells containing commas, quotes or line breaks", () => {
    expect(toCsv([["Asha, Verma", 'the "big" load', "line one\nline two"]])).toBe(
      `${BOM}"Asha, Verma","the ""big"" load","line one\nline two"\r\n`,
    );
  });

  it("writes numbers bare and empty values as empty cells", () => {
    expect(toCsv([[12500, null, undefined, ""]])).toBe(`${BOM}12500,,,\r\n`);
  });

  it("defuses text a spreadsheet would run as a formula", () => {
    expect(toCsv([["=HYPERLINK(\"http://evil\")", "+91", "-5", "@cmd", "\tx"]])).toBe(
      `${BOM}"'=HYPERLINK(""http://evil"")",'+91,'-5,'@cmd,'\tx\r\n`,
    );
  });

  it("leaves ordinary text that merely contains those characters alone", () => {
    expect(toCsv([["a=b", "Vasai-Virar", "user@example.com"]])).toBe(
      `${BOM}a=b,Vasai-Virar,user@example.com\r\n`,
    );
  });
});
