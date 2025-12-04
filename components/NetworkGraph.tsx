'use client';

import { useEffect, useRef, useCallback } from 'react';
import cytoscape, { Core, NodeSingular } from 'cytoscape';
import { getInitials } from '@/lib/utils';

interface GraphNode {
  id: string;
  name: string;
  profilePicture: string | null;
  hopDistance: number;
  linkedUserId: string | null;
}

interface GraphEdge {
  source: string;
  target: string;
}

interface NetworkGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  userProfileId: string;
  onNodeClick?: (nodeId: string, hopDistance: number) => void;
}

export function NetworkGraph({ nodes, edges, userProfileId, onNodeClick }: NetworkGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  
  const getNodeColor = useCallback((hopDistance: number) => {
    switch (hopDistance) {
      case 0: return '#0d5c5c'; // User - dark teal
      case 1: return '#47afaf'; // 1-hop - medium teal
      case 2: return '#a3d7d7'; // 2-hop - light teal
      default: return '#d1ebeb';
    }
  }, []);
  
  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;
    
    // Transform data for Cytoscape
    const elements = [
      ...nodes.map(node => ({
        data: {
          id: node.id,
          label: node.name,
          initials: getInitials(node.name),
          hopDistance: node.hopDistance,
          profilePicture: node.profilePicture,
          hasPhoto: !!node.profilePicture,
          linkedUserId: node.linkedUserId,
        },
      })),
      ...edges.map((edge, index) => ({
        data: {
          id: `edge-${index}`,
          source: edge.source,
          target: edge.target,
        },
      })),
    ];
    
    // Initialize Cytoscape
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        // Nodes WITHOUT photos - show initials
        {
          selector: 'node[!hasPhoto]',
          style: {
            'background-color': (ele: NodeSingular) => getNodeColor(ele.data('hopDistance')),
            'label': 'data(initials)',
            'text-valign': 'center',
            'text-halign': 'center',
            'color': '#ffffff',
            'font-size': '12px',
            'font-weight': 'bold',
            'font-family': 'DM Sans, sans-serif',
            'width': (ele: NodeSingular) => ele.data('hopDistance') === 0 ? 60 : 44,
            'height': (ele: NodeSingular) => ele.data('hopDistance') === 0 ? 60 : 44,
            'border-width': (ele: NodeSingular) => ele.data('linkedUserId') ? 0 : 2,
            'border-style': 'dashed',
            'border-color': '#94a3b8',
            'opacity': (ele: NodeSingular) => ele.data('hopDistance') <= 1 ? 1 : 0.7,
          },
        },
        // Nodes WITH photos - show image
        {
          selector: 'node[hasPhoto]',
          style: {
            'background-image': 'data(profilePicture)',
            'background-fit': 'cover',
            'background-clip': 'node',
            'label': '',
            'width': (ele: NodeSingular) => ele.data('hopDistance') === 0 ? 60 : 44,
            'height': (ele: NodeSingular) => ele.data('hopDistance') === 0 ? 60 : 44,
            'border-width': (ele: NodeSingular) => {
              if (ele.data('hopDistance') === 0) return 3;
              return ele.data('linkedUserId') ? 2 : 2;
            },
            'border-style': (ele: NodeSingular) => ele.data('linkedUserId') ? 'solid' : 'dashed',
            'border-color': (ele: NodeSingular) => {
              if (ele.data('hopDistance') === 0) return '#0d5c5c';
              return ele.data('linkedUserId') ? '#47afaf' : '#94a3b8';
            },
            'opacity': (ele: NodeSingular) => ele.data('hopDistance') <= 1 ? 1 : 0.7,
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#e2e8f0',
            'curve-style': 'bezier',
            'opacity': 0.6,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-color': '#ff7f5c',
            'border-style': 'solid',
          },
        },
      ],
      layout: {
        name: 'concentric',
        concentric: (node: NodeSingular) => {
          const hopDistance = node.data('hopDistance');
          return hopDistance === 0 ? 3 : hopDistance === 1 ? 2 : 1;
        },
        levelWidth: () => 1,
        minNodeSpacing: 50,
        padding: 50,
        animate: true,
        animationDuration: 500,
      },
      minZoom: 0.3,
      maxZoom: 2,
      wheelSensitivity: 1,
    });
    
    // Handle node clicks
    cyRef.current.on('tap', 'node', (event) => {
      const node = event.target;
      const nodeId = node.id();
      const hopDistance = node.data('hopDistance');
      onNodeClick?.(nodeId, hopDistance);
    });
    
    return () => {
      cyRef.current?.destroy();
    };
  }, [nodes, edges, userProfileId, onNodeClick, getNodeColor]);
  
  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[400px] bg-gradient-to-br from-cream to-cream-dark rounded-2xl"
    />
  );
}
