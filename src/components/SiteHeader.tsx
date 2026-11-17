import { Link, useLocation } from "react-router-dom";
import { useI18n, type Lang } from "../i18n";

const langs: Lang[] = ["es", "en"];

export function SiteHeader() {
  const { t, lang, setLang } = useI18n();
  const { pathname } = useLocation();
  const onDemo = pathname !== "/";

  return (
    <header className="site-header">
      <Link to="/" className="brand-link">
        {t.brand}
      </Link>
      <div className="header-actions">
        {onDemo ? (
          <Link to="/" className="back-link">
            ← {t.back}
          </Link>
        ) : null}
        <div className="lang" role="group" aria-label={t.langLabel}>
          {langs.map((l) => (
            <button
              key={l}
              type="button"
              className={lang === l ? "is-active" : ""}
              aria-pressed={lang === l}
              onClick={() => setLang(l)}
            >
              {t.lang[l]}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
