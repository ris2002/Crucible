const DOMAINS = [
  '', 'Technology', 'Science & Nature', 'Society & Culture', 'Philosophy & Ethics',
  'Business & Economy', 'Arts & Creativity', 'Politics & Power', 'Education & Learning',
  'Health & Mind', 'Environment & Future', 'Sports & Games', 'History & Civilisation',
]

const GENRES = [
  '', 'Problem', 'Solution', 'Observation', 'Question',
  'Prediction', 'Contradiction', 'Concept', 'Challenge',
]

export default function FilterBar({
  domain, genre, sort, username, dateFrom, dateTo,
  onDomainChange, onGenreChange, onSortChange, onUsernameChange, onDateFromChange, onDateToChange,
}) {
  return (
    <div className="filter-bar" style={{ flexWrap: 'wrap', gap: 8 }}>
      <select className="filter-select" value={domain} onChange={e => onDomainChange(e.target.value)}>
        <option value="">All Domains</option>
        {DOMAINS.filter(Boolean).map(d => <option key={d} value={d}>{d}</option>)}
      </select>

      <select className="filter-select" value={genre} onChange={e => onGenreChange(e.target.value)}>
        <option value="">All Genres</option>
        {GENRES.filter(Boolean).map(g => <option key={g} value={g}>{g}</option>)}
      </select>

      <input
        className="filter-select"
        style={{ minWidth: 130 }}
        placeholder="Username..."
        value={username}
        onChange={e => onUsernameChange(e.target.value)}
      />

      <input
        type="date"
        className="filter-select"
        style={{ minWidth: 130 }}
        value={dateFrom}
        onChange={e => onDateFromChange(e.target.value)}
        title="From date"
      />

      <input
        type="date"
        className="filter-select"
        style={{ minWidth: 130 }}
        value={dateTo}
        onChange={e => onDateToChange(e.target.value)}
        title="To date"
      />

      <div className="sort-tabs">
        <button className={`sort-tab ${sort === 'recent' ? 'active' : ''}`} onClick={() => onSortChange('recent')}>
          Most Recent
        </button>
        <button className={`sort-tab ${sort === 'sparked' ? 'active' : ''}`} onClick={() => onSortChange('sparked')}>
          Most Sparked
        </button>
      </div>
    </div>
  )
}
