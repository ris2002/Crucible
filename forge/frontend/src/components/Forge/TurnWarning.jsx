export default function TurnWarning({ turnsUsed, maxTurns, onConclude, onExtend, onSaveDraft, extending }) {
  return (
    <div className="turn-warning">
      <h3>Turn {turnsUsed} of {maxTurns} ●●●●■</h3>
      <p>
        You have one turn remaining. The Crucible can help you conclude your idea now,
        or you can extend your session for 4 more turns.
      </p>
      <div className="turn-warning-actions">
        <button className="btn btn-primary btn-sm" onClick={onConclude}>
          Conclude &amp; Post — uses 1 credit
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={onExtend}
          disabled={extending}
        >
          {extending ? 'Redirecting...' : 'Extend 4 turns — £2'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={onSaveDraft}>
          Save Draft — no credit used
        </button>
      </div>
    </div>
  )
}
