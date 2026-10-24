// Hand-drawn SVG emblems for the Twilight Desk. All original shapes; no game art is used.

type P = { size?: number; className?: string }
const box = (size = 48) => ({ width: size, height: size, viewBox: '0 0 64 64' })

/** The Hero's blade: Boss. */
export function Sword({ size, className }: P) {
  return (
    <svg {...box(size)} className={className} aria-hidden>
      <defs>
        <linearGradient id="blade" x1="0" x2="1">
          <stop offset="0" stopColor="#dfe9ef" />
          <stop offset=".5" stopColor="#ffffff" />
          <stop offset="1" stopColor="#9fb3c0" />
        </linearGradient>
      </defs>
      <path d="M32 3 L36 10 L36 40 L28 40 L28 10 Z" fill="url(#blade)" stroke="#5d7584" strokeWidth="1" />
      <path d="M32 9 L32 38" stroke="#b8c8d2" strokeWidth="1" />
      <path d="M14 40 Q22 36 32 40 Q42 36 50 40 L46 45 Q39 42 32 45 Q25 42 18 45 Z" fill="#e8c15a" stroke="#8a6a1e" strokeWidth="1" />
      <path d="M29.5 45 H34.5 V56 H29.5 Z" fill="#5b3f9e" stroke="#2e1f55" strokeWidth="1" />
      <circle cx="32" cy="42.5" r="2" fill="#3f8fd9" />
      <circle cx="32" cy="59" r="3.5" fill="#e8c15a" stroke="#8a6a1e" strokeWidth="1" />
    </svg>
  )
}

/** A Goron: round, rocky, keeper of the stockpile. Inventory. */
export function Goron({ size, className }: P) {
  return (
    <svg {...box(size)} className={className} aria-hidden>
      <path d="M12 26 L16 16 L22 20 L26 10 L32 17 L38 9 L42 19 L48 15 L52 26 Z" fill="#7a5a3a" stroke="#3d2b1a" strokeWidth="1.2" />
      <ellipse cx="32" cy="38" rx="21" ry="19" fill="#c98a4a" stroke="#5b3a1d" strokeWidth="1.5" />
      <path d="M18 31 Q25 26 30 31" stroke="#5b3a1d" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M34 31 Q39 26 46 31" stroke="#5b3a1d" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="25" cy="35" r="2.4" fill="#1e140b" />
      <circle cx="39" cy="35" r="2.4" fill="#1e140b" />
      <path d="M22 47 Q32 54 42 47" stroke="#5b3a1d" strokeWidth="2" fill="#f3e4c4" />
      <path d="M14 42 Q11 50 17 54 M50 42 Q53 50 47 54" stroke="#f3e4c4" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/** A Zora: cool, sleek, counts every rupee like river stones. Accounting. */
export function Zora({ size, className }: P) {
  return (
    <svg {...box(size)} className={className} aria-hidden>
      <path d="M34 14 Q52 18 58 40 Q50 34 44 34" fill="#7fd0e8" stroke="#1d5f78" strokeWidth="1.2" />
      <path d="M20 18 Q34 8 44 20 Q50 30 46 42 Q40 56 30 56 Q18 56 16 42 Q14 28 20 18 Z" fill="#9ad9ec" stroke="#1d5f78" strokeWidth="1.5" />
      <path d="M22 22 Q32 16 42 22" stroke="#ffffff" strokeWidth="2" fill="none" opacity=".7" />
      <ellipse cx="25" cy="34" rx="3.2" ry="3.8" fill="#0f2f3d" />
      <ellipse cx="37" cy="34" rx="3.2" ry="3.8" fill="#0f2f3d" />
      <circle cx="26" cy="33" r="1" fill="#fff" />
      <circle cx="38" cy="33" r="1" fill="#fff" />
      <path d="M26 46 Q31 49 36 46" stroke="#1d5f78" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M17 40 L12 42 M17 44 L12 47" stroke="#1d5f78" strokeWidth="1.3" />
      <path d="M28 27 L31 23 L34 27 Z" fill="#3f8fd9" stroke="#123a5a" strokeWidth=".8" />
    </svg>
  )
}

/** Epona: the ranch and the stable, the shop's home ground. Facilities. */
export function Epona({ size, className }: P) {
  return (
    <svg {...box(size)} className={className} aria-hidden>
      <path d="M22 12 L26 4 L30 13 Z M34 12 L38 5 L40 14 Z" fill="#8a4f2a" stroke="#3d2010" strokeWidth="1" />
      <path d="M20 14 Q34 6 44 16 Q50 24 48 36 L44 52 Q42 60 34 60 Q26 60 25 52 L22 38 Q14 30 20 14 Z" fill="#a8623a" stroke="#3d2010" strokeWidth="1.5" />
      <path d="M44 16 Q56 22 54 40 Q50 32 46 30" fill="#f1ead8" stroke="#8c836c" strokeWidth="1" />
      <path d="M31 14 Q33 30 34 54" stroke="#f6efe0" strokeWidth="5" strokeLinecap="round" fill="none" />
      <ellipse cx="25" cy="28" rx="2.6" ry="3" fill="#1b0f07" />
      <ellipse cx="41" cy="28" rx="2.6" ry="3" fill="#1b0f07" />
      <ellipse cx="30" cy="55" rx="1.8" ry="2.4" fill="#3d2010" />
      <ellipse cx="38" cy="55" rx="1.8" ry="2.4" fill="#3d2010" />
    </svg>
  )
}

/** The Ocarina: the shop's voice to its customers. Customer Service. */
export function Ocarina({ size, className }: P) {
  return (
    <svg {...box(size)} className={className} aria-hidden>
      <path d="M8 34 Q6 22 22 20 Q40 16 52 26 Q60 34 50 42 Q38 50 22 46 Q10 44 8 34 Z" fill="#4c7fd6" stroke="#1c3a73" strokeWidth="1.5" />
      <path d="M14 28 Q28 22 46 26" stroke="#bcd3ff" strokeWidth="2" fill="none" opacity=".8" />
      <path d="M52 27 L60 22 L62 27 L55 31 Z" fill="#2d5aa8" stroke="#1c3a73" strokeWidth="1" />
      <circle cx="22" cy="34" r="2.5" fill="#0d1d3d" />
      <circle cx="30" cy="32" r="2.5" fill="#0d1d3d" />
      <circle cx="38" cy="33" r="2.5" fill="#0d1d3d" />
      <circle cx="44" cy="37" r="2" fill="#0d1d3d" />
      <path d="M22 42 L30 40" stroke="#e8c15a" strokeWidth="1.5" />
      <path d="M14 10 q3 -4 6 0 q-3 4 -6 0 M44 8 q2 -3 4 0 M52 14 q2 -3 4 0" stroke="#e8c15a" strokeWidth="1.4" fill="none" />
    </svg>
  )
}

/** Ganondorf: the Twilight's threat. Shows up for refusals, errors and guardrail stops. */
export function Ganondorf({ size, className }: P) {
  return (
    <svg {...box(size)} className={className} aria-hidden>
      <path d="M14 20 Q18 4 32 4 Q46 4 50 20 Q46 14 40 14 L32 8 L24 14 Q18 14 14 20 Z" fill="#c2311f" stroke="#5a0f06" strokeWidth="1.2" />
      <path d="M16 22 Q16 12 32 12 Q48 12 48 22 L46 42 Q40 56 32 58 Q24 56 18 42 Z" fill="#5a6b4f" stroke="#1d2418" strokeWidth="1.5" />
      <path d="M20 26 L29 30 M44 26 L35 30" stroke="#14180f" strokeWidth="3" strokeLinecap="round" />
      <path d="M23 32 L29 33 L23 35 Z M41 32 L35 33 L41 35 Z" fill="#f0c43a" />
      <path d="M32 15 L35 20 L32 24 L29 20 Z" fill="#e8c15a" stroke="#6b4c0f" strokeWidth=".8" />
      <path d="M22 44 Q32 40 42 44 Q38 54 32 54 Q26 54 22 44 Z" fill="#b3271a" stroke="#5a0f06" strokeWidth="1" />
      <path d="M26 46 Q32 49 38 46" stroke="#1d2418" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

/** A Hero's arrow, drawn pointing right (+x) around 0,0 so it can ride a path with rotate="auto". */
export function ArrowShape({ color = '#e8c15a' }: { color?: string }) {
  return (
    <g>
      <path d="M-30 0 H14" stroke="#c9b48a" strokeWidth="3" strokeLinecap="round" />
      <path d="M12 -7 L26 0 L12 7 Z" fill="#dfe9ef" stroke="#5d7584" strokeWidth="1" />
      <path d="M-30 0 L-38 -8 L-24 -2 Z M-30 0 L-38 8 L-24 2 Z" fill={color} />
      <path d="M-46 0 H-28" stroke={color} strokeWidth="6" strokeLinecap="round" opacity=".25" />
    </g>
  )
}

/** An Octorok rolling back with the answer (faces +x). */
export function OctorokShape() {
  return (
    <g>
      <circle cx="-26" cy="0" r="5" fill="#8d8678" stroke="#3b372f" strokeWidth="1" opacity=".75" />
      <circle cx="-38" cy="2" r="3" fill="#8d8678" opacity=".45" />
      <path d="M-14 8 q-4 8 -9 6 M-6 11 q-1 8 -6 8 M4 11 q2 8 -2 9 M12 8 q6 6 2 9" stroke="#7a2f8f" strokeWidth="3" fill="none" strokeLinecap="round" />
      <ellipse cx="0" cy="0" rx="16" ry="13" fill="#b44dc9" stroke="#4a1557" strokeWidth="1.6" />
      <ellipse cx="-4" cy="-6" rx="7" ry="3" fill="#ffffff" opacity=".25" />
      <rect x="13" y="-4.5" width="11" height="9" rx="3" fill="#9a3aae" stroke="#4a1557" strokeWidth="1.4" />
      <ellipse cx="24" cy="0" rx="2" ry="3.4" fill="#2a0b33" />
      <circle cx="6" cy="-4" r="3.6" fill="#fff" stroke="#2a0b33" strokeWidth=".8" />
      <circle cx="7.2" cy="-4" r="1.8" fill="#14051a" />
    </g>
  )
}

/** A rupee: the checking balance. */
export function Rupee({ size = 28, className, color = '#3fbf6a' }: P & { color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 48" className={className} aria-hidden>
      <path d="M16 1 L30 12 L30 36 L16 47 L2 36 L2 12 Z" fill={color} stroke="#0d3d1f" strokeWidth="1.5" />
      <path d="M16 8 L23 14 L23 34 L16 40 L9 34 L9 14 Z" fill="#ffffff" opacity=".28" />
      <path d="M16 1 L16 8 M30 12 L23 14 M30 36 L23 34 M16 47 L16 40 M2 36 L9 34 M2 12 L9 14" stroke="#0d3d1f" strokeWidth="1" />
    </svg>
  )
}

/** Three golden triangles: a resolved ticket. */
export function Triforce({ size = 28, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 56" className={className} aria-hidden>
      <path d="M32 2 L46 28 H18 Z M18 28 L32 54 H4 Z M46 28 L60 54 H32 Z" fill="#e8c15a" stroke="#8a6a1e" strokeWidth="1.5" />
    </svg>
  )
}

/** A Twilight portal: a ticket still under the Twilight (not resolved). */
export function Portal({ size = 28, className }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="32" r="26" fill="#0b1a1c" stroke="#36d3c0" strokeWidth="2" strokeDasharray="5 4" />
      <circle cx="32" cy="32" r="16" fill="none" stroke="#e86a2c" strokeWidth="2" />
      <rect x="27" y="27" width="10" height="10" fill="#36d3c0" transform="rotate(45 32 32)" />
    </svg>
  )
}
