import { useState, type CSSProperties } from "react";
import type { Row } from "../../core/types";
import { companyDomain, hue, initial, logoUrl } from "../lib/logo";
import "./avatar.css";

export function Avatar({ r }: { r: Row }) {
  const [logo, setLogo] = useState(false);
  const domain = companyDomain(r);
  const name = r.company || r.title;
  return (
    <span className="avatar" style={{ "--hue": hue(name) } as CSSProperties} aria-hidden>
      {initial(name)}
      {domain && (
        <img
          src={logoUrl(domain)}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          data-on={logo || undefined}
          onLoad={(e) => setLogo(e.currentTarget.naturalWidth >= 32)}
          onError={() => setLogo(false)}
        />
      )}
    </span>
  );
}
