/** Light/dark Tailwind groups for pages inside Layout (portal nav routes).
 *  Palette: white · black text · blue accent
 */

export const appPageGradient =
  'min-h-screen bg-white dark:bg-[#0f172a] text-[#0f172a] dark:text-white transition-colors duration-200';

export const appPageMemories =
  'min-h-screen bg-white dark:bg-[#0f172a] text-[#0f172a] dark:text-white transition-colors duration-200';

export const appPageSoft =
  'min-h-screen bg-white dark:bg-[#0f172a] text-[#0f172a] dark:text-white transition-colors duration-200';

export const appPageGray =
  'min-h-screen bg-white dark:bg-[#0f172a] text-[#0f172a] dark:text-white transition-colors duration-200';

export const appCard =
  'rounded-2xl border border-[#e5e7eb] dark:border-white/10 bg-white dark:bg-[#1e293b] shadow-sm transition-colors duration-200';

export const appCardElevated =
  'rounded-[2rem] border border-[#e5e7eb] dark:border-white/10 bg-white dark:bg-[#1e293b]/90 shadow-[0_4px_24px_rgba(15,23,42,0.06)] dark:shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-colors duration-200';

export const appHeading = 'text-[#0f172a] dark:text-white';

export const appMuted = 'text-[#64748b] dark:text-[#94a3b8]';

export const appSubtle = 'text-[#94a3b8] dark:text-[#64748b]';

/** Wrap portal nav page roots when not using a page-specific scope class. */
export const portalPageShell =
  'min-h-full text-[#0f172a] dark:text-white transition-colors duration-200';
