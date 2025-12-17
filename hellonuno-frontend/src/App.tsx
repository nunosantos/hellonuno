import { useState, useEffect } from 'react'
import './App.css'
import PipelineFlow from './PipelineFlow'
import './PipelineFlow.css'

interface HelloResponse {
  message: string
  timestamp: string
  serverName: string
}

interface SystemInfo {
  service: string
  pod: {
    name: string
    namespace: string
    serviceAccount: string
    nodeName: string
    podIp: string
  }
  resources: {
    memoryUsageMB: number
    cpuCores: number
    threadCount: number
    gcMemoryMB: number
    gen0Collections: number
    gen1Collections: number
    gen2Collections: number
  }
  platform: {
    os: string
    architecture: string
    runtime: string
  }
  health: {
    status: string
    uptime: string
    uptimeSeconds: number
    processId: number
    startTime: string
    environment: string
  }
  timestamp: string
}

interface Changelog {
  service: string
  deployed: {
    sha: string
    message: string
    author: string
    deployedAt: string
    deployedBy: string
    url: string
  }
  drift: {
    hasDrift: boolean
    commitsAhead: number
    commits: Array<{
      sha: string
      message: string
      author: string
      date: string
    }>
  }
  links: {
    compare: string
    fullChangelog: string
  }
  timestamp: string
}

interface ClusterInfo {
  cluster: {
    name: string
    namespace: string
    environment: string
  }
  observability: {
    grafana: string
    prometheus: string
    jaeger: string | null
    kibana: string | null
    argocd: string
  }
  services: {
    backend: {
      name: string
      replicas: string
      endpoint: string
    }
    frontend: {
      name: string
      replicas: string
    }
  }
  timestamp: string
}

interface PipelineInfo {
  pipeline: {
    status: string
    conclusion: string | null
    workflowName: string | null
    runNumber: number
    runId?: number
    totalDuration: string | null
    url: string | null
  }
  trigger: {
    event: string
    branch: string
    commitSha: string
    actor: string
  }
  build: {
    status: string
    duration: string
    imageTag: string
    registry: string
    imageName: string
    dockerfile: string
    platform: string
  }
  test: {
    status: string
    duration: string
    total: number
    passed: number
    failed: number
    skipped: number
    coverage: number | null
    securityScan: {
      status: string
      vulnerabilities: {
        critical: number
        high: number
        medium: number
        low: number
      }
    }
    linting: {
      status: string
      errors: number
      warnings: number
    }
  }
  deploy: {
    status: string
    method: string
    strategy: string
    syncStatus: string
    healthStatus: string
    revision: string
    previousRevision: string
  }
  repository: {
    owner: string
    name: string
    url: string
  }
  timestamp: string
}

function App() {
  const [greeting, setGreeting] = useState<HelloResponse | null>(null)
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null)
  const [clusterInfo, setClusterInfo] = useState<ClusterInfo | null>(null)
  const [changelog, setChangelog] = useState<Changelog | null>(null)
  const [pipelineInfo, setPipelineInfo] = useState<PipelineInfo | null>(null)
  const [customName, setCustomName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [, setActiveSection] = useState('home')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    build: false,
    runtime: false,
    observability: false
  })
  const [selectedStage, setSelectedStage] = useState<string | null>(null)

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

  const fetchClusterInfo = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/cluster`)
      if (!response.ok) throw new Error('Failed to fetch cluster info')
      const data = await response.json()
      setClusterInfo(data)
    } catch (err) {
      console.error('Could not fetch cluster info:', err)
    }
  }

  const fetchChangelog = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/changelog/backend`)
      if (!response.ok) throw new Error('Failed to fetch changelog')
      const data = await response.json()
      setChangelog(data)
    } catch (err) {
      console.error('Could not fetch changelog:', err)
    }
  }

  const fetchPipelineInfo = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/pipeline`)
      if (!response.ok) throw new Error('Failed to fetch pipeline info')
      const data = await response.json()
      setPipelineInfo(data)
    } catch (err) {
      console.error('Could not fetch pipeline info:', err)
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  useEffect(() => {
    fetchGreeting()
    fetchSystemInfo()
    fetchClusterInfo()
    fetchChangelog()
    fetchPipelineInfo()
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
    <div className="app pipeline-app">
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
            <li><span className="nav-title">Deployment Pipeline</span></li>
          </ul>
        </div>
      </nav>

      {/* Full Page Pipeline Canvas */}
      <div className="pipeline-canvas-wrapper">
        <PipelineFlow
          changelog={changelog}
          systemInfo={systemInfo}
          pipelineInfo={pipelineInfo}
          onNodeClick={(nodeId) => setSelectedStage(nodeId)}
        />
      </div>

      {/* Side Panel for Stage Details */}
      {selectedStage && (
        <div className="stage-panel">
          <div className="panel-header">
            <h3 className="panel-title">
              {selectedStage === 'code' && 'Code Stage'}
              {selectedStage === 'build' && 'Build Stage'}
              {selectedStage === 'test' && 'Test Stage'}
              {selectedStage === 'deploy' && 'Deploy Stage'}
              {selectedStage === 'runtime-dev' && 'Dev Runtime'}
              {selectedStage === 'runtime-staging' && 'Staging Runtime'}
              {selectedStage === 'runtime-prod' && 'Production Runtime'}
            </h3>
            <button className="panel-close" onClick={() => setSelectedStage(null)}>×</button>
          </div>

          <div className="panel-body">
            {/* Code Stage Details */}
            {selectedStage === 'code' && (changelog || pipelineInfo) && (
              <>
                <div className="panel-section">
                  <h4>Git Commit</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="label">SHA:</span>
                      <span className="value code">{changelog?.deployed.sha || pipelineInfo?.trigger.commitSha?.substring(0, 7)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Message:</span>
                      <span className="value">"{changelog?.deployed.message || 'N/A'}"</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Author:</span>
                      <span className="value">{changelog?.deployed.author || pipelineInfo?.trigger.actor}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Time:</span>
                      <span className="value">{changelog ? new Date(changelog.deployed.deployedAt).toLocaleString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>
                {pipelineInfo && (
                  <div className="panel-section">
                    <h4>Trigger Info</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="label">Event:</span>
                        <span className="value badge">{pipelineInfo.trigger.event}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Branch:</span>
                        <span className="value code">{pipelineInfo.trigger.branch}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Triggered by:</span>
                        <span className="value">{pipelineInfo.trigger.actor}</span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="panel-actions">
                  {changelog && (
                    <a href={changelog.deployed.url} target="_blank" rel="noopener noreferrer" className="panel-btn primary">
                      View on GitHub →
                    </a>
                  )}
                </div>
              </>
            )}

            {/* Build Stage Details */}
            {selectedStage === 'build' && pipelineInfo && (
              <>
                <div className="panel-section">
                  <h4>Build Status</h4>
                  <div className="status-list">
                    <div className={`status-item ${pipelineInfo.build.status}`}>
                      <span className="status-icon">{pipelineInfo.build.status === 'success' ? '✓' : '✗'}</span>
                      <span>Docker Build: {pipelineInfo.build.status === 'success' ? 'Success' : 'Failed'}</span>
                    </div>
                  </div>
                  <div className="detail-grid" style={{marginTop: '1rem'}}>
                    <div className="detail-item">
                      <span className="label">Duration:</span>
                      <span className="value">{pipelineInfo.build.duration}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Image Tag:</span>
                      <span className="value code">{pipelineInfo.build.imageTag}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Registry:</span>
                      <span className="value">{pipelineInfo.build.registry}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Full Image:</span>
                      <span className="value code" style={{fontSize: '0.7rem'}}>{pipelineInfo.build.imageName}:{pipelineInfo.build.imageTag}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Platform:</span>
                      <span className="value">{pipelineInfo.build.platform}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Dockerfile:</span>
                      <span className="value code">{pipelineInfo.build.dockerfile}</span>
                    </div>
                  </div>
                </div>
                {pipelineInfo.pipeline.url && (
                  <div className="panel-actions">
                    <a href={pipelineInfo.pipeline.url} target="_blank" rel="noopener noreferrer" className="panel-btn primary">
                      View Build Logs →
                    </a>
                  </div>
                )}
              </>
            )}

            {/* Test Stage Details */}
            {selectedStage === 'test' && pipelineInfo && (
              <>
                <div className="panel-section">
                  <h4>Test Results</h4>
                  <div className="test-summary">
                    <div className="test-stat">
                      <span className="test-number success">{pipelineInfo.test.passed}</span>
                      <span className="test-label">Passed</span>
                    </div>
                    <div className="test-stat">
                      <span className="test-number failed">{pipelineInfo.test.failed}</span>
                      <span className="test-label">Failed</span>
                    </div>
                    <div className="test-stat">
                      <span className="test-number skipped">{pipelineInfo.test.skipped}</span>
                      <span className="test-label">Skipped</span>
                    </div>
                    <div className="test-stat">
                      <span className="test-number total">{pipelineInfo.test.total}</span>
                      <span className="test-label">Total</span>
                    </div>
                  </div>
                  <div className="detail-grid" style={{marginTop: '1rem'}}>
                    <div className="detail-item">
                      <span className="label">Duration:</span>
                      <span className="value">{pipelineInfo.test.duration}</span>
                    </div>
                    {pipelineInfo.test.coverage && (
                      <div className="detail-item">
                        <span className="label">Coverage:</span>
                        <span className="value">{pipelineInfo.test.coverage}%</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="panel-section">
                  <h4>Security Scan</h4>
                  <div className="status-list">
                    <div className={`status-item ${pipelineInfo.test.securityScan.status}`}>
                      <span className="status-icon">{pipelineInfo.test.securityScan.status === 'success' ? '✓' : '⚠'}</span>
                      <span>Vulnerability Scan: {pipelineInfo.test.securityScan.status === 'success' ? 'Passed' : 'Issues Found'}</span>
                    </div>
                  </div>
                  <div className="vuln-summary">
                    <span className="vuln critical">Critical: {pipelineInfo.test.securityScan.vulnerabilities.critical}</span>
                    <span className="vuln high">High: {pipelineInfo.test.securityScan.vulnerabilities.high}</span>
                    <span className="vuln medium">Medium: {pipelineInfo.test.securityScan.vulnerabilities.medium}</span>
                    <span className="vuln low">Low: {pipelineInfo.test.securityScan.vulnerabilities.low}</span>
                  </div>
                </div>
                <div className="panel-section">
                  <h4>Linting</h4>
                  <div className="status-list">
                    <div className={`status-item ${pipelineInfo.test.linting.status}`}>
                      <span className="status-icon">{pipelineInfo.test.linting.status === 'success' ? '✓' : '⚠'}</span>
                      <span>Errors: {pipelineInfo.test.linting.errors} | Warnings: {pipelineInfo.test.linting.warnings}</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Deploy Stage Details */}
            {selectedStage === 'deploy' && (pipelineInfo || (changelog && clusterInfo)) && (
              <>
                <div className="panel-section">
                  <h4>Deployment Info</h4>
                  <div className="detail-grid">
                    {changelog && (
                      <>
                        <div className="detail-item">
                          <span className="label">Deployed At:</span>
                          <span className="value">{new Date(changelog.deployed.deployedAt).toLocaleString()}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Deployed By:</span>
                          <span className="value">{changelog.deployed.deployedBy}</span>
                        </div>
                      </>
                    )}
                    {pipelineInfo && (
                      <>
                        <div className="detail-item">
                          <span className="label">Method:</span>
                          <span className="value">{pipelineInfo.deploy.method}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Strategy:</span>
                          <span className="value">{pipelineInfo.deploy.strategy}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Sync Status:</span>
                          <span className={`value badge ${pipelineInfo.deploy.syncStatus.toLowerCase()}`}>{pipelineInfo.deploy.syncStatus}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Health:</span>
                          <span className={`value badge ${pipelineInfo.deploy.healthStatus.toLowerCase()}`}>{pipelineInfo.deploy.healthStatus}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Current Rev:</span>
                          <span className="value code">{pipelineInfo.deploy.revision}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Previous Rev:</span>
                          <span className="value code">{pipelineInfo.deploy.previousRevision}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                {pipelineInfo?.pipeline.totalDuration && (
                  <div className="panel-section">
                    <h4>Pipeline Summary</h4>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="label">Total Duration:</span>
                        <span className="value">{pipelineInfo.pipeline.totalDuration}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Run #:</span>
                        <span className="value">{pipelineInfo.pipeline.runNumber}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Workflow:</span>
                        <span className="value">{pipelineInfo.pipeline.workflowName}</span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="panel-actions">
                  {clusterInfo && (
                    <a href={clusterInfo.observability.argocd} target="_blank" rel="noopener noreferrer" className="panel-btn primary">
                      Open ArgoCD →
                    </a>
                  )}
                  {pipelineInfo?.pipeline.url && (
                    <a href={pipelineInfo.pipeline.url} target="_blank" rel="noopener noreferrer" className="panel-btn secondary">
                      View Pipeline →
                    </a>
                  )}
                </div>
              </>
            )}

            {/* Dev Runtime Stage Details */}
            {selectedStage === 'runtime-dev' && systemInfo && clusterInfo && (
              <>
                <div className="panel-section">
                  <h4>Environment: Development</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="label">Cluster:</span>
                      <span className="value">{clusterInfo.cluster.name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Namespace:</span>
                      <span className="value code">{clusterInfo.cluster.namespace}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Backend:</span>
                      <span className="value">{clusterInfo.services.backend.replicas}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Frontend:</span>
                      <span className="value">{clusterInfo.services.frontend.replicas}</span>
                    </div>
                  </div>
                </div>

                <div className="panel-section">
                  <h4>Kubernetes Pod Info</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="label">Pod:</span>
                      <span className="value code" style={{fontSize: '0.7rem'}}>{systemInfo.pod.name}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Pod IP:</span>
                      <span className="value code">{systemInfo.pod.podIp}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Node:</span>
                      <span className="value">{systemInfo.pod.nodeName}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Service Account:</span>
                      <span className="value code">{systemInfo.pod.serviceAccount}</span>
                    </div>
                  </div>
                </div>

                <div className="panel-section">
                  <h4>Resource Usage</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="label">Memory:</span>
                      <span className="value">{systemInfo.resources.memoryUsageMB.toFixed(1)} MB</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">CPU Cores:</span>
                      <span className="value">{systemInfo.resources.cpuCores}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Threads:</span>
                      <span className="value">{systemInfo.resources.threadCount}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Uptime:</span>
                      <span className="value">{systemInfo.health.uptime}</span>
                    </div>
                  </div>
                </div>

                <div className="panel-section">
                  <h4>Platform</h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="label">OS:</span>
                      <span className="value">{systemInfo.platform.os}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Architecture:</span>
                      <span className="value">{systemInfo.platform.architecture}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">Runtime:</span>
                      <span className="value">{systemInfo.platform.runtime}</span>
                    </div>
                  </div>
                </div>

                <div className="panel-section">
                  <h4>Observability Links</h4>
                  <div className="observability-links-panel">
                    <a href={clusterInfo.observability.grafana} target="_blank" rel="noopener noreferrer" className="obs-link-small">
                      📈 Grafana
                    </a>
                    <a href={clusterInfo.observability.prometheus} target="_blank" rel="noopener noreferrer" className="obs-link-small">
                      ⏱️ Prometheus
                    </a>
                    <a href={clusterInfo.observability.argocd} target="_blank" rel="noopener noreferrer" className="obs-link-small">
                      🔄 ArgoCD
                    </a>
                    {clusterInfo.observability.jaeger && (
                      <a href={clusterInfo.observability.jaeger} target="_blank" rel="noopener noreferrer" className="obs-link-small">
                        🔍 Jaeger
                      </a>
                    )}
                    {clusterInfo.observability.kibana && (
                      <a href={clusterInfo.observability.kibana} target="_blank" rel="noopener noreferrer" className="obs-link-small">
                        📋 Kibana
                      </a>
                    )}
                  </div>
                </div>

                <div className="panel-actions">
                  <a href={clusterInfo.observability.grafana} target="_blank" rel="noopener noreferrer" className="panel-btn primary">
                    View Metrics →
                  </a>
                </div>
              </>
            )}

            {/* Staging/Prod Runtime - Placeholder */}
            {(selectedStage === 'runtime-staging' || selectedStage === 'runtime-prod') && (
              <div className="panel-section">
                <h4>Environment: {selectedStage === 'runtime-staging' ? 'Staging' : 'Production'}</h4>
                <p style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
                  This environment will be available when you configure additional ArgoCD applications.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HIDDEN: Hero Section */}
      <section id="home" className="hero" style={{display: 'none'}}>
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

      {/* HIDDEN: Features Section */}
      <section id="features" className="features" style={{display: 'none'}}>
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

      {/* HIDDEN: Try It Section */}
      <section id="try-it" className="try-it" style={{display: 'none'}}>
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

      {/* HIDDEN: System Info Section - Sequential Flow with REAL Data */}
      <section id="system" className="system-info" style={{display: 'none'}}>
        <div className="container">
          <h2 className="section-title">Deployment Pipeline</h2>
          <p className="section-subtitle">Visual workflow from code to production</p>

          {/* N8N-Style Pipeline Flow */}
          <PipelineFlow
            changelog={changelog}
            systemInfo={systemInfo}
            pipelineInfo={pipelineInfo}
            onNodeClick={(nodeId) => setSelectedStage(nodeId)}
          />

          {/* Side Panel for Stage Details */}
          {selectedStage && (
            <div className="stage-panel">
              <div className="panel-header">
                <h3 className="panel-title">
                  {selectedStage === 'code' && 'Code Stage'}
                  {selectedStage === 'build' && 'Build Stage'}
                  {selectedStage === 'test' && 'Test Stage'}
                  {selectedStage === 'deploy' && 'Deploy Stage'}
                  {selectedStage === 'runtime-dev' && 'Dev Runtime'}
                  {selectedStage === 'runtime-staging' && 'Staging Runtime'}
                  {selectedStage === 'runtime-prod' && 'Production Runtime'}
                </h3>
                <button className="panel-close" onClick={() => setSelectedStage(null)}>×</button>
              </div>

              <div className="panel-body">
                {/* Code Stage Details */}
                {selectedStage === 'code' && (changelog || pipelineInfo) && (
                  <>
                    <div className="panel-section">
                      <h4>Git Commit</h4>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="label">SHA:</span>
                          <span className="value code">{changelog?.deployed.sha || pipelineInfo?.trigger.commitSha?.substring(0, 7)}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Message:</span>
                          <span className="value">"{changelog?.deployed.message || 'N/A'}"</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Author:</span>
                          <span className="value">{changelog?.deployed.author || pipelineInfo?.trigger.actor}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Time:</span>
                          <span className="value">{changelog ? new Date(changelog.deployed.deployedAt).toLocaleString() : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    {pipelineInfo && (
                      <div className="panel-section">
                        <h4>Trigger Info</h4>
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="label">Event:</span>
                            <span className="value badge">{pipelineInfo.trigger.event}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Branch:</span>
                            <span className="value code">{pipelineInfo.trigger.branch}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Triggered by:</span>
                            <span className="value">{pipelineInfo.trigger.actor}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="panel-actions">
                      {changelog && (
                        <a href={changelog.deployed.url} target="_blank" rel="noopener noreferrer" className="panel-btn primary">
                          View on GitHub →
                        </a>
                      )}
                    </div>
                  </>
                )}

                {/* Build Stage Details */}
                {selectedStage === 'build' && pipelineInfo && (
                  <>
                    <div className="panel-section">
                      <h4>Build Status</h4>
                      <div className="status-list">
                        <div className={`status-item ${pipelineInfo.build.status}`}>
                          <span className="status-icon">{pipelineInfo.build.status === 'success' ? '✓' : '✗'}</span>
                          <span>Docker Build: {pipelineInfo.build.status === 'success' ? 'Success' : 'Failed'}</span>
                        </div>
                      </div>
                      <div className="detail-grid" style={{marginTop: '1rem'}}>
                        <div className="detail-item">
                          <span className="label">Duration:</span>
                          <span className="value">{pipelineInfo.build.duration}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Image Tag:</span>
                          <span className="value code">{pipelineInfo.build.imageTag}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Registry:</span>
                          <span className="value">{pipelineInfo.build.registry}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Full Image:</span>
                          <span className="value code" style={{fontSize: '0.7rem'}}>{pipelineInfo.build.imageName}:{pipelineInfo.build.imageTag}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Platform:</span>
                          <span className="value">{pipelineInfo.build.platform}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Dockerfile:</span>
                          <span className="value code">{pipelineInfo.build.dockerfile}</span>
                        </div>
                      </div>
                    </div>
                    {pipelineInfo.pipeline.url && (
                      <div className="panel-actions">
                        <a href={pipelineInfo.pipeline.url} target="_blank" rel="noopener noreferrer" className="panel-btn primary">
                          View Build Logs →
                        </a>
                      </div>
                    )}
                  </>
                )}

                {/* Test Stage Details */}
                {selectedStage === 'test' && pipelineInfo && (
                  <>
                    <div className="panel-section">
                      <h4>Test Results</h4>
                      <div className="test-summary">
                        <div className="test-stat">
                          <span className="test-number success">{pipelineInfo.test.passed}</span>
                          <span className="test-label">Passed</span>
                        </div>
                        <div className="test-stat">
                          <span className="test-number failed">{pipelineInfo.test.failed}</span>
                          <span className="test-label">Failed</span>
                        </div>
                        <div className="test-stat">
                          <span className="test-number skipped">{pipelineInfo.test.skipped}</span>
                          <span className="test-label">Skipped</span>
                        </div>
                        <div className="test-stat">
                          <span className="test-number total">{pipelineInfo.test.total}</span>
                          <span className="test-label">Total</span>
                        </div>
                      </div>
                      <div className="detail-grid" style={{marginTop: '1rem'}}>
                        <div className="detail-item">
                          <span className="label">Duration:</span>
                          <span className="value">{pipelineInfo.test.duration}</span>
                        </div>
                        {pipelineInfo.test.coverage && (
                          <div className="detail-item">
                            <span className="label">Coverage:</span>
                            <span className="value">{pipelineInfo.test.coverage}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="panel-section">
                      <h4>Security Scan</h4>
                      <div className="status-list">
                        <div className={`status-item ${pipelineInfo.test.securityScan.status}`}>
                          <span className="status-icon">{pipelineInfo.test.securityScan.status === 'success' ? '✓' : '⚠'}</span>
                          <span>Vulnerability Scan: {pipelineInfo.test.securityScan.status === 'success' ? 'Passed' : 'Issues Found'}</span>
                        </div>
                      </div>
                      <div className="vuln-summary">
                        <span className="vuln critical">Critical: {pipelineInfo.test.securityScan.vulnerabilities.critical}</span>
                        <span className="vuln high">High: {pipelineInfo.test.securityScan.vulnerabilities.high}</span>
                        <span className="vuln medium">Medium: {pipelineInfo.test.securityScan.vulnerabilities.medium}</span>
                        <span className="vuln low">Low: {pipelineInfo.test.securityScan.vulnerabilities.low}</span>
                      </div>
                    </div>
                    <div className="panel-section">
                      <h4>Linting</h4>
                      <div className="status-list">
                        <div className={`status-item ${pipelineInfo.test.linting.status}`}>
                          <span className="status-icon">{pipelineInfo.test.linting.status === 'success' ? '✓' : '⚠'}</span>
                          <span>Errors: {pipelineInfo.test.linting.errors} | Warnings: {pipelineInfo.test.linting.warnings}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Deploy Stage Details */}
                {selectedStage === 'deploy' && (pipelineInfo || (changelog && clusterInfo)) && (
                  <>
                    <div className="panel-section">
                      <h4>Deployment Info</h4>
                      <div className="detail-grid">
                        {changelog && (
                          <>
                            <div className="detail-item">
                              <span className="label">Deployed At:</span>
                              <span className="value">{new Date(changelog.deployed.deployedAt).toLocaleString()}</span>
                            </div>
                            <div className="detail-item">
                              <span className="label">Deployed By:</span>
                              <span className="value">{changelog.deployed.deployedBy}</span>
                            </div>
                          </>
                        )}
                        {pipelineInfo && (
                          <>
                            <div className="detail-item">
                              <span className="label">Method:</span>
                              <span className="value">{pipelineInfo.deploy.method}</span>
                            </div>
                            <div className="detail-item">
                              <span className="label">Strategy:</span>
                              <span className="value">{pipelineInfo.deploy.strategy}</span>
                            </div>
                            <div className="detail-item">
                              <span className="label">Sync Status:</span>
                              <span className={`value badge ${pipelineInfo.deploy.syncStatus.toLowerCase()}`}>{pipelineInfo.deploy.syncStatus}</span>
                            </div>
                            <div className="detail-item">
                              <span className="label">Health:</span>
                              <span className={`value badge ${pipelineInfo.deploy.healthStatus.toLowerCase()}`}>{pipelineInfo.deploy.healthStatus}</span>
                            </div>
                            <div className="detail-item">
                              <span className="label">Current Rev:</span>
                              <span className="value code">{pipelineInfo.deploy.revision}</span>
                            </div>
                            <div className="detail-item">
                              <span className="label">Previous Rev:</span>
                              <span className="value code">{pipelineInfo.deploy.previousRevision}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {pipelineInfo?.pipeline.totalDuration && (
                      <div className="panel-section">
                        <h4>Pipeline Summary</h4>
                        <div className="detail-grid">
                          <div className="detail-item">
                            <span className="label">Total Duration:</span>
                            <span className="value">{pipelineInfo.pipeline.totalDuration}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Run #:</span>
                            <span className="value">{pipelineInfo.pipeline.runNumber}</span>
                          </div>
                          <div className="detail-item">
                            <span className="label">Workflow:</span>
                            <span className="value">{pipelineInfo.pipeline.workflowName}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="panel-actions">
                      {clusterInfo && (
                        <a href={clusterInfo.observability.argocd} target="_blank" rel="noopener noreferrer" className="panel-btn primary">
                          Open ArgoCD →
                        </a>
                      )}
                      {pipelineInfo?.pipeline.url && (
                        <a href={pipelineInfo.pipeline.url} target="_blank" rel="noopener noreferrer" className="panel-btn secondary">
                          View Pipeline →
                        </a>
                      )}
                    </div>
                  </>
                )}

                {/* Dev Runtime Stage Details */}
                {selectedStage === 'runtime-dev' && systemInfo && clusterInfo && (
                  <>
                    <div className="panel-section">
                      <h4>Environment: Development</h4>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="label">Cluster:</span>
                          <span className="value">{clusterInfo.cluster.name}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Namespace:</span>
                          <span className="value code">{clusterInfo.cluster.namespace}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Backend:</span>
                          <span className="value">{clusterInfo.services.backend.replicas}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Frontend:</span>
                          <span className="value">{clusterInfo.services.frontend.replicas}</span>
                        </div>
                      </div>
                    </div>

                    <div className="panel-section">
                      <h4>Kubernetes Pod Info</h4>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="label">Pod:</span>
                          <span className="value code" style={{fontSize: '0.7rem'}}>{systemInfo.pod.name}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Pod IP:</span>
                          <span className="value code">{systemInfo.pod.podIp}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Node:</span>
                          <span className="value">{systemInfo.pod.nodeName}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Service Account:</span>
                          <span className="value code">{systemInfo.pod.serviceAccount}</span>
                        </div>
                      </div>
                    </div>

                    <div className="panel-section">
                      <h4>Resource Usage</h4>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="label">Memory:</span>
                          <span className="value">{systemInfo.resources.memoryUsageMB.toFixed(1)} MB</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">CPU Cores:</span>
                          <span className="value">{systemInfo.resources.cpuCores}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Threads:</span>
                          <span className="value">{systemInfo.resources.threadCount}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Uptime:</span>
                          <span className="value">{systemInfo.health.uptime}</span>
                        </div>
                      </div>
                    </div>

                    <div className="panel-section">
                      <h4>Platform</h4>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="label">OS:</span>
                          <span className="value">{systemInfo.platform.os}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Architecture:</span>
                          <span className="value">{systemInfo.platform.architecture}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Runtime:</span>
                          <span className="value">{systemInfo.platform.runtime}</span>
                        </div>
                      </div>
                    </div>

                    <div className="panel-section">
                      <h4>Observability Links</h4>
                      <div className="observability-links-panel">
                        <a href={clusterInfo.observability.grafana} target="_blank" rel="noopener noreferrer" className="obs-link-small">
                          📈 Grafana
                        </a>
                        <a href={clusterInfo.observability.prometheus} target="_blank" rel="noopener noreferrer" className="obs-link-small">
                          ⏱️ Prometheus
                        </a>
                        <a href={clusterInfo.observability.argocd} target="_blank" rel="noopener noreferrer" className="obs-link-small">
                          🔄 ArgoCD
                        </a>
                        {clusterInfo.observability.jaeger && (
                          <a href={clusterInfo.observability.jaeger} target="_blank" rel="noopener noreferrer" className="obs-link-small">
                            🔍 Jaeger
                          </a>
                        )}
                        {clusterInfo.observability.kibana && (
                          <a href={clusterInfo.observability.kibana} target="_blank" rel="noopener noreferrer" className="obs-link-small">
                            📋 Kibana
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="panel-actions">
                      <a href={clusterInfo.observability.grafana} target="_blank" rel="noopener noreferrer" className="panel-btn primary">
                        View Metrics →
                      </a>
                    </div>
                  </>
                )}

                {/* Staging/Prod Runtime - Placeholder */}
                {(selectedStage === 'runtime-staging' || selectedStage === 'runtime-prod') && (
                  <div className="panel-section">
                    <h4>Environment: {selectedStage === 'runtime-staging' ? 'Staging' : 'Production'}</h4>
                    <p style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
                      This environment will be available when you configure additional ArgoCD applications.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 1. DEPLOYMENT STATUS - Always Visible */}
          {changelog && clusterInfo && (
            <div className="deployment-hero">
              <div className="deployment-status">
                <div className="status-badge healthy">
                  <span className="status-dot"></span>
                  {clusterInfo.services.backend.replicas} Backend + {clusterInfo.services.frontend.replicas} Frontend Healthy
                </div>
                {changelog.drift.hasDrift && (
                  <div className="status-badge warning">
                    ⚠️ {changelog.drift.commitsAhead} commit{changelog.drift.commitsAhead > 1 ? 's' : ''} behind master
                  </div>
                )}
              </div>

              <div className="deployment-card">
                <h3 className="deployment-title">🚀 Currently Deployed</h3>
                <div className="deployment-info">
                  <div className="deployment-commit">
                    <span className="commit-sha">{changelog.deployed.sha}</span>
                    <span className="commit-message">"{changelog.deployed.message}"</span>
                  </div>
                  <div className="deployment-meta">
                    <span>👤 <strong>{changelog.deployed.author}</strong></span>
                    <span>•</span>
                    <span>🕐 {new Date(changelog.deployed.deployedAt).toLocaleString()}</span>
                    <span>•</span>
                    <span>via <strong>{changelog.deployed.deployedBy}</strong></span>
                  </div>
                  <div className="deployment-actions">
                    <a href={changelog.deployed.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                      📝 View Commit on GitHub →
                    </a>
                    {changelog.drift.hasDrift && (
                      <a href={changelog.links.compare} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                        🔍 Compare with Latest →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. BUILD & CI/CD - Collapsible */}
          <div className="collapsible-section">
            <div className="section-header" onClick={() => toggleSection('build')}>
              <h3 className="section-title-small">
                📝 Build & CI/CD Pipeline
                <span className="expand-icon">{expandedSections.build ? '▼' : '▶'}</span>
              </h3>
            </div>
            {expandedSections.build && changelog && (
              <div className="section-content">
                {changelog.drift.hasDrift && changelog.drift.commits.length > 0 ? (
                  <>
                    <div className="alert alert-warning">
                      <strong>⚠️ Pending Deployment:</strong> {changelog.drift.commitsAhead} new commit{changelog.drift.commitsAhead > 1 ? 's' : ''} not yet deployed
                    </div>
                    <div className="commits-list">
                      <h4>Commits Waiting to Deploy:</h4>
                      {changelog.drift.commits.map((commit, i) => (
                        <div key={i} className="commit-item pending">
                          <span className="commit-sha-small">{commit.sha}</span>
                          <span className="commit-msg">{commit.message}</span>
                          <span className="commit-author">by {commit.author}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="info-message">
                    ✅ You're running the latest code from master branch!
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. KUBERNETES RUNTIME - Collapsible */}
          <div className="collapsible-section">
            <div className="section-header" onClick={() => toggleSection('runtime')}>
              <h3 className="section-title-small">
                ☸️ Kubernetes Runtime Status
                <span className="expand-icon">{expandedSections.runtime ? '▼' : '▶'}</span>
              </h3>
            </div>
            {expandedSections.runtime && systemInfo && clusterInfo && (
              <div className="section-content">
                <div className="k8s-overview">
                  <div className="k8s-card">
                    <h4>📊 Cluster Information</h4>
                    <div className="k8s-details">
                      <div className="detail-row">
                        <span className="label">Cluster:</span>
                        <span className="value">{clusterInfo.cluster.name}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Namespace:</span>
                        <span className="value">{clusterInfo.cluster.namespace}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Environment:</span>
                        <span className="value">{clusterInfo.cluster.environment}</span>
                      </div>
                    </div>
                  </div>

                  <div className="k8s-card">
                    <h4>🔧 Backend Service</h4>
                    <div className="k8s-details">
                      <div className="detail-row">
                        <span className="label">Replicas:</span>
                        <span className="value healthy">{clusterInfo.services.backend.replicas}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Endpoint:</span>
                        <span className="value">{clusterInfo.services.backend.endpoint}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Current Pod:</span>
                        <span className="value code">{systemInfo.pod.name}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Node:</span>
                        <span className="value">{systemInfo.pod.nodeName}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Pod IP:</span>
                        <span className="value code">{systemInfo.pod.podIp}</span>
                      </div>
                    </div>
                  </div>

                  <div className="k8s-card">
                    <h4>🎨 Frontend Service</h4>
                    <div className="k8s-details">
                      <div className="detail-row">
                        <span className="label">Replicas:</span>
                        <span className="value healthy">{clusterInfo.services.frontend.replicas}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Service:</span>
                        <span className="value">{clusterInfo.services.frontend.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="k8s-card">
                    <h4>💻 Resource Usage (Current Pod)</h4>
                    <div className="k8s-details">
                      <div className="detail-row">
                        <span className="label">Memory:</span>
                        <span className="value">{systemInfo.resources.memoryUsageMB} MB</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">CPU Cores:</span>
                        <span className="value">{systemInfo.resources.cpuCores}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Threads:</span>
                        <span className="value">{systemInfo.resources.threadCount}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">GC Memory:</span>
                        <span className="value">{systemInfo.resources.gcMemoryMB} MB</span>
                      </div>
                    </div>
                  </div>

                  <div className="k8s-card">
                    <h4>⏱️ Health & Uptime</h4>
                    <div className="k8s-details">
                      <div className="detail-row">
                        <span className="label">Status:</span>
                        <span className="value healthy">{systemInfo.health.status}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Uptime:</span>
                        <span className="value">{systemInfo.health.uptime}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Started:</span>
                        <span className="value">{new Date(systemInfo.health.startTime).toLocaleString()}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Process ID:</span>
                        <span className="value">{systemInfo.health.processId}</span>
                      </div>
                    </div>
                  </div>

                  <div className="k8s-card">
                    <h4>🖥️ Platform</h4>
                    <div className="k8s-details">
                      <div className="detail-row">
                        <span className="label">OS:</span>
                        <span className="value">{systemInfo.platform.os}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Architecture:</span>
                        <span className="value">{systemInfo.platform.architecture}</span>
                      </div>
                      <div className="detail-row">
                        <span className="label">Runtime:</span>
                        <span className="value">{systemInfo.platform.runtime}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. OBSERVABILITY - Collapsible */}
          <div className="collapsible-section">
            <div className="section-header" onClick={() => toggleSection('observability')}>
              <h3 className="section-title-small">
                📊 Observability & Monitoring
                <span className="expand-icon">{expandedSections.observability ? '▼' : '▶'}</span>
              </h3>
            </div>
            {expandedSections.observability && clusterInfo && (
              <div className="section-content">
                <div className="observability-links">
                  <a href={clusterInfo.observability.grafana} target="_blank" rel="noopener noreferrer" className="obs-link">
                    <span>📈 Grafana - Dashboards & Visualization</span>
                    <span>→</span>
                  </a>
                  <a href={clusterInfo.observability.prometheus} target="_blank" rel="noopener noreferrer" className="obs-link">
                    <span>⏱️ Prometheus - Metrics & Alerts</span>
                    <span>→</span>
                  </a>
                  <a href={clusterInfo.observability.argocd} target="_blank" rel="noopener noreferrer" className="obs-link">
                    <span>🔄 ArgoCD - GitOps Deployment</span>
                    <span>→</span>
                  </a>
                  {clusterInfo.observability.jaeger && (
                    <a href={clusterInfo.observability.jaeger} target="_blank" rel="noopener noreferrer" className="obs-link">
                      <span>🔍 Jaeger - Distributed Tracing</span>
                      <span>→</span>
                    </a>
                  )}
                  {clusterInfo.observability.kibana && (
                    <a href={clusterInfo.observability.kibana} target="_blank" rel="noopener noreferrer" className="obs-link">
                      <span>📋 Kibana - Logs & Search</span>
                      <span>→</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {!changelog && <div className="loading">Loading deployment info...</div>}
        </div>
      </section>

      {/* HIDDEN: Footer */}
      <footer className="footer" style={{display: 'none'}}>
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
// Build timestamp: 1765976880
