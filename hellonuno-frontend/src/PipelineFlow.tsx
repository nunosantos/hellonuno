import { useCallback, useMemo, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react'
import type { Node, Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

// Custom Node Component
interface PipelineNodeData extends Record<string, unknown> {
  label: string
  detail?: string
  icon: string
  status: 'success' | 'running' | 'idle' | 'failed'
  envBadge?: 'DEV' | 'STAGING' | 'PROD'
}

function PipelineNode({ data }: { data: PipelineNodeData }) {
  const statusColors = {
    success: '#10b981',
    running: '#fbbf24',
    idle: '#6b7280',
    failed: '#ef4444',
  }

  const envColors = {
    DEV: { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6' },
    STAGING: { bg: 'rgba(251, 191, 36, 0.2)', text: '#fbbf24' },
    PROD: { bg: 'rgba(16, 185, 129, 0.2)', text: '#10b981' },
  }

  return (
    <div className="pipeline-flow-node">
      <div className="node-box-wrapper">
        <Handle type="target" position={Position.Left} className="flow-handle" />
        <div
          className="node-box"
          style={{ borderColor: statusColors[data.status] }}
        >
          <div className="node-icon" dangerouslySetInnerHTML={{ __html: data.icon }} />
          <div
            className="status-dot"
            style={{ backgroundColor: statusColors[data.status] }}
          />
        </div>
        <Handle type="source" position={Position.Right} className="flow-handle" />
      </div>

      <div className="node-info">
        <span className="node-label">{data.label}</span>
        {data.detail && <span className="node-detail">{data.detail}</span>}
        {data.envBadge && (
          <span
            className="env-badge"
            style={{
              backgroundColor: envColors[data.envBadge].bg,
              color: envColors[data.envBadge].text,
            }}
          >
            {data.envBadge}
          </span>
        )}
      </div>
    </div>
  )
}

const nodeTypes = { pipeline: PipelineNode }

interface PipelineFlowProps {
  changelog: {
    deployed: {
      sha: string
      message: string
      author: string
      deployedAt: string
      deployedBy: string
      url: string
    }
  } | null
  systemInfo: {
    health: { status: string }
  } | null
  pipelineInfo: {
    pipeline: { status: string; conclusion: string | null; totalDuration: string | null }
    trigger: { event: string; branch: string }
    build: { status: string; duration: string; imageTag: string }
    test: { status: string; passed: number; total: number; coverage: number | null }
    deploy: { syncStatus: string; healthStatus: string }
  } | null
  devopsMetrics?: {
    environments: Array<{
      name: string
      status: string
      version: string
      commitSha: string
    }>
  } | null
  onNodeClick: (nodeId: string) => void
}

export default function PipelineFlow({ changelog, systemInfo, pipelineInfo, devopsMetrics, onNodeClick }: PipelineFlowProps) {
  // Get environment status from devopsMetrics
  const getEnvStatus = (envName: string): 'success' | 'failed' | 'idle' => {
    if (!devopsMetrics?.environments) return 'idle'
    const env = devopsMetrics.environments.find(e => e.name === envName)
    if (!env) return 'idle'
    return env.status === 'healthy' ? 'success' : 'failed'
  }

  // Define nodes
  const initialNodes: Node<PipelineNodeData>[] = useMemo(() => [
    {
      id: 'code',
      type: 'pipeline',
      position: { x: 50, y: 100 },
      data: {
        label: 'CODE',
        detail: pipelineInfo?.trigger.branch || changelog?.deployed.sha?.substring(0, 7) || '',
        icon: '<svg viewBox="0 0 24 24" fill="none" width="28" height="28"><path d="M16 18L22 12L16 6M8 6L2 12L8 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        status: (changelog || pipelineInfo) ? 'success' : 'failed',
      },
    },
    {
      id: 'build',
      type: 'pipeline',
      position: { x: 220, y: 100 },
      data: {
        label: 'BUILD',
        detail: pipelineInfo?.build.duration || '',
        icon: '<svg viewBox="0 0 24 24" fill="none" width="28" height="28"><path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2"/><path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2"/><path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2"/></svg>',
        status: pipelineInfo ? (pipelineInfo.build.status === 'success' ? 'success' : 'failed') : 'failed',
      },
    },
    {
      id: 'test',
      type: 'pipeline',
      position: { x: 390, y: 100 },
      data: {
        label: 'TEST',
        detail: pipelineInfo ? `${pipelineInfo.test.passed}/${pipelineInfo.test.total}` : '',
        icon: '<svg viewBox="0 0 24 24" fill="none" width="28" height="28"><path d="M9 11L12 14L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 12V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        status: pipelineInfo ? (pipelineInfo.test.status === 'success' ? 'success' : 'failed') : 'failed',
      },
    },
    {
      id: 'deploy',
      type: 'pipeline',
      position: { x: 560, y: 100 },
      data: {
        label: 'DEPLOY',
        detail: pipelineInfo?.deploy.syncStatus || '',
        icon: '<svg viewBox="0 0 24 24" fill="none" width="28" height="28"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" stroke-width="2"/><path d="M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" stroke-width="2"/></svg>',
        status: (pipelineInfo || changelog) ? (pipelineInfo?.deploy.healthStatus === 'Degraded' ? 'failed' : 'success') : 'failed',
      },
    },
    {
      id: 'runtime-dev',
      type: 'pipeline',
      position: { x: 730, y: 0 },
      data: {
        label: 'RUNTIME',
        icon: '<svg viewBox="0 0 24 24" fill="none" width="28" height="28"><rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" stroke-width="2"/><path d="M8 21h8M12 17v4" stroke="currentColor" stroke-width="2"/></svg>',
        status: systemInfo ? 'success' : getEnvStatus('DEV'),
        envBadge: 'DEV',
      },
    },
    {
      id: 'runtime-staging',
      type: 'pipeline',
      position: { x: 730, y: 130 },
      data: {
        label: 'RUNTIME',
        icon: '<svg viewBox="0 0 24 24" fill="none" width="28" height="28"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="currentColor" stroke-width="2"/></svg>',
        status: getEnvStatus('STAGING'),
        envBadge: 'STAGING',
      },
    },
    {
      id: 'runtime-prod',
      type: 'pipeline',
      position: { x: 730, y: 260 },
      data: {
        label: 'RUNTIME',
        icon: '<svg viewBox="0 0 24 24" fill="none" width="28" height="28"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="2"/><path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="2"/><path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="2"/></svg>',
        status: getEnvStatus('PROD'),
        envBadge: 'PROD',
      },
    },
  ], [changelog, systemInfo, pipelineInfo, devopsMetrics])

  // Define edges
  const initialEdges: Edge[] = useMemo(() => [
    {
      id: 'code-build',
      source: 'code',
      target: 'build',
      animated: true,
      style: { stroke: '#10b981', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    },
    {
      id: 'build-test',
      source: 'build',
      target: 'test',
      animated: true,
      style: { stroke: '#10b981', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    },
    {
      id: 'test-deploy',
      source: 'test',
      target: 'deploy',
      animated: true,
      style: { stroke: '#10b981', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    },
    {
      id: 'deploy-dev',
      source: 'deploy',
      target: 'runtime-dev',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
    },
    {
      id: 'deploy-staging',
      source: 'deploy',
      target: 'runtime-staging',
      style: { stroke: '#fbbf24', strokeWidth: 2, strokeDasharray: '5,5' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#fbbf24' },
    },
    {
      id: 'deploy-prod',
      source: 'deploy',
      target: 'runtime-prod',
      style: { stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5,5' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
    },
  ], [])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  // Update nodes when data changes
  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    onNodeClick(node.id)
  }, [onNodeClick])

  return (
    <div className="pipeline-flow-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={false}
        preventScrolling={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(147, 51, 234, 0.15)" />
        <Controls showZoom={true} showFitView={true} showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
