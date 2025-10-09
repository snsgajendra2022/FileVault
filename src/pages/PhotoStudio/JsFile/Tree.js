"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import api from "../../../services/api";
import { toast } from "react-hot-toast";
import "./Tree.css";

// --- Helpers ---
function sanitizeIdPart(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 40);
}

function convertFamilyDataToTree(data) {
  const root = {
    id: "clients-root",
    name: "Clients",
    children: [],
  };

  const toPerson = (member, index) => {
    const baseId = typeof member?.userId === "number"
      ? String(member.userId)
      : `${sanitizeIdPart(member?.username || member?.email || member?.name || "client")}-${index}`;

    const children = Array.isArray(member?.clients) && member.clients.length > 0
      ? member.clients.map((child, i) => toPerson(child, i))
      : undefined;

    return {
      id: `client-${baseId}`,
      name:
        member?.name ||
        member?.username ||
        (typeof member?.email === "string" ? member.email.split("@")[0] : "Client"),
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

function linkPath(s, t) {
  const x = d3.interpolateNumber(s[0], t[0])(0.5);
  return `M${s[0]},${s[1]} C ${s[0]},${(s[1] + t[1]) / 2} ${x},${(s[1] + t[1]) / 2} ${t[0]},${t[1]}`;
}

export default function Tree() {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const gRef = useRef(null);

  const [rootData, setRootData] = useState(() => {
    const fallback = {
      you: { name: "You", age: null, gender: null, relation: "You", isYou: true, isElder: false },
      clients: [],
    };
    return convertFamilyDataToTree(fallback);
  });
  const [collapsed, setCollapsed] = useState(new Set());
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState(null);

  const root = useMemo(() => d3.hierarchy(rootData), [rootData]);

  // Fetch family data from API
  const fetchFamilyData = async () => {
    try {
      setLoading(true);

      // Fetch profile to detect current user id
      let currentUserId = null;
      try {
        const profileRes = await api.get("/api/auth/profile");
        const p = profileRes?.data || {};
        currentUserId = typeof p?.id === "number" ? p.id
          : typeof p?.userId === "number" ? p.userId
          : typeof p?.user?.id === "number" ? p.user.id
          : null;
        if (currentUserId !== null) setMyUserId(currentUserId);
      } catch {
        // ignore profile errors; proceed without filtering if unknown
      }

      const response = await api.get("/api/simple-invitations/family-relationships");

      if (response.data?.success) {
        if (response.data.familyData) {
          const familyData = response.data.familyData;

          const filterOutSelf = (list) => {
            const input = Array.isArray(list) ? list : [];
            return input
              .filter((m) => {
                if (currentUserId === null) return true;
                return typeof m?.userId === "number" ? m.userId !== currentUserId : true;
              })
              .map((m) => ({
                ...m,
                clients: filterOutSelf(m?.clients),
              }));
          };

          const sanitized = {
            ...familyData,
            clients: filterOutSelf(familyData?.clients),
          };

          const newRootData = convertFamilyDataToTree(sanitized);
          setRootData(newRootData);
          toast.success("Family data loaded successfully");
        } else {
          toast.error("Invalid data format received from server");
        }
      } else {
        toast.error(response.data?.message || "Failed to load family data");
      }
    } catch (error) {
      if (error?.response) {
        const errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
        toast.error(errorMessage);
      } else if (error?.request) {
        toast.error("Network error: Unable to connect to server");
      } else {
        toast.error("Failed to load family data");
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    fetchFamilyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Layout computation
  const layout = useMemo(() => {
    const tree = d3
      .tree()
      .nodeSize([173, 140])
      .separation((a, b) => (a.parent === b.parent ? 1.2 : 1.6));

    const copy = root.copy();
    copy.eachBefore((d) => {
      if (collapsed.has(d.data.id)) d.children = null;
    });

    return tree(copy);
  }, [root, collapsed]);

  // Collapse all nodes on first render, keep first level expanded
  useEffect(() => {
    if (collapsed.size > 0) return;
    const next = new Set();
    root.each((d) => {
      const isRoot = d.depth === 0;
      const isFirstLevel = d.depth === 1;
      if (d.children && d.children.length > 0) {
        if (!isRoot && !isFirstLevel) {
          next.add(d.data.id);
        }
      }
    });
    setCollapsed(next);
  }, [root, collapsed.size]);

  // Zoom & pan
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    const zoomed = (event) => g.attr("transform", event.transform.toString());
    const zoom = d3.zoom().scaleExtent([0.05, 3]).on("zoom", zoomed);
    svg.call(zoom);

    const { width, height } = svgRef.current.getBoundingClientRect();
    const xExtent = d3.extent(layout.descendants(), (d) => d.x);
    const yExtent = d3.extent(layout.descendants(), (d) => d.y);
    const contentWidth = xExtent[1] - xExtent[0] + 240;
    const contentHeight = yExtent[1] - yExtent[0] + 240;
    const scale = Math.min(width / contentWidth, height / contentHeight);
    const transform = d3.zoomIdentity
      .translate(width / 2, 60)
      .scale(Math.max(0.3, Math.min(1.2, scale)))
      .translate(-layout.x, 0);
    svg.call(zoom.transform, transform);

    return () => {
      svg.on("wheel.zoom", null);
    };
  }, [layout]);

  // Focus on selected node
  const focusOn = (nodeId) => {
    const node = layout.descendants().find((d) => d.data.id === nodeId);
    if (!node || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const { width, height } = svgRef.current.getBoundingClientRect();
    const transform = d3.zoomIdentity
      .translate(width / 2, height * 0.18)
      .scale(1.1)
      .translate(-node.x, -node.y);
    svg.transition().duration(600).call(d3.zoom().transform, transform);
  };

  // Toggle node collapse
  const toggle = (id) =>
    setCollapsed((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  // Collapse all descendants
  const collapseAll = (id) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      const node = layout.descendants().find((d) => d.data.id === id);
      if (node) {
        node.descendants().forEach((d) => next.add(d.data.id));
      } else {
        next.add(id);
      }
      return next;
    });

  // Expand all descendants
  const expandAll = (id) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      const node = layout.descendants().find((d) => d.data.id === id);
      if (node) {
        node.descendants().forEach((d) => next.delete(d.data.id));
      } else {
        next.delete(id);
      }
      return next;
    });

  const nodes = layout.descendants();
  const links = layout.links();

  return (
    <div ref={containerRef} className="tree-container">
      {loading && (
        <div className="tree-loading-overlay">
          <div className="tree-loading-box">
            <div className="tree-spinner" />
            <p className="tree-loading-text">Loading family data...</p>
          </div>
        </div>
      )}

      <div className="tree-canvas">
        <svg ref={svgRef} className="tree-svg" aria-label="Family/Client Tree">
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
                  className={selected === n.data.id ? "tree-node-rect selected" : "tree-node-rect"}
                  filter="url(#shadow)"
                />
                <text
                  x={0}
                  y={-14}
                  textAnchor="middle"
                  className="tree-node-title"
                  style={{ userSelect: "none" }}
                >
                  {String(n.data.name || "").toUpperCase()}
                </text>

                <g
                  className="tree-avatar"
                  onClick={() => {
                    setSelected(n.data.id);
                    focusOn(n.data.id);
                  }}
                >
                  <circle cx={0} cy={26} r={28} className="tree-avatar-circle" />
                  <g transform="translate(-12,12)" className="tree-avatar-icon">
                    {AVATAR_SILHOUETTE}
                  </g>
                </g>

                {n.data.children && n.data.children.length > 0 && (
                  <g transform={`translate(${0},${68})`}>
                    {collapsed.has(n.data.id) ? (
                      <g
                        className="tree-toggle"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(n.data.id);
                        }}
                      >
                        <circle cx={0} cy={0} r={10} className="tree-toggle-plus" />
                        <text x={0} y={4} textAnchor="middle" className="tree-toggle-plus-text">+</text>
                      </g>
                    ) : (
                      <g
                        className="tree-toggle"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(n.data.id);
                        }}
                      >
                        <circle cx={0} cy={0} r={10} className="tree-toggle-minus" />
                        <text x={0} y={4} textAnchor="middle" className="tree-toggle-minus-text">–</text>
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
        <aside className="tree-sidebar">
          <div className="tree-sidebar-header">
            <div className="tree-sidebar-avatar">
              <svg viewBox="0 0 24 24" width="20" height="20">{AVATAR_SILHOUETTE}</svg>
            </div>
            <div className="tree-sidebar-title">
              <div className="tree-sidebar-selected-label">Selected</div>
              <div className="tree-sidebar-selected-name">
                {nodes.find((n) => n.data.id === selected)?.data.name || "None"}
              </div>
            </div>
            <button className="tree-sidebar-close" onClick={() => setSelected(null)} aria-label="Close">✕</button>
          </div>

          <div className="tree-sidebar-actions">
            <Action label="Focus tree on selected" onClick={() => selected && focusOn(selected)} />
            <Action label="Expand one level" onClick={() => selected && toggle(selected)} />
            <Action label="Expand all under selected" onClick={() => selected && expandAll(selected)} />
            <Action label="Collapse selected" onClick={() => selected && collapseAll(selected)} />
            <Action label="Refresh family data" onClick={fetchFamilyData} />
          </div>

          <div className="tree-sidebar-help">Zoom: mouse wheel • Pan: drag • Collapse: Hide/Expand</div>
        </aside>
      )}
    </div>
  );
}

function Action({ label, onClick }) {
  return (
    <button onClick={onClick} className="tree-action-btn">
      <span className="tree-action-label">{label}</span>
      <svg viewBox="0 0 20 20" width="18" height="18" className="tree-action-icon" aria-hidden>
        <path d="M7 5l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    </button>
  );
}


