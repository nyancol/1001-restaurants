import { ICON_SVG } from "../theme/iconSvg";

export default function IconGlyph({ id, size = 20 }: { id: string; size?: number }) {
  const key = (id ?? "fork").trim().toLowerCase() || "fork";
  const inner = ICON_SVG[key] ?? ICON_SVG.fork;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
}
