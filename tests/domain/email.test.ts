import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONSENT_CSV_HEADER, EMAIL_CONSENT_VERSION, EMAIL_MAX, buildConsentCsv, checkEmailAnswer, consentCsvFileName, consentRecord, csvCell, normalizeEmail, parseEmailSubmission } from "../../src/domain/session/email";

describe("normalizeEmail", () => {
  it("trims and lowercases only the domain", () => {
    assert.equal(normalizeEmail("  Ana.Lopez@Example.ES "), "Ana.Lopez@example.es");
    assert.equal(normalizeEmail("ñandú@correo.es"), "ñandú@correo.es");
  });

  it("rejects what is not an email", () => {
    const local = "a".repeat(65);
    const tooLong = `${"a".repeat(64)}@${"b".repeat(EMAIL_MAX)}.es`;
    for (const bad of ["", "   ", "ana", "ana@", "@x.es", "a@@x.es", "a@b@x.es", "a b@x.es", "a@x es.es", "ana@localhost", "a@b..c", "a@.es", "a@x.e", "a@x.es.", "a\u0000b@x.es", "a\nb@x.es", "a,b@x.es", `${local}@x.es`, tooLong, "=cmd@x.es", "+1@x.es", "-1@x.es", "@evil@x.es", 42, null, undefined, {}]) {
      assert.equal(normalizeEmail(bad), null, String(bad));
    }
  });

  it("accepts the longest allowed email", () => {
    const domain = `${"b".repeat(60)}.${"c".repeat(60)}.${"d".repeat(60)}.es`;
    const email = `${"a".repeat(64)}@${domain}`;
    assert.ok(email.length <= EMAIL_MAX);
    assert.equal(normalizeEmail(email), email);
  });
});

describe("checkEmailAnswer", () => {
  it("asks for a valid email first and then for the consent", () => {
    assert.equal(checkEmailAnswer("", true), "invalid-email");
    assert.equal(checkEmailAnswer("nope", true), "invalid-email");
    assert.equal(checkEmailAnswer("a@x.es", false), "missing-consent");
    assert.equal(checkEmailAnswer("a@x.es", true), "ok");
  });
});

describe("parseEmailSubmission", () => {
  it("validates the team, then the email, then the consent", () => {
    assert.deepEqual(parseEmailSubmission(null), { ok: false, error: "invalid-data" });
    assert.deepEqual(parseEmailSubmission({ team: "", email: "bad", consent: false }), { ok: false, error: "invalid-data" });
    assert.deepEqual(parseEmailSubmission({ team: "Rojo::x", email: "a@x.es", consent: true }), { ok: false, error: "invalid-data" });
    assert.deepEqual(parseEmailSubmission({ team: "Rojo", email: "bad", consent: false }), { ok: false, error: "invalid-email" });
    assert.deepEqual(parseEmailSubmission({ team: "Rojo", email: "a@x.es", consent: false }), { ok: false, error: "missing-consent" });
    assert.deepEqual(parseEmailSubmission({ team: "Rojo", email: "a@x.es" }), { ok: false, error: "missing-consent" });
  });

  it("accepts only a real boolean true as consent", () => {
    for (const consent of ["true", 1, "yes", [true]]) assert.deepEqual(parseEmailSubmission({ team: "Rojo", email: "a@x.es", consent }), { ok: false, error: "missing-consent" });
    assert.deepEqual(parseEmailSubmission({ team: " Rojo ", email: " A@X.ES ", consent: true }), { ok: true, team: "Rojo", email: "A@x.es" });
  });
});

describe("consent record and CSV", () => {
  it("stamps the date and the version of the text", () => {
    assert.deepEqual(consentRecord({ team: "Rojo", email: "a@x.es" }, new Date("2026-11-22T10:00:00.000Z")), { team: "Rojo", email: "a@x.es", consentedAt: "2026-11-22T10:00:00.000Z", version: EMAIL_CONSENT_VERSION });
  });

  it("quotes cells that need it and neutralises formulas", () => {
    assert.equal(csvCell("plain"), "plain");
    assert.equal(csvCell('say "hi", ok'), '"say ""hi"", ok"');
    assert.equal(csvCell("a\nb"), '"a\nb"');
    assert.equal(csvCell('=HYPERLINK("http://x","y")'), `"'=HYPERLINK(""http://x"",""y"")"`);
    for (const prefix of ["+", "-", "@", "\t"]) assert.ok(csvCell(`${prefix}1`).startsWith("'"));
  });

  it("builds the file with header, CRLF lines and oldest first", () => {
    const csv = buildConsentCsv([
      { team: "B, team", email: "b@x.es", consentedAt: "2026-11-22T11:00:00.000Z", version: "v" },
      { team: "A", email: "a@x.es", consentedAt: "2026-11-22T10:00:00.000Z", version: "v" },
    ]);
    assert.equal(csv, `${CONSENT_CSV_HEADER.join(",")}\r\nA,a@x.es,2026-11-22T10:00:00.000Z,v\r\n"B, team",b@x.es,2026-11-22T11:00:00.000Z,v\r\n`);
    assert.equal(buildConsentCsv([]), `${CONSENT_CSV_HEADER.join(",")}\r\n`);
  });

  it("names the file after the session", () => {
    assert.equal(consentCsvFileName("K7M2Q"), "correos-K7M2Q.csv");
  });
});
