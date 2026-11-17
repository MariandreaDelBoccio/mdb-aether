import type { ReactNode } from "react";
import type { DemoId } from "../i18n";
import { useI18n } from "../i18n";

type Props = {
  id: DemoId;
  children?: ReactNode;
};

export function DemoChrome({ id, children }: Props) {
  const { t } = useI18n();
  const demo = t.demos[id];

  return (
    <div className="demo-chrome">
      <span className="num">{demo.number}</span>
      <h1>{demo.title}</h1>
      <p>{demo.blurb}</p>
      <span className="hint">{demo.hint}</span>
      {children}
    </div>
  );
}
