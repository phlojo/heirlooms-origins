export function HeirloomsIcon({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Heirlooms"
    >
      <rect width="100" height="100" rx="20" fill="currentColor" fillOpacity="0.1" />
      <path
        d="M50 25L65 40V65C65 67.7614 62.7614 70 60 70H40C37.2386 70 35 67.7614 35 65V40L50 25Z"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M35 45H65M50 45V70M42 55H58" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
