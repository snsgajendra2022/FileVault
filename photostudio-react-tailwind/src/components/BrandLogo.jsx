import { THEME } from "../data/theme";

const SIZES = {
  sm: {
    camera: "w-14 h-10",
    lens: "w-6 h-6 border-[3px]",
    dot: "w-2.5 h-2.5",
    viewfinder: "top-1 right-1.5 w-1.5 h-1",
    flash: "-top-1 left-2.5 w-4 h-1.5",
    flower: "text-base",
    pot: "w-4 h-5",
    gap: "gap-1.5",
  },
  md: {
    camera: "w-16 h-11",
    lens: "w-7 h-7 border-[3px]",
    dot: "w-3 h-3",
    viewfinder: "top-1 right-2 w-1.5 h-1",
    flash: "-top-1 left-2.5 w-4 h-1.5",
    flower: "text-lg",
    pot: "w-4 h-5",
    gap: "gap-2",
  },
  lg: {
    camera: "w-20 h-14",
    lens: "w-8 h-8 border-4",
    dot: "w-4 h-4",
    viewfinder: "top-1.5 right-2 w-2 h-1.5",
    flash: "-top-1.5 left-3 w-5 h-2",
    flower: "text-xl",
    pot: "w-5 h-6",
    gap: "gap-2",
  },
};

export default function BrandLogo({ size = "md", className = "" }) {
  const s = SIZES[size] ?? SIZES.md;

  return (
    <div
      className={`flex items-end ${s.gap} select-none ${className}`}
      aria-hidden
    >
      <div className="relative">
        <div
          className={`${s.camera} flex items-center justify-center rounded-xl shadow-lg`}
          style={{
            background: THEME.glassBgLight,
            border: `1px solid ${THEME.border}`,
            boxShadow: THEME.shadowMedium,
          }}
        >
          <div
            className={`${s.lens} flex items-center justify-center rounded-full`}
            style={{ borderColor: THEME.lens }}
          >
            <div className={`${s.dot} rounded-full`} style={{ background: THEME.lens }} />
          </div>
          <div
            className={`absolute ${s.viewfinder} rounded-sm`}
            style={{ background: THEME.lens }}
          />
        </div>
        <div
          className={`absolute ${s.flash} rounded-sm`}
          style={{
            background: THEME.flashBg,
            border: `1px solid ${THEME.borderLight}`,
          }}
        />
      </div>
      <div className="mb-0.5 flex flex-col items-center">
        <div className={s.flower}>🌸</div>
        <div
          className={`${s.pot} rounded-b-lg`}
          style={{
            background: `linear-gradient(135deg, ${THEME.primary} 0%, ${THEME.primaryLight} 100%)`,
          }}
        />
      </div>
    </div>
  );
}
