export const UserPlaceholderSVG = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 40 40"
    className={className}
  >
    <circle cx="20" cy="20" r="20" fill="#4A5568" />
    <circle cx="20" cy="15" r="8" fill="#CBD5E0" />
    <path d="M20 25c-6 0-11 4-11 9v2h22v-2c0-5-5-9-11-9z" fill="#CBD5E0" />
  </svg>
);

export const VideoConferenceSVG = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 600 400"
    className={className}
  >
    <rect width="600" height="400" fill="#2D3748" rx="20" ry="20" />
    <rect
      x="20"
      y="20"
      width="560"
      height="360"
      fill="#4A5568"
      rx="10"
      ry="10"
    />

    {/* Participants */}
    <circle cx="150" cy="200" r="80" fill="#718096" />
    <circle cx="450" cy="200" r="80" fill="#718096" />

    {/* Video icons */}
    <path d="M130 180 L170 220 L210 180 Z" fill="#CBD5E0" />
    <path d="M430 180 L470 220 L510 180 Z" fill="#CBD5E0" />

    {/* Bottom controls */}
    <rect
      x="200"
      y="340"
      width="200"
      height="30"
      rx="15"
      ry="15"
      fill="#4A5568"
    />
    <circle cx="250" cy="355" r="10" fill="#CBD5E0" />
    <circle cx="350" cy="355" r="10" fill="#CBD5E0" />
  </svg>
);
