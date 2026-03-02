"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import api from "../../services/api";
import { toast } from "react-hot-toast";
import './Tree.css';

// Data types
export type Person = {
  id: string;
  name: string;
  children?: Person[];
};

type FamilyMember = {
  name: string;
  age: number | null;
  gender: string | null;
  relation: string | null;
  isYou?: boolean;
  isElder?: boolean;
  userId?: number;
  username?: string;
  email?: string;
  clients?: FamilyMember[] | null;
};

type FamilyData = {
  you: FamilyMember | null;
  clients?: FamilyMember[] | null;
 };

// declare global {
//   interface Window {
//     __FAMILY_DATA__?: FamilyData;
//   }
// }

function sanitizeIdPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 40);
}

function convertFamilyDataToTree(data: FamilyData): Person {
  const root: Person = {
    id: 'clients-root',
    name: 'Clients',
    children: [],
  };

  const toPerson = (member: FamilyMember, index: number): Person => {
    const baseId = typeof (member as any).userId === 'number'
      ? String((member as any).userId)
      : `${sanitizeIdPart(member.username || member.email || member.name || 'client')}-${index}`;
    const children = Array.isArray(member.clients) && member.clients.length > 0
      ? member.clients.map((child, i) => toPerson(child, i))
      : undefined;
    return {
      id: `client-${baseId}`,
      name: member.name || member.username || (typeof (member as any).email === 'string' ? (member as any).email.split('@')[0] : 'Client'),
      children,
    };
  };

  const topLevelClients = data?.clients || [];
  if (topLevelClients.length > 0) {
    root.children = topLevelClients.map((m, idx) => toPerson(m, idx));
  }

  return root;
}

const AVATAR_SILHOUETTE = (
  <path
    d="M12 13.5c3.59 0 6.5 2.24 6.5 5v.75a.75.75 0 0 1-.75.75H6.25a.75.75 0 0 1-.75-.75V18.5c0-2.76 2.91-5 6.5-5Zm0-1.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z"
    fill="currentColor"
    opacity=".85"
  />
);

function linkPath(s: [number, number], t: [number, number]) {
  const x = d3.interpolateNumber(s[0], t[0])(0.5);
  return `M${s[0]},${s[1]} C ${s[0]},${(s[1] + t[1]) / 2} ${x},${(s[1] + t[1]) / 2} ${t[0]},${t[1]}`;
}

export default function ClientTreePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);

  const [rootData, setRootData] = useState<Person>(() => {
    // Default fallback data
    const fallback: FamilyData = {
      you: { name: "You", age: null, gender: null, relation: "You", isYou: true, isElder: false },
      clients: [],
    };
    return convertFamilyDataToTree(fallback);
  });
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const initialToastShownRef = useRef(false);

  const root = useMemo(() => d3.hierarchy<Person>(rootData), [rootData]);

  // Fetch family data from API
  const fetchFamilyData = async (isInitial: boolean = false) => {
    try {
      setLoading(true);
      console.log('Fetching family data from API...');
      
      // Fetch profile to detect current user id
      let currentUserId: number | null = null;
      try {
        const profileRes = await api.get('/api/auth/profile');
        const p = profileRes?.data || {};
        currentUserId = typeof p?.id === 'number' ? p.id
          : typeof p?.userId === 'number' ? p.userId
          : typeof p?.user?.id === 'number' ? p.user.id
          : null;
        if (currentUserId !== null) setMyUserId(currentUserId);
      } catch {
        // ignore profile errors; proceed without filtering if unknown
      }

      const response = await api.get('/api/simple-invitations/family-relationships');
      console.log('Family data API response:', response.data);
      
      if (response.data.success) {
        // Check if the API response has the expected structure
        if (response.data.familyData) {
          const familyData: FamilyData = response.data.familyData;

          // Recursively filter out current user from clients by userId
          const filterOutSelf = (list?: FamilyMember[] | null): FamilyMember[] => {
            const input = Array.isArray(list) ? list : [];
            return input
              .filter((m) => {
                if (currentUserId === null) return true;
                return typeof m.userId === 'number' ? m.userId !== currentUserId : true;
              })
              .map((m) => ({
                ...m,
                clients: filterOutSelf(m.clients),
              }));
          };

          const sanitized: FamilyData = {
            ...familyData,
            clients: filterOutSelf(familyData.clients),
          };

          const newRootData = convertFamilyDataToTree(sanitized);
          setRootData(newRootData);

          if (isInitial) {
            if (!initialToastShownRef.current) {
              toast.success('Family data loaded successfully');
              initialToastShownRef.current = true;
            }
          } else {
            toast.success('Family data loaded successfully');
          }
        } else {
          console.error('API response missing familyData:', response.data);
          toast.error('Invalid data format received from server');
        }
      } else {
        console.error('API returned success: false', response.data);
        toast.error(response.data.message || 'Failed to load family data');
      }
    } catch (error: any) {
      console.error('Error fetching family data:', error);
      
      // Handle different types of errors
      if (error.response) {
        // Server responded with error status
        const errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
        toast.error(errorMessage);
        console.error('Server error details:', error.response.data);
      } else if (error.request) {
        // Network error
        toast.error('Network error: Unable to connect to server');
        console.error('Network error:', error.request);
      } else {
        // Other error
        toast.error('Failed to load family data');
        console.error('Other error:', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchFamilyData(true);
  }, []);

  // Layout computation
  const layout = useMemo(() => {
    const tree = d3
      .tree<Person>()
      // Horizontal spacing equals card width (168px) + 5px gap
      .nodeSize([173, 140])
      .separation((a, b) => (a.parent === b.parent ? 1.2 : 1.6));

    const copy = root.copy();
    copy.eachBefore((d) => {
      if (collapsed.has(d.data.id)) d.children = null;
    });

    return tree(copy);
  }, [root, collapsed]);

  // Collapse all nodes on first render, but keep first level expanded
  useEffect(() => {
    if (collapsed.size > 0) return; // already initialized
    const next = new Set<string>();
    root.each((d) => {
      const isRoot = d.depth === 0;
      const isFirstLevel = d.depth === 1;
      if (d.children && d.children.length > 0) {
        // collapse all except the first level under root
        if (!isRoot && !isFirstLevel) {
          next.add(d.data.id);
        }
      }
    });
    setCollapsed(next);
  }, [root]);

  // Zoom & pan functionality
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    const zoomed = (event: any) => g.attr("transform", event.transform.toString());
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      // Allow much smaller zoom-out to see the full tree
      .scaleExtent([0.05, 3])
      .on("zoom", zoomed);
    svg.call(zoom as any);

    const { width, height } = svgRef.current.getBoundingClientRect();
    const xExtent = d3.extent(layout.descendants(), (d) => d.x) as [number, number];
    const yExtent = d3.extent(layout.descendants(), (d) => d.y) as [number, number];
    const contentWidth = xExtent[1] - xExtent[0] + 240;
    const contentHeight = yExtent[1] - yExtent[0] + 240;
    const scale = Math.min(width / contentWidth, height / contentHeight);
    const transform = d3.zoomIdentity
      .translate(width / 2, 60)
      .scale(Math.max(0.3, Math.min(1.2, scale)))
      .translate(-layout.x, 0);
    svg.call(zoom.transform as any, transform);

    return () => {
      svg.on("wheel.zoom", null);
    };
  }, [layout]);

  // Focus on selected node
  const focusOn = (nodeId: string) => {
    const node = layout.descendants().find((d) => d.data.id === nodeId);
    if (!node || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const { width, height } = svgRef.current.getBoundingClientRect();
    const transform = d3.zoomIdentity
      .translate(width / 2, height * 0.18)
      .scale(1.1)
      .translate(-node.x, -node.y);
    svg.transition().duration(600).call((d3 as any).zoom().transform, transform);
  };

  // Toggle node collapse
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  // Collapse all descendants of a node
  const collapseAll = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      const node = layout.descendants().find((d) => d.data.id === id);
      if (node) {
        // Collapse the entire subtree
        node.descendants().forEach((d) => next.add(d.data.id));
      } else {
        next.add(id);
      }
      return next;
    });

  // Expand all descendants of a node
  const expandAll = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      const node = layout.descendants().find((d) => d.data.id === id);
      if (node) {
        // Remove collapsed marks for this node and all its descendants
        node.descendants().forEach((d) => next.delete(d.data.id));
      } else {
        next.delete(id);
      }
      return next;
    });

  const nodes = layout.descendants();
  const links = layout.links();

  return (
    <div ref={containerRef} className="relative w-[100%] h-screen bg-[#f8fafc]">
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 font-medium">Loading family data...</p>
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-white shadow-sm  ring-gray-200 overflow-hidden">
        <svg ref={svgRef} className="w-full h-full block select-none" aria-label="Family/Client Tree">
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" />
            </filter>
          </defs>
          <g ref={gRef}>
            {links.map((l, i) => (
              <path
                key={i}
                d={linkPath([l.source.x, l.source.y + 36], [l.target.x, l.target.y - 48])}
                stroke="#B8C2CC"
                strokeWidth={2}
                fill="none"
                opacity={0.9}
              />
            ))}

            {nodes.map((n) => (
              <g key={n.data.id} transform={`translate(${n.x},${n.y})`}>
                <rect
                  x={-84}
                  y={-36}
                  width={168}
                  height={100}
                  rx={10}
                  fill={selected === n.data.id ? "#DBEAFE" : "#ffffff"}
                  stroke={selected === n.data.id ? "#2B79C2" : "#E5E7EB"}
                  strokeWidth={selected === n.data.id ? 2 : 1}
                  filter="url(#shadow)"
                />
                <text x={0} y={-14} textAnchor="middle" fontSize={12} fontWeight={700} fill="#6B7280" style={{ userSelect: "none" }}>
                  {n.data.name.toUpperCase()}
                </text>

                <g className="cursor-pointer" onClick={() => {
                  setSelected(n.data.id);
                  focusOn(n.data.id);
                }}>
                  <circle cx={0} cy={26} r={28} fill="#fff" stroke="#513cd2" strokeWidth={4} />
                  <g transform="translate(-12,12)" fill="#111827">
                    {AVATAR_SILHOUETTE}
                  </g>
                </g>

                {n.data.children && n.data.children.length > 0 && (
                  <g transform={`translate(${0},${68})`}>
                    {collapsed.has(n.data.id) ? (
                      <g className="cursor-pointer" onClick={(e) => { e.stopPropagation(); toggle(n.data.id); }}>
                        <circle cx={0} cy={0} r={10} fill="#2B79C2" />
                        <text x={0} y={4} textAnchor="middle" fontSize={14} fontWeight={700} fill="#fff">+</text>
                      </g>
                    ) : (
                      <g className="cursor-pointer" onClick={(e) => { e.stopPropagation(); toggle(n.data.id); }}>
                        <circle cx={0} cy={0} r={10} fill="#EF4444" />
                        <text x={0} y={4} textAnchor="middle" fontSize={16} fontWeight={800} fill="#fff">–</text>
                      </g>
                    )}
                  </g>
                )}
              </g>
            ))}
          </g>
        </svg>
      </div>

      {selected && (
        <aside className="fixed right-4 top-4 bottom-4 w-80 rounded-2xl bg-white ring-gray-200 shadow-lg p-4 flex flex-col z-50">
          <div className="flex items-center gap-3 border-b pb-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 grid place-items-center text-gray-600">
              <svg viewBox="0 0 24 24" width="20" height="20">{AVATAR_SILHOUETTE}</svg>
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-500">Selected</div>
              <div className="font-semibold text-gray-800 text-base break-words max-w-[220px]">
                {nodes.find((n) => n.data.id === selected)?.data.name || "None"}
              </div>
            </div>
            <button className="ml-2 text-gray-400 hover:text-gray-600" onClick={() => setSelected(null)} aria-label="Close">✕</button>
          </div>

          <div className="mt-4 grid gap-2">
            <Action label="Focus tree on selected" onClick={() => selected && focusOn(selected)} />
            <Action label="Expand one level" onClick={() => selected && toggle(selected)} />
            <Action label="Expand all under selected" onClick={() => selected && expandAll(selected)} />
            <Action label="Collapse selected" onClick={() => selected && collapseAll(selected)} />
            <Action label="Refresh family data" onClick={fetchFamilyData} />
          </div>

          <div className="mt-auto pt-4 text-xs text-gray-400">
            Zoom: mouse wheel • Pan: drag • Collapse: Hide/Expand
          </div>
        </aside>
      )}
    </div>
  );
}

function Action({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/60 text-gray-700"
    >
      <span className="text-sm font-medium">{label}</span>
      <svg viewBox="0 0 20 20" width="18" height="18" className="text-blue-600" aria-hidden>
        <path d="M7 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    </button>
  );
}
