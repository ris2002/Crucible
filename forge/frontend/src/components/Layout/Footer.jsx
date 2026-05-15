export default function Footer() {
  return (
    <footer style={{
      textAlign: 'center',
      padding: '24px 16px',
      marginTop: 'auto',
      borderTop: '1px solid var(--border)',
      fontSize: '0.8rem',
      color: 'var(--gray)',
    }}>
      <span style={{ display: 'block', marginBottom: 6 }}>
        For brainstorming only. Users are responsible for their own decisions.
        AI may hallucinate or provide inaccurate information.
      </span>
      Powered by{' '}
      <a
        href="https://www.anthropic.com/claude"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'var(--orange)', textDecoration: 'none', fontWeight: 600 }}
      >
        Claude
      </a>
      {' '}(claude-sonnet-4-6) · Anthropic
    </footer>
  )
}
