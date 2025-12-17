import { useState, useEffect } from 'react'
import './App.css'

interface HelloResponse {
  message: string
  timestamp: string
  serverName: string
}

interface SystemInfo {
  pod: {
    name: string
    namespace: string
    serviceAccount: string
    nodeName: string
  }
  platform: {
    os: string
    architecture: string
    runtime: string
    processorCount: number
  }
  application: {
    version: string
    uptime: string
    environment: string
  }
  timestamp: string
}

function App() {
  const [greeting, setGreeting] = useState<HelloResponse | null>(null)
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [customName, setCustomName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')

  // Use relative URLs when VITE_API_URL is not set (for ingress routing)
  const API_BASE = import.meta.env.VITE_API_URL || window.location.origin

  const fetchGreeting = async (name?: string) => {
    setLoading(true)
    setError(null)
    try {
      const endpoint = name ? `${API_BASE}/api/hello/${encodeURIComponent(name)}` : `${API_BASE}/api/hello`
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

  const fetchSystemInfo = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/system`)
      if (!response.ok) throw new Error('Failed to fetch system info')
      const data = await response.json()
      setSystemInfo(data)
    } catch (err) {
      console.error('Could not fetch system info:', err)
    }
  }

  useEffect(() => {
    fetchGreeting()
    fetchSystemInfo()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (customName.trim()) {
      fetchGreeting(customName.trim())
    }
  }

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId)
    setMobileMenuOpen(false)
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="logo-text">HelloNuno</span>
          </div>

          <button
            className={`mobile-menu-btn ${mobileMenuOpen ? 'open' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <ul className={`nav-menu ${mobileMenuOpen ? 'active' : ''}`}>
            <li><a href="#home" className={activeSection === 'home' ? 'active' : ''} onClick={() => scrollToSection('home')}>Home</a></li>
            <li><a href="#features" className={activeSection === 'features' ? 'active' : ''} onClick={() => scrollToSection('features')}>Features</a></li>
            <li><a href="#try-it" className={activeSection === 'try-it' ? 'active' : ''} onClick={() => scrollToSection('try-it')}>Try It</a></li>
            <li><a href="#system" className={activeSection === 'system' ? 'active' : ''} onClick={() => scrollToSection('system')}>System Info</a></li>
          </ul>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="hero-background">
          <div className="gradient-orb orb-1"></div>
          <div className="gradient-orb orb-2"></div>
          <div className="gradient-orb orb-3"></div>
        </div>
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="gradient-text">Cloud Native</span> Application
          </h1>
          <p className="hero-subtitle">
            Full-stack microservices architecture powered by React, .NET 8, and Kubernetes
          </p>
          <div className="hero-buttons">
            <button className="btn btn-primary" onClick={() => scrollToSection('try-it')}>
              Get Started
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="btn btn-secondary" onClick={() => scrollToSection('features')}>
              Learn More
            </button>
          </div>
        </div>
        <div className="scroll-indicator">
          <div className="mouse"></div>
          <span>Scroll to explore</span>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="container">
          <h2 className="section-title">Powered by Modern Technology</h2>
          <p className="section-subtitle">A showcase of cloud-native architecture and containerization</p>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <h3>Kubernetes Orchestration</h3>
              <p>Deployed on Kubernetes with ArgoCD for GitOps-based continuous delivery and automated scaling</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M21 16V8C21 6.89543 20.1046 6 19 6H5C3.89543 6 3 6.89543 3 8V16C3 17.1046 3.89543 18 5 18H19C20.1046 18 21 17.1046 21 16Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M3 12H21" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <h3>Microservices Architecture</h3>
              <p>Decoupled frontend and backend services communicating through REST APIs with nginx ingress</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h3>Real-time Updates</h3>
              <p>Dynamic data fetching from .NET backend with live server information and timestamp tracking</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M19.4 15C19.1277 15.6171 19.2583 16.3378 19.73 16.82L19.79 16.88C20.1656 17.2551 20.3766 17.7642 20.3766 18.295C20.3766 18.8258 20.1656 19.3349 19.79 19.71C19.4149 20.0856 18.9058 20.2966 18.375 20.2966C17.8442 20.2966 17.3351 20.0856 16.96 19.71L16.9 19.65C16.4178 19.1783 15.6971 19.0477 15.08 19.32C14.4755 19.5791 14.0826 20.1724 14.08 20.83V21C14.08 22.1046 13.1846 23 12.08 23C10.9754 23 10.08 22.1046 10.08 21V20.91C10.0642 20.2327 9.63587 19.6339 9 19.4C8.38291 19.1277 7.66219 19.2583 7.18 19.73L7.12 19.79C6.74486 20.1656 6.23582 20.3766 5.705 20.3766C5.17418 20.3766 4.66514 20.1656 4.29 19.79C3.91445 19.4149 3.70343 18.9058 3.70343 18.375C3.70343 17.8442 3.91445 17.3351 4.29 16.96L4.35 16.9C4.82167 16.4178 4.95235 15.6971 4.68 15.08C4.42093 14.4755 3.82764 14.0826 3.17 14.08H3C1.89543 14.08 1 13.1846 1 12.08C1 10.9754 1.89543 10.08 3 10.08H3.09C3.76733 10.0642 4.36613 9.63587 4.6 9C4.87235 8.38291 4.74167 7.66219 4.27 7.18L4.21 7.12C3.83445 6.74486 3.62343 6.23582 3.62343 5.705C3.62343 5.17418 3.83445 4.66514 4.21 4.29C4.58514 3.91445 5.09418 3.70343 5.625 3.70343C6.15582 3.70343 6.66486 3.91445 7.04 4.29L7.1 4.35C7.58219 4.82167 8.30291 4.95235 8.92 4.68H9C9.60447 4.42093 9.99738 3.82764 10 3.17V3C10 1.89543 10.8954 1 12 1C13.1046 1 14 1.89543 14 3V3.09C14.0026 3.74764 14.3955 4.34093 15 4.6C15.6171 4.87235 16.3378 4.74167 16.82 4.27L16.88 4.21C17.2551 3.83445 17.7642 3.62343 18.295 3.62343C18.8258 3.62343 19.3349 3.83445 19.71 4.21C20.0856 4.58514 20.2966 5.09418 20.2966 5.625C20.2966 6.15582 20.0856 6.66486 19.71 7.04L19.65 7.1C19.1783 7.58219 19.0477 8.30291 19.32 8.92V9C19.5791 9.60447 20.1724 9.99738 20.83 10H21C22.1046 10 23 10.8954 23 12C23 13.1046 22.1046 14 21 14H20.91C20.2524 14.0026 19.6591 14.3955 19.4 15Z" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <h3>Production Ready</h3>
              <p>Security-hardened containers, non-root execution, and read-only filesystems for robust deployment</p>
            </div>
          </div>
        </div>
      </section>

      {/* Try It Section */}
      <section id="try-it" className="try-it">
        <div className="container">
          <div className="try-it-content">
            <div className="try-it-header">
              <h2 className="section-title">See It In Action</h2>
              <p className="section-subtitle">Interact with the microservices backend in real-time</p>
            </div>

            <div className="cards-row">
              <div className="interactive-card">
                <h3>Live Greeting</h3>
                {loading && <div className="loader"><div className="spinner"></div></div>}
                {error && <div className="alert alert-error">{error}</div>}
                {greeting && !loading && (
                  <div className="greeting-result">
                    <div className="message-box">
                      <svg className="quote-icon" viewBox="0 0 24 24" fill="none">
                        <path d="M3 21C3 17.134 3 15.201 4.10051 13.989C5.20101 12.777 7.09942 12.684 10.8962 12.5L11.5 12.5M13.5 12.5L14.1038 12.5C17.9006 12.684 19.799 12.777 20.8995 13.989C22 15.201 22 17.134 22 21M8 7.5C8 9.98528 5.98528 12 3.5 12C5.98528 12 8 14.0147 8 16.5M16 7.5C16 9.98528 13.9853 12 11.5 12C13.9853 12 16 14.0147 16 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <p className="greeting-text">{greeting.message}</p>
                    </div>
                    <div className="metadata">
                      <div className="meta-item">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        <span>{greeting.serverName}</span>
                      </div>
                      <div className="meta-item">
                        <svg viewBox="0 0 24 24" fill="none">
                          <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2"/>
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                        <span>{new Date(greeting.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="interactive-card">
                <h3>Custom Greeting</h3>
                <form onSubmit={handleSubmit} className="greeting-form">
                  <div className="form-group">
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Enter your name"
                      className="form-input"
                      disabled={loading}
                    />
                    <button type="submit" className="btn btn-primary" disabled={loading || !customName.trim()}>
                      {loading ? 'Sending...' : 'Send'}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 8L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* System Info Section */}
      <section id="system" className="system-info">
        <div className="container">
          <h2 className="section-title">Kubernetes System Information</h2>
          <p className="section-subtitle">Live cluster and pod metrics</p>

          {systemInfo ? (
            <>
              <div className="info-section">
                <h3 className="info-section-title">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2"/>
                    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Pod Information
                </h3>
                <div className="info-cards">
                  <div className="info-card">
                    <div className="info-icon">
                      <svg viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <path d="M9 3V21M15 3V21M3 9H21M3 15H21" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </div>
                    <div className="info-content">
                      <span className="info-label">Pod Name</span>
                      <span className="info-value">{systemInfo.pod.name}</span>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="info-icon">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </div>
                    <div className="info-content">
                      <span className="info-label">Namespace</span>
                      <span className="info-value">{systemInfo.pod.namespace}</span>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="info-icon">
                      <svg viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </div>
                    <div className="info-content">
                      <span className="info-label">Node</span>
                      <span className="info-value">{systemInfo.pod.nodeName}</span>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="info-icon">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </div>
                    <div className="info-content">
                      <span className="info-label">Service Account</span>
                      <span className="info-value">{systemInfo.pod.serviceAccount}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h3 className="info-section-title">
                  <svg viewBox="0 0 24 24" fill="none">
                    <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <path d="M8 21H16M12 17V21" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Platform Details
                </h3>
                <div className="info-cards">
                  <div className="info-card">
                    <div className="info-icon">
                      <svg viewBox="0 0 24 24" fill="none">
                        <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <path d="M9 9H15V15H9V9Z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </div>
                    <div className="info-content">
                      <span className="info-label">Operating System</span>
                      <span className="info-value">{systemInfo.platform.os}</span>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="info-icon">
                      <svg viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="8" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <path d="M7 8V5C7 4.46957 7.21071 3.96086 7.58579 3.58579C7.96086 3.21071 8.46957 3 9 3H15C15.5304 3 16.0391 3.21071 16.4142 3.58579C16.7893 3.96086 17 4.46957 17 5V8" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </div>
                    <div className="info-content">
                      <span className="info-label">Architecture</span>
                      <span className="info-value">{systemInfo.platform.architecture}</span>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="info-icon">
                      <svg viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </div>
                    <div className="info-content">
                      <span className="info-label">Runtime</span>
                      <span className="info-value">{systemInfo.platform.runtime}</span>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="info-icon">
                      <svg viewBox="0 0 24 24" fill="none">
                        <rect x="2" y="7" width="20" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <path d="M6 11H6.01M10 11H10.01M14 11H14.01M18 11H18.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className="info-content">
                      <span className="info-label">CPU Cores</span>
                      <span className="info-value">{systemInfo.platform.processorCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="info-section">
                <h3 className="info-section-title">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Application Status
                </h3>
                <div className="info-cards">
                  <div className="info-card">
                    <div className="info-icon">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M7 7H17V17H7V7Z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M3 3H21V21H3V3Z" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </div>
                    <div className="info-content">
                      <span className="info-label">Version</span>
                      <span className="info-value">{systemInfo.application.version}</span>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="info-icon">
                      <svg viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </div>
                    <div className="info-content">
                      <span className="info-label">Uptime</span>
                      <span className="info-value">{systemInfo.application.uptime}</span>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="info-icon">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className="info-content">
                      <span className="info-label">Environment</span>
                      <span className="info-value">{systemInfo.application.environment}</span>
                    </div>
                  </div>

                  <div className="info-card">
                    <div className="info-icon">
                      <svg viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                        <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </div>
                    <div className="info-content">
                      <span className="info-label">Last Updated</span>
                      <span className="info-value">{new Date(systemInfo.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading system information...</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <div className="footer-logo">
                <div className="logo-icon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2"/>
                    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <span>HelloNuno</span>
              </div>
              <p>Cloud-native application demonstrating modern microservices architecture</p>
            </div>

            <div className="footer-section">
              <h4>Technology Stack</h4>
              <ul>
                <li>React 19 + TypeScript</li>
                <li>.NET 8 Web API</li>
                <li>Kubernetes + ArgoCD</li>
                <li>Nginx Ingress</li>
              </ul>
            </div>

            <div className="footer-section">
              <h4>Features</h4>
              <ul>
                <li>GitOps Deployment</li>
                <li>Container Security</li>
                <li>Load Balancing</li>
                <li>Auto Scaling</li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; 2025 HelloNuno. Kubernetes Learning Lab.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
