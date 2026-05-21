import React, { useState, useRef, useEffect } from 'react';
import type { Endpoint, DBModel, LogicBlock, Connection } from '../types';
import { IconShield, IconTrash } from './Icons';

interface CanvasProps {
  endpoints: Endpoint[];
  dbModels: DBModel[];
  logicBlocks: LogicBlock[];
  connections: Connection[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  onUpdateNodePosition: (id: string, type: 'endpoint' | 'dbModel' | 'logicBlock', x: number, y: number) => void;
  onAddEndpoint: (x: number, y: number) => void;
  onAddDBModel: (x: number, y: number) => void;
  onAddLogicBlock: (x: number, y: number) => void;
  onDeleteNode: (id: string, type: 'endpoint' | 'dbModel' | 'logicBlock') => void;
  onOpenEndpointLogic: (endpoint: Endpoint) => void;
  onOpenLogicBlockLogic: (block: LogicBlock) => void;
  onAddConnection: (conn: Connection) => void;
  onDeleteConnection: (id: string) => void;
}

export default function Canvas({
  endpoints,
  dbModels,
  logicBlocks,
  connections,
  selectedNodeId,
  onSelectNode,
  onUpdateNodePosition,
  onAddEndpoint,
  onAddDBModel,
  onAddLogicBlock,
  onDeleteNode,
  onOpenEndpointLogic,
  onOpenLogicBlockLogic,
  onAddConnection,
  onDeleteConnection
}: CanvasProps) {
  const [pan, setPan] = useState({ x: 100, y: 100 });
  const [zoom, setZoom] = useState(1.0);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [draggedNode, setDraggedNode] = useState<{ id: string; type: 'endpoint' | 'dbModel' | 'logicBlock'; offset: { x: number; y: number } } | null>(null);
  
  // Connection dragging state
  const [activeConnStart, setActiveConnStart] = useState<{ nodeId: string; portName: string; type: 'input' | 'output'; x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);
  const panStart = useRef({ x: 0, y: 0 });

  // Handle zooming relative to mouse pointer
  const handleWheel = (e: React.WheelEvent) => {
    if (e.target && ((e.target as HTMLElement).closest('.node-body') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('textarea'))) {
      return;
    }
    e.preventDefault();

    const zoomFactor = e.ctrlKey ? 1.02 : 1.08;
    let newZoom = zoom;
    if (e.deltaY < 0) {
      newZoom = Math.min(zoom * zoomFactor, 2.5);
    } else {
      newZoom = Math.max(zoom / zoomFactor, 0.35);
    }
    newZoom = parseFloat(newZoom.toFixed(2));

    if (newZoom === zoom) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const unzoomedX = (mouseX - pan.x) / zoom;
      const unzoomedY = (mouseY - pan.y) / zoom;
      setPan({
        x: mouseX - unzoomedX * newZoom,
        y: mouseY - unzoomedY * newZoom
      });
    }
    setZoom(newZoom);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        const activeNodeName = document.activeElement?.tagName;
        if (activeNodeName !== 'INPUT' && activeNodeName !== 'TEXTAREA') {
          e.preventDefault();
          setIsSpacePressed(true);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    const isMiddleClick = e.button === 1;
    const isLeftOnBg = e.button === 0 && (
      e.target === canvasRef.current || 
      (e.target as SVGElement).classList?.contains('svg-connections') || 
      isSpacePressed
    );
    
    if (isMiddleClick || isLeftOnBg) {
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    } else if (e.button === 0) {
      if (e.target === canvasRef.current || (e.target as SVGElement).classList?.contains('svg-connections')) {
        onSelectNode(null);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y
      });
    } else if (draggedNode) {
      const x = Math.round(((e.clientX - rect.left) - pan.x - draggedNode.offset.x) / zoom);
      const y = Math.round(((e.clientY - rect.top) - pan.y - draggedNode.offset.y) / zoom);
      const snapX = Math.round(x / 8) * 8;
      const snapY = Math.round(y / 8) * 8;
      onUpdateNodePosition(draggedNode.id, draggedNode.type, snapX, snapY);
    }

    if (activeConnStart) {
      setMousePos({
        x: (e.clientX - rect.left - pan.x) / zoom,
        y: (e.clientY - rect.top - pan.y) / zoom
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedNode(null);
    setActiveConnStart(null);
  };

  const startDragNode = (e: React.MouseEvent, id: string, type: 'endpoint' | 'dbModel' | 'logicBlock', currentPos: { x: number; y: number }) => {
    if (isSpacePressed) return;
    e.stopPropagation();
    onSelectNode(id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickXOnCanvas = (e.clientX - rect.left - pan.x) / zoom;
    const clickYOnCanvas = (e.clientY - rect.top - pan.y) / zoom;
    setDraggedNode({
      id,
      type,
      offset: {
        x: (clickXOnCanvas - currentPos.x) * zoom,
        y: (clickYOnCanvas - currentPos.y) * zoom
      }
    });
  };

  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, portName: string, type: 'input' | 'output', x: number, y: number) => {
    e.stopPropagation();
    setActiveConnStart({ nodeId, portName, type, x, y });
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePos({
        x: (e.clientX - rect.left - pan.x) / zoom,
        y: (e.clientY - rect.top - pan.y) / zoom
      });
    }
  };

  const handlePortMouseUp = (e: React.MouseEvent, nodeId: string, portName: string, type: 'input' | 'output') => {
    e.stopPropagation();
    if (activeConnStart && activeConnStart.nodeId !== nodeId && activeConnStart.type !== type) {
      const fromNodeId = activeConnStart.type === 'output' ? activeConnStart.nodeId : nodeId;
      const fromPortName = activeConnStart.type === 'output' ? activeConnStart.portName : portName;
      const toNodeId = activeConnStart.type === 'input' ? activeConnStart.nodeId : nodeId;
      const toPortName = activeConnStart.type === 'input' ? activeConnStart.portName : portName;

      onAddConnection({
        id: `conn_${Date.now()}`,
        fromNodeId,
        fromPortName,
        toNodeId,
        toPortName
      });
    }
    setActiveConnStart(null);
  };

  const getMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case 'get': return 'var(--color-get)';
      case 'post': return 'var(--color-post)';
      case 'put': return 'var(--color-put)';
      case 'delete': return 'var(--color-delete)';
      default: return 'var(--primary)';
    }
  };

  const renderConnections = () => {
    const lines = connections.map(conn => {
      const fromNode = [...endpoints, ...dbModels, ...logicBlocks].find(n => n.id === conn.fromNodeId);
      const toNode = [...endpoints, ...dbModels, ...logicBlocks].find(n => n.id === conn.toNodeId);
      if (!fromNode || !toNode) return null;

      const x1 = fromNode.position.x + 300;
      const y1 = fromNode.position.y + 100;
      const x2 = toNode.position.x;
      const y2 = toNode.position.y + 100;

      const cp1x = x1 + Math.abs(x2 - x1) / 2;
      const cp2x = x2 - Math.abs(x2 - x1) / 2;

      return (
        <g key={conn.id}>
          <path
            d={`M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`}
            className="connection-path"
            style={{ pointerEvents: 'auto', cursor: 'pointer' }}
            onClick={(e) => { e.stopPropagation(); onDeleteConnection(conn.id); }}
          />
        </g>
      );
    });

    if (activeConnStart) {
      const x1 = activeConnStart.x;
      const y1 = activeConnStart.y;
      const x2 = mousePos.x;
      const y2 = mousePos.y;
      const cp1x = x1 + (activeConnStart.type === 'output' ? Math.abs(x2 - x1) / 2 : -Math.abs(x2 - x1) / 2);
      const cp2x = x2 + (activeConnStart.type === 'output' ? -Math.abs(x2 - x1) / 2 : Math.abs(x2 - x1) / 2);

      lines.push(
        <path
          key="active"
          d={`M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`}
          className="connection-path selected"
          style={{ strokeDasharray: '5,5' }}
        />
      );
    }

    return lines;
  };

  return (
    <div
      ref={canvasRef}
      className="canvas-container"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        cursor: isSpacePressed ? (isPanning ? 'grabbing' : 'grab') : (isPanning ? 'grabbing' : 'default'),
        backgroundColor: 'var(--bg-main)',
        userSelect: 'none'
      }}
    >
      <div className="canvas-grid" style={{
        transform: `translate(${pan.x % (24 * zoom)}px, ${pan.y % (24 * zoom)}px) scale(${zoom})`,
        opacity: 0.5
      }} />

      <div className="glass-panel" style={{
        position: 'absolute',
        top: 100,
        right: 24,
        padding: '8px 12px',
        fontSize: '11px',
        color: 'var(--color-muted)',
        fontFamily: 'var(--font-mono)',
        zIndex: 5,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
          <span>ZOOM</span>
          <span>{Math.round(zoom * 100)}%</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
          <span>POS</span>
          <span>{Math.round(pan.x)}, {Math.round(pan.y)}</span>
        </div>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 24,
        right: 24,
        zIndex: 5,
        display: 'flex',
        gap: '8px'
      }}>
        <button className="btn" onClick={() => onAddEndpoint(150 - pan.x / zoom, 150 - pan.y / zoom)}>+ Endpoint</button>
        <button className="btn" onClick={() => onAddLogicBlock(300 - pan.x / zoom, 150 - pan.y / zoom)}>+ Logic Block</button>
        <button className="btn" onClick={() => onAddDBModel(450 - pan.x / zoom, 150 - pan.y / zoom)}>+ DB Model</button>
        <button className="btn" onClick={() => { setPan({ x: 100, y: 100 }); setZoom(1); }}>Reset View</button>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          overflow: 'visible',
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          pointerEvents: 'none'
        }}
      >
        <svg 
          className="svg-connections" 
          style={{ 
            position: 'absolute', 
            left: -10000, 
            top: -10000, 
            width: 20000, 
            height: 20000, 
            overflow: 'visible', 
            pointerEvents: 'none' 
          }}
        >
          <g transform="translate(10000, 10000)">
            {renderConnections()}
          </g>
        </svg>

        {endpoints.map((ep) => (
          <div
            key={ep.id}
            className={`canvas-node ${selectedNodeId === ep.id ? 'selected' : ''}`}
            style={{
              left: ep.position.x,
              top: ep.position.y,
              borderTop: `4px solid ${getMethodColor(ep.method)}`,
              pointerEvents: 'auto'
            }}
            onMouseDown={(e) => startDragNode(e, ep.id, 'endpoint', ep.position)}
          >
            <div className="node-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: getMethodColor(ep.method), background: `${getMethodColor(ep.method)}22`, padding: '2px 6px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>{ep.method}</span>
                {ep.isAuthorized && <IconShield size={14} color="var(--primary)" style={{ opacity: 0.8 }} />}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--color-dim)', fontFamily: 'var(--font-mono)' }}>Elysia</span>
            </div>
            <div className="node-body">
              <div style={{ fontWeight: 600, fontSize: '15px' }}>{ep.name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontSize: '12px' }}>{ep.path}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button className="btn" style={{ height: '28px', padding: '0 10px', fontSize: '11px', borderColor: getMethodColor(ep.method), color: getMethodColor(ep.method) }} onClick={(e) => { e.stopPropagation(); onOpenEndpointLogic(ep); }} onMouseDown={e => e.stopPropagation()}>Edit Route</button>
              </div>
            </div>
            <div className="node-port input" onMouseDown={(e) => handlePortMouseDown(e, ep.id, 'in', 'input', ep.position.x, ep.position.y + 100)} onMouseUp={(e) => handlePortMouseUp(e, ep.id, 'in', 'input')} />
            <div className="node-port output" onMouseDown={(e) => handlePortMouseDown(e, ep.id, 'out', 'output', ep.position.x + 300, ep.position.y + 100)} onMouseUp={(e) => handlePortMouseUp(e, ep.id, 'out', 'output')} />
          </div>
        ))}

        {dbModels.map((model) => (
          <div
            key={model.id}
            className={`canvas-node ${selectedNodeId === model.id ? 'selected' : ''}`}
            style={{
              left: model.position.x,
              top: model.position.y,
              borderTop: `4px solid var(--secondary)`,
              pointerEvents: 'auto'
            }}
            onMouseDown={(e) => startDragNode(e, model.id, 'dbModel', model.position)}
          >
            <div className="node-header">
              <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--secondary)', background: 'var(--secondary-glow)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>sqlite</span>
              <span style={{ fontSize: '11px', color: 'var(--color-dim)', fontFamily: 'var(--font-mono)' }}>Drizzle Table</span>
            </div>
            <div className="node-body">
              <div style={{ fontWeight: 600, fontSize: '15px', fontFamily: 'var(--font-mono)' }}>{model.name}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                {model.columns.slice(0, 3).map((c) => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                    <span>{c.name}</span>
                    <span style={{ color: 'var(--color-dim)' }}>{c.type}</span>
                  </div>
                ))}
                {model.columns.length > 3 && <div style={{ fontSize: '10px', color: 'var(--color-dim)', textAlign: 'center' }}>+ {model.columns.length - 3} more columns</div>}
              </div>
            </div>
            <div className="node-port input" style={{ borderColor: 'var(--secondary)' }} onMouseDown={(e) => handlePortMouseDown(e, model.id, 'in', 'input', model.position.x, model.position.y + 100)} onMouseUp={(e) => handlePortMouseUp(e, model.id, 'in', 'input')} />
            <div className="node-port output" onMouseDown={(e) => handlePortMouseDown(e, model.id, 'out', 'output', model.position.x + 300, model.position.y + 100)} onMouseUp={(e) => handlePortMouseUp(e, model.id, 'out', 'output')} />
          </div>
        ))}

        {logicBlocks.map((block) => (
          <div
            key={block.id}
            className={`canvas-node ${selectedNodeId === block.id ? 'selected' : ''}`}
            style={{
              left: block.position.x,
              top: block.position.y,
              borderTop: `4px solid var(--accent)`,
              pointerEvents: 'auto'
            }}
            onMouseDown={(e) => startDragNode(e, block.id, 'logicBlock', block.position)}
          >
            <div className="node-header">
              <span style={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--accent)', background: 'rgba(168, 85, 247, 0.1)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}>fn</span>
              <span style={{ fontSize: '11px', color: 'var(--color-dim)', fontFamily: 'var(--font-mono)' }}>Logic Block</span>
            </div>
            <div className="node-body">
              <div style={{ fontWeight: 600, fontSize: '15px', fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{block.name}()</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button className="btn" style={{ height: '28px', padding: '0 10px', fontSize: '11px', borderColor: 'var(--accent)', color: 'var(--accent)' }} onClick={(e) => { e.stopPropagation(); onOpenLogicBlockLogic(block); }} onMouseDown={e => e.stopPropagation()}>Edit Logic</button>
              </div>
            </div>
            <div className="node-port input" style={{ borderColor: 'var(--accent)' }} onMouseDown={(e) => handlePortMouseDown(e, block.id, 'in', 'input', block.position.x, block.position.y + 100)} onMouseUp={(e) => handlePortMouseUp(e, block.id, 'in', 'input')} />
            <div className="node-port output" style={{ borderColor: 'var(--accent)' }} onMouseDown={(e) => handlePortMouseDown(e, block.id, 'out', 'output', block.position.x + 300, block.position.y + 100)} onMouseUp={(e) => handlePortMouseUp(e, block.id, 'out', 'output')} />
          </div>
        ))}
      </div>
    </div>
  );
}
