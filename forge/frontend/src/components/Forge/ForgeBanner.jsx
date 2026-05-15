export default function ForgeBanner() {
  return (
    <div className="forge-banner">
      <h2>✦ The Crucible</h2>
      <p>
        Your idea starts rough. The Crucible asks the questions that make it sharp.
        You do the thinking. It does the pushing. No one writes your idea for you.
      </p>
      <p style={{ fontSize: '0.8rem', color: 'var(--light-gray)', marginBottom: 4 }}>
        Posting costs 1 credit. Refining and saving drafts is always free.
      </p>
      <p style={{ fontSize: '0.75rem', color: 'var(--light-gray)', marginBottom: 0, fontStyle: 'italic' }}>
        For brainstorming only · Users are responsible for their own decisions · AI may hallucinate or provide inaccurate information
      </p>
    </div>
  )
}
