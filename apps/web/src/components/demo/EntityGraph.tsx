// ============================================================
// EntityGraph — SVG Node-Edge Network Visualization
// Runs without D3, maps abstract Signal/District correlation
// ============================================================

import { useMemo } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { useCityData } from '../../hooks/useCityData';
import './EntityGraph.css';

interface Node {
  id: string;
  label: string;
  type: 'CITY' | 'DISTRICT' | 'SIGNAL';
  x: number;
  y: number;
  r: number;
  severity?: 'info' | 'warning' | 'critical';
}

interface Edge {
  id: string;
  source: Node;
  target: Node;
  strength: number;
}

export function EntityGraph() {
  const currentCity = useCityStore((s) => s.currentCity);
  const { signals } = useCityData(currentCity);

  const { nodes, edges } = useMemo(() => {
    // Generate deterministic layout based on current City and live Signals
    const ns: Node[] = [];
    const es: Edge[] = [];
    
    // Central Node
    const cityNode: Node = {
      id: currentCity,
      label: currentCity.toUpperCase(),
      type: 'CITY',
      x: 130, y: 150, r: 24
    };
    ns.push(cityNode);

    // Get unique districts from active signals
    const uniqueDistricts = Array.from(new Set(signals.filter(s => s.district).map(s => s.district as string)));
    
    uniqueDistricts.forEach((dist, i) => {
      const angle = (i / uniqueDistricts.length) * Math.PI * 2;
      const distNode: Node = {
        id: `dist-${dist}`,
        label: dist.toUpperCase(),
        type: 'DISTRICT',
        x: 130 + Math.cos(angle) * 80,
        y: 150 + Math.sin(angle) * 80,
        r: 16
      };
      ns.push(distNode);
      
      // Connect city to district
      es.push({
        id: `e-${cityNode.id}-${distNode.id}`,
        source: cityNode,
        target: distNode,
        strength: 0.8
      });

      // Find signals for this district
      const distSignals = signals.filter(s => s.district === dist);
      distSignals.forEach((sig, j) => {
        const sAngle = angle + ((j - distSignals.length/2) * 0.4);
        const sigNode: Node = {
          id: sig.id,
          label: sig.source.substring(0, 3).toUpperCase(),
          type: 'SIGNAL',
          x: distNode.x + Math.cos(sAngle) * 45,
          y: distNode.y + Math.sin(sAngle) * 45,
          r: 8,
          severity: sig.severity
        };
        ns.push(sigNode);
        
        // Connect district to signal
        es.push({
          id: `e-${distNode.id}-${sigNode.id}`,
          source: distNode,
          target: sigNode,
          strength: sig.severity === 'critical' ? 1 : 0.4
        });
      });
    });

    return { nodes: ns, edges: es };
  }, [currentCity, signals]);

  return (
    <div className="entity-graph">
      <div className="entity-graph__title">ENTITY CORRELATION GRAPH</div>
      
      <svg className="entity-graph__svg" viewBox="0 0 260 300">
        <defs>
          <radialGradient id="node-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0, 220, 255, 0.4)" />
            <stop offset="100%" stopColor="rgba(0, 220, 255, 0)" />
          </radialGradient>
        </defs>

        {/* Render Edges */}
        {edges.map(e => (
          <line
            key={e.id}
            x1={e.source.x} y1={e.source.y}
            x2={e.target.x} y2={e.target.y}
            className="entity-graph__edge"
            style={{ opacity: e.strength }}
          />
        ))}

        {/* Render Nodes */}
        {nodes.map(n => {
          let nodeClass = `entity-graph__node entity-graph__node--${n.type.toLowerCase()}`;
          if (n.type === 'SIGNAL' && n.severity) {
            nodeClass += ` entity-graph__node--${n.severity}`;
          }

          return (
            <g key={n.id} className="entity-graph__node-group">
              <circle cx={n.x} cy={n.y} r={n.r + 8} fill="url(#node-glow)" />
              <circle cx={n.x} cy={n.y} r={n.r} className={nodeClass} />
              <text 
                x={n.x} 
                y={n.y + (n.type === 'CITY' ? n.r + 12 : n.r + 8)} 
                className={`entity-graph__label ${n.type === 'CITY' ? 'entity-graph__label--city' : ''}`}
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
