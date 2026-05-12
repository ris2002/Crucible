export default function TurnIndicator({ turnsUsed, maxTurns }) {
  if (!maxTurns) return null
  const dots = Array.from({ length: maxTurns }, (_, i) => i < turnsUsed)

  return (
    <div className="turn-indicator">
      <div className="turn-dots">
        {dots.map((filled, i) => (
          <div key={i} className={`turn-dot ${filled ? '' : 'empty'}`} />
        ))}
      </div>
      <span className="turn-label">
        Turn {turnsUsed} of {maxTurns}
      </span>
    </div>
  )
}
