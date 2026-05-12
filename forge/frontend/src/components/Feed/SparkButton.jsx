import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'

export default function SparkButton({ ideaId, initialCount = 0, initialSparked = false }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sparked, setSparked] = useState(initialSparked)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  async function handleSpark() {
    if (!user) {
      navigate('/login')
      return
    }
    if (loading) return

    const newSparked = !sparked
    const newCount = newSparked ? count + 1 : count - 1
    setSparked(newSparked)
    setCount(newCount)
    setLoading(true)

    try {
      const data = await api.sparkIdea(ideaId)
      setCount(data.spark_count)
      setSparked(data.sparked)
    } catch {
      setSparked(!newSparked)
      setCount(count)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      className={`spark-btn ${sparked ? 'sparked' : ''}`}
      onClick={handleSpark}
      title={sparked ? 'Remove spark' : 'Spark this idea'}
    >
      <span className="spark-icon">✦</span>
      {count}
    </button>
  )
}
