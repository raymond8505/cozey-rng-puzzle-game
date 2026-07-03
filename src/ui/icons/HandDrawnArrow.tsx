/** A wobbly pen-stroke arrow pointing right — pairs with handwritten labels
 *  (e.g. the card-slot post-it). Inherits color via currentColor. */
export function HandDrawnArrow(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 16" fill="none" aria-hidden {...props}>
      <path
        d="M2 10 C 10 4, 18 13, 26 9 S 33 6, 36 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M30 3.5 L 37 8 L 29.5 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
