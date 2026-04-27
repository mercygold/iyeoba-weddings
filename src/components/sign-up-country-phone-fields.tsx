"use client";

import { useMemo, useState } from "react";

import { COUNTRY_DIAL_CODES, getCountryDialCodeByIso } from "@/lib/country-dial-codes";

const DEFAULT_COUNTRY_CODE = "NG";

export function SignUpCountryPhoneFields() {
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const selectedCountry = useMemo(
    () => getCountryDialCodeByIso(countryCode) ?? getCountryDialCodeByIso(DEFAULT_COUNTRY_CODE),
    [countryCode],
  );

  return (
    <>
      <div className="grid gap-2">
        <label htmlFor="country" className="text-sm font-medium text-[color:var(--color-ink)]">
          Country of residence
        </label>
        <select
          id="country"
          name="countrySelection"
          required
          value={countryCode}
          onChange={(event) => setCountryCode(event.target.value)}
          className="field-input rounded-2xl"
        >
          {COUNTRY_DIAL_CODES.map((country) => (
            <option key={country.countryCode} value={country.countryCode}>
              {country.name}
            </option>
          ))}
        </select>
      </div>

      <input type="hidden" name="country" value={selectedCountry?.name ?? "Nigeria"} />
      <input type="hidden" name="countryCode" value={selectedCountry?.countryCode ?? DEFAULT_COUNTRY_CODE} />
      <input type="hidden" name="phoneCountryCode" value={selectedCountry?.dialCode ?? "+234"} />

      <div className="grid gap-2">
        <label htmlFor="phoneNumber" className="text-sm font-medium text-[color:var(--color-ink)]">
          Phone number
        </label>
        <div className="grid grid-cols-[110px_1fr] gap-2">
          <input
            id="phoneCountryCode"
            name="phoneCountryCodeDisplay"
            readOnly
            value={selectedCountry?.dialCode ?? "+234"}
            className="field-input rounded-2xl bg-[rgba(106,62,124,0.06)]"
          />
          <input
            id="phoneNumber"
            name="phoneNumber"
            required
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="8012345678"
            className="field-input rounded-2xl"
          />
        </div>
      </div>
    </>
  );
}
