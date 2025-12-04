'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NetworkGraph } from '@/components/NetworkGraph';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { STRINGS } from '@/lib/constants';
import { Plus, Users } from 'lucide-react';

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

interface NetworkData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  userProfileId: string;
}

export default function NetworkPage() {
  const router = useRouter();
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch('/api/network')
      .then(res => res.json())
      .then(data => {
        setNetworkData(data);
        setLoading(false);
      });
  }, []);
  
  const handleNodeClick = (nodeId: string, hopDistance: number) => {
    if (hopDistance <= 1) {
      router.push(`/profile/${nodeId}`);
    } else {
      // For 2+ hop nodes, could show a modal or limited view
      router.push(`/profile/${nodeId}`);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }
  
  const connectionCount = networkData?.nodes.filter(n => n.hopDistance === 1).length || 0;
  
  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 max-w-5xl mx-auto">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-900">
            {STRINGS.network.myNetwork}
          </h1>
          <p className="text-gray-600 mt-1">
            {connectionCount} {STRINGS.network.connections}
          </p>
        </div>
        <Button onClick={() => router.push('/add-person')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Person
        </Button>
      </div>
      
      {/* Graph */}
      {connectionCount === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title={STRINGS.network.noConnections}
          description={STRINGS.network.startBuilding}
          action={
            <Button onClick={() => router.push('/add-person')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Connection
            </Button>
          }
        />
      ) : (
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-soft overflow-hidden" style={{ height: '60vh', minHeight: '400px' }}>
            <NetworkGraph
              nodes={networkData?.nodes || []}
              edges={networkData?.edges || []}
              userProfileId={networkData?.userProfileId || ''}
              onNodeClick={handleNodeClick}
            />
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-teal-600" />
              <span>You</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-teal-400" />
              <span>Direct connections</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-teal-200" />
              <span>2nd degree</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

