// The Otis Hub bulb logo (same drawing as public/favicon.svg, without the tile)
export function BulbMark({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <radialGradient id="bm-glass" cx="50%" cy="38%" r="60%">
          <stop offset="0" stopColor="#fff8dc" />
          <stop offset=".45" stopColor="#ffc861" />
          <stop offset="1" stopColor="#ff9a1f" />
        </radialGradient>
      </defs>
      <path d="M32 6C22.6 6 15 13.4 15 22.6c0 6 3.1 9.8 5.9 13 1.8 2.1 3.1 3.8 3.1 6.2V44h16v-2.2c0-2.4 1.3-4.1 3.1-6.2 2.8-3.2 5.9-7 5.9-13C49 13.4 41.4 6 32 6Z" fill="url(#bm-glass)" />
      <path d="M26.5 31c1.5-3.6 3-5.2 5.5-5.2s4 1.6 5.5 5.2M29 31v12M35 31v12" fill="none" stroke="#fff" strokeOpacity=".9" strokeWidth="2" strokeLinecap="round" />
      <rect x="24" y="45.5" width="16" height="4" rx="2" fill="#e9e4d8" />
      <rect x="25.5" y="51" width="13" height="4" rx="2" fill="#bdb6a8" />
      <path d="M28.5 56.5h7L34 60h-4z" fill="#8d877b" />
    </svg>
  );
}
