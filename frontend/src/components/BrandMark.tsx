interface BrandMarkProps {
  /** Größe der Wortmarke. */
  size?: 'sm' | 'md' | 'lg';
  /** Optionaler Zusatz rechts der Wortmarke, z. B. "Kasse" oder "Admin". */
  tag?: string;
  className?: string;
}

const textSize: Record<NonNullable<BrandMarkProps['size']>, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-3xl',
};

const starSize: Record<NonNullable<BrandMarkProps['size']>, string> = {
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
  lg: 'h-9 w-9',
};

// Verspielte Smithstoys-Wortmarke: roter Stern + zweifarbiger Schriftzug.
// Eine Quelle der Wahrheit fürs Branding, in Login, POS-Header, Admin-Sidebar usw. wiederverwendet.
export function BrandMark({ size = 'md', tag, className = '' }: BrandMarkProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 24 24"
        className={`${starSize[size]} shrink-0 text-brand-600`}
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 1.6l2.9 6.05 6.65.78-4.92 4.5 1.32 6.57L12 16.9l-5.94 3.2 1.32-6.57L2.46 9.03l6.65-.78L12 1.6z" />
      </svg>
      <span className={`font-extrabold tracking-tight ${textSize[size]}`}>
        <span className="text-brand-600">Smiths</span>
        <span className="text-blue-600">toys</span>
      </span>
      {tag && (
        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
          {tag}
        </span>
      )}
    </span>
  );
}
