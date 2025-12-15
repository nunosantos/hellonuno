import { useState, useEffect } from 'react'
import './App.css'

interface HelloResponse {
  message: string
  timestamp: string
  serverName: string
}

interface BackendInfo {
  name: string
  version: string
  runtime: string
  host: string
  timestamp: string
}

function App() {
  const [greeting, setGreeting] = useState<HelloResponse | null>(null)
  const [backendInfo, setBackendInfo] = useState<BackendInfo | null>(null)
  const [customName, setCustomName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

  const fetchGreeting = async (name?: string) => {
    setLoading(true)
    setError(null)
    try {
      const endpoint = name ? `${API_URL}/api/hello/${encodeURIComponent(name)}` : `${API_URL}/api/hello`
      const response = await fetch(endpoint)
      if (!response.ok) throw new Error('Failed to fetch greeting')
      const data = await response.json()
      setGreeting(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const fetchBackendInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/api/info`)
      if (!response.ok) throw new Error('Failed to fetch backend info')
      const data = await response.json()
      setBackendInfo(data)
    } catch (err) {
      console.error('Could not fetch backend info:', err)
    }
  }

  useEffect(() => {
    fetchGreeting()
    fetchBackendInfo()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (customName.trim()) {
      fetchGreeting(customName.trim())
    }
  }

  return (
    <div className="container">
      <header className="header">
        <h1>Hello Nuno App</h1>
        <p className="subtitle">React + .NET Kubernetes Lab</p>
      </header>

      <main className="main">
        <section className="greeting-section">
          <h2>Greeting from Backend</h2>
          {loading && <p className="loading">Loading...</p>}
          {error && <p className="error">Error: {error}</p>}
          {greeting && !loading && (
            <div className="greeting-card">
              <p className="message">{greeting.message}</p>
              <div className="meta">
                <span>Server: {greeting.serverName}</span>
                <span>Time: {new Date(greeting.timestamp).toLocaleString()}</span>
              </div>
            </div>
          )}
        </section>

        <section className="form-section">
          <h2>Say Hello to Someone</h2>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Enter a name..."
              className="name-input"
            />
            <button type="submit" className="submit-btn" disabled={loading}>
              Send Greeting
            </button>
          </form>
        </section>

        {backendInfo && (
          <section className="info-section">
            <h2>Backend Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Service</span>
                <span className="value">{backendInfo.name}</span>
              </div>
              <div className="info-item">
                <span className="label">Version</span>
                <span className="value">{backendInfo.version}</span>
              </div>
              <div className="info-item">
                <span className="label">Runtime</span>
                <span className="value">{backendInfo.runtime}</span>
              </div>
              <div className="info-item">
                <span className="label">Host</span>
                <span className="value">{backendInfo.host}</span>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>Kubernetes Learning Lab | Frontend: React | Backend: .NET 8</p>
      </footer>
    </div>
  )
}

export default App
