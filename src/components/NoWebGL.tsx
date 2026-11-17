import { useI18n } from "../i18n";

export function NoWebGL() {
  const { t } = useI18n();
  return (
    <div className="nogl">
      <div>
        <div className="fallback-still" aria-hidden />
        <h2>{t.noWebGL.title}</h2>
        <p>{t.noWebGL.text}</p>
      </div>
    </div>
  );
}
