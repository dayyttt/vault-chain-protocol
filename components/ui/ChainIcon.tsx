interface ChainIconProps {
  chainId: number;
  className?: string;
}

const LETTER_BADGES: Record<number, { color: string; letter: string }> = {
  8453: { color: "#0052FF", letter: "B" }, // Base
  84532: { color: "#0052FF", letter: "B" }, // Base Sepolia
  137: { color: "#8247E5", letter: "P" }, // Polygon
  80002: { color: "#8247E5", letter: "P" }, // Polygon Amoy
  42161: { color: "#28A0F0", letter: "A" }, // Arbitrum
  421614: { color: "#28A0F0", letter: "A" }, // Arbitrum Sepolia
  10: { color: "#FF0420", letter: "O" }, // Optimism
  11155420: { color: "#FF0420", letter: "O" }, // Optimism Sepolia
  56: { color: "#F0B90B", letter: "B" }, // BNB Chain
};

export function ChainIcon({ chainId, className = "h-4 w-4" }: ChainIconProps) {
  // Ethereum mainnet + Sepolia: the classic diamond mark.
  if (chainId === 1 || chainId === 11155111) {
    return (
      <svg viewBox="0 0 24 24" className={className}>
        <path d="M12 2 19 12 12 16 5 12Z" fill="#8A92B2" />
        <path d="M12 2 19 12 12 9Z" fill="#62688F" />
        <path d="M12 17 19 13 12 22 5 13Z" fill="#62688F" />
        <path d="M12 17 19 13 12 22Z" fill="#454A75" />
      </svg>
    );
  }

  // Avalanche: simple triangle mark.
  if (chainId === 43114) {
    return (
      <svg viewBox="0 0 24 24" className={className}>
        <circle cx="12" cy="12" r="10" fill="#E84142" />
        <path d="M9.5 15.5 12 8l2.5 7.5h-1.7L12 11l-.8 2.5H12l-.4 1.2H9.5Z" fill="white" />
        <path d="M14.3 15.5h2.2l-1.1-3-1.1 3Z" fill="white" />
      </svg>
    );
  }

  const badge = LETTER_BADGES[chainId];
  if (badge) {
    return (
      <svg viewBox="0 0 24 24" className={className}>
        <circle cx="12" cy="12" r="10" fill={badge.color} />
        <text
          x="12"
          y="12.5"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="12"
          fontWeight="700"
          fill="white"
          fontFamily="sans-serif"
        >
          {badge.letter}
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="12" r="10" fill="#5C5F68" />
    </svg>
  );
}
