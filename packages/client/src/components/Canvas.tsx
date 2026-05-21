import React, { useState, useRef, useEffect } from 'react';
import type { Endpoint, DBModel, LogicBlock, Connection } from '../types';
import { EndpointNode } from './nodes/EndpointNode';
import { DBModelNode } from './nodes/DBModelNode';
import { LogicBlockNode } from './nodes/LogicBlockNode';
import { ConnectionOverlay } from './ConnectionOverlay';

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
  
  const [activeConnStart, setActiveConnStart] = useState<{ nodeId: string; portName: string; type: 'input' | 'output'; x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);
  const panStart = useRef({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    if (e.target && ((e.target as HTMLElement).closest('.node-body') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('textarea'))) {
      return;
    }
    e.preventDefault();
    const zoomFactor = e.ctrlKey ? 1.02 : 1.08;
    let newZoom = e.deltaY < 0 ? Math.min(zoom * zoomFactor, 2.5) : Math.max(zoom / zoomFactor, 0.35);
    newZoom = parseFloat(newZoom.toFixed(2));
    if (newZoom === zoom) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const unzoomedX = (mouseX - pan.x) / zoom;
      const unzoomedY = (mouseY - pan.y) / zoom;
      setPan({ x: mouseX - unzoomedX * newZoom, y: mouseY - unzoomedY * newZoom });
    }
    setZoom(newZoom);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { e.code === 'Space' && setIsSpacePressed(false); };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    const isMiddleClick = e.button === 1;
    const isBgClick = e.target === canvasRef.current || (e.target as any).classList?.contains('svg-connections');
    if (isMiddleClick || (e.button === 0 && (isBgClick || isSpacePressed))) {
      e.preventDefault();
      setIsPanning(true);
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    } else if (e.button === 0 && isBgClick) {
      onSelectNode(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (isPanning) {
      setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
    } else if (draggedNode) {
      const x = Math.round(((e.clientX - rect.left) - pan.x - draggedNode.offset.x) / zoom);
      const y = Math.round(((e.clientY - rect.top) - pan.y - draggedNode.offset.y) / zoom);
      onUpdateNodePosition(draggedNode.id, draggedNode.type, Math.round(x / 8) * 8, Math.round(y / 8) * 8);
    }
    if (activeConnStart) {
      setMousePos({ x: (e.clientX - rect.left - pan.x) / zoom, y: (e.clientY - rect.top - pan.y) / zoom });
    }
  };

  const startDragNode = (e: React.MouseEvent, id: string, type: any, currentPos: { x: number; y: number }) => {
    if (isSpacePressed) return;
    e.stopPropagation();
    onSelectNode(id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = (e.clientX - rect.left - pan.x) / zoom;
    const clickY = (e.clientY - rect.top - pan.y) / zoom;
    setDraggedNode({ id, type, offset: { x: (clickX - currentPos.x) * zoom, y: (clickY - currentPos.y) * zoom } });
  };

  const getMethodColor = (method: string) => {
    const colors: any = { get: '#10b981', post: '#3b82f6', put: '#f59e0b', delete: '#ef4444' };
    return colors[method.toLowerCase()] || '#3b82f6';
  };

  return (
    <div
      ref={canvasRef}
      className="w-full h-full relative overflow-hidden bg-slate-50 select-none"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => { setIsPanning(false); setDraggedNode(null); setActiveConnStart(null); }}
      style={{ cursor: isPanning ? 'grabbing' : isSpacePressed ? 'grab' : 'default' }}
    >
      <div className="canvas-grid" style={{ transform: `translate(${pan.x % (24 * zoom)}px, ${pan.y % (24 * zoom)}px) scale(${zoom})`, opacity: 0.5 }} />

      {/* Info Panel */}
      <div className="glass-panel absolute top-[100px] right-6 p-3 text-[11px] font-mono text-slate-500 z-50 flex flex-col gap-1">
        <div className="flex justify-between gap-5"><span>ZOOM</span><span>{Math.round(zoom * 100)}%</span></div>
        <div className="flex justify-between gap-5"><span>POS</span><span>{Math.round(pan.x)}, {Math.round(pan.y)}</span></div>
      </div>

      {/* Action Buttons */}
      <div className="fixed bottom-6 right-6 flex gap-2 z-50">
        <button className="btn bg-white" onClick={() => onAddEndpoint(150 - pan.x / zoom, 150 - pan.y / zoom)}>+ Endpoint</button>
        <button className="btn bg-white" onClick={() => onAddLogicBlock(300 - pan.x / zoom, 150 - pan.y / zoom)}>+ Logic Block</button>
        <button className="btn bg-white" onClick={() => onAddDBModel(450 - pan.x / zoom, 150 - pan.y / zoom)}>+ DB Model</button>
        <button className="btn bg-white" onClick={() => { setPan({ x: 100, y: 100 }); setZoom(1); }}>Reset View</button>
      </div>

      {/* Render Container */}
      <div className="absolute top-0 left-0 w-0 h-0 overflow-visible pointer-events-none" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
        <ConnectionOverlay
          connections={connections}
          endpoints={endpoints}
          dbModels={dbModels}
          logicBlocks={logicBlocks}
          activeConnStart={activeConnStart}
          mousePos={mousePos}
          onDeleteConnection={onDeleteConnection}
        />

        {endpoints.map(ep => (
          <EndpointNode
            key={ep.id}
            ep={ep}
            isSelected={selectedNodeId === ep.id}
            onDragStart={(e) => startDragNode(e, ep.id, 'endpoint', ep.position)}
            onOpenLogic={() => onOpenEndpointLogic(ep)}
            getMethodColor={getMethodColor}
            onPortMouseDown={(e, port, type, x, y) => { e.stopPropagation(); setActiveConnStart({ nodeId: ep.id, portName: port, type, x, y }); }}
            onPortMouseUp={(e, port, type) => {
              if (activeConnStart && activeConnStart.nodeId !== ep.id && activeConnStart.type !== type) {
                onAddConnection({ id: `conn_${Date.now()}`, fromNodeId: activeConnStart.type === 'output' ? activeConnStart.nodeId : ep.id, fromPortName: 'out', toNodeId: activeConnStart.type === 'input' ? activeConnStart.nodeId : ep.id, toPortName: 'in' });
              }
            }}
          />
        ))}

        {dbModels.map(model => (
          <DBModelNode
            key={model.id}
            model={model}
            isSelected={selectedNodeId === model.id}
            onDragStart={(e) => startDragNode(e, model.id, 'dbModel', model.position)}
            onPortMouseDown={(e, port, type, x, y) => { e.stopPropagation(); setActiveConnStart({ nodeId: model.id, portName: port, type, x, y }); }}
            onPortMouseUp={() => {}}
          />
        ))}

        {logicBlocks.map(block => (
          <LogicBlockNode
            key={block.id}
            block={block}
            isSelected={selectedNodeId === block.id}
            onDragStart={(e) => startDragNode(e, block.id, 'logicBlock', block.position)}
            onOpenLogic={() => onOpenLogicBlockLogic(block)}
            onPortMouseDown={(e, port, type, x, y) => { e.stopPropagation(); setActiveConnStart({ nodeId: block.id, portName: port, type, x, y }); }}
            onPortMouseUp={() => {}}
          />
        ))}
      </div>
    </div>
  );
}
