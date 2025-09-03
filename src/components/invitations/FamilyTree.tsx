import React, { useMemo } from "react";
// import ReactFlow, { Background, Node, Edge, Position } from "reactflow";
import "reactflow/dist/style.css";
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import ReactFlow, { Background, Edge, Node, Position } from "reactflow";

/** -------- Types for data you'll pass in later -------- */
type Relationship = {
  id: number;
  otherUserFirstName: string;
  otherUserLastName: string;
  relationshipType: string; // e.g. 'FATHER'|'MOTHER'|'GRANDPARENT'|'COUSIN'|'SON'|'DAUGHTER'|'CHILD'|...
  otherUserUsername: string;
  canViewImages: boolean;
  canUploadImages: boolean;
  canDeleteImages: boolean;
  canManageAlbums: boolean;
  createdAt: string;
  relationshipNotes: string;
};

type CardData = { 
  name: string; 
  sub?: string; 
  gray?: boolean;
  username?: string;
  relationship?: Relationship;
};

/** -------- Visual constants (match screenshot styling) -------- */
const Navy = "#23233B";

/** -------- Small "person card" component used by React Flow nodes -------- */
const PersonCard: React.FC<{ data: CardData }> = ({ data }) => (
  <div
    style={{
      width: 138,
      height: 188,
      borderRadius: 12,
      border: `1.5px solid ${Navy}`,
      background: "white",
      boxShadow: "0 2px 8px rgba(0,0,0,.06)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingTop: 14,
    }}
  >
    {/* avatar */}
    <div
      style={{
        width: 56,
        height: 56,
        borderRadius: "50%",
        overflow: "hidden",
        border: "2px solid #E5E7EB",
        // filter: data.gray ? "redscale(100%)" : "none",
        // background:  "radial-gradient(circle at 30% 30%, #3b82f6 0%, #1d4ed8 40%, #1e40af 100%)",
        background: data.gray 
          ? "radial-gradient(circle at 30% 30%, #fca5a5 0%, #f43f5e 45%, #be123c 100%)"
          : "radial-gradient(circle at 30% 30%, #3b82f6 0%, #1d4ed8 45%, #1e40af 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "24px",
        fontWeight: "bold",
        color: "white",
      }}
    >
      {data.name.charAt(0)}
    </div>
    {/* Name and Relationship */}
    <div style={{ width: 88, marginTop: 12, textAlign: "center" }}>
      {/* Name */}
      <div
        style={{
          fontSize: "14px",
          fontWeight: "bold",
          color: "#1f2937",
          marginBottom: "4px",
          lineHeight: "14px",
          height: "14px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={data.name}
      >
        {data.name}
      </div>
      
      {/* Relationship */}
      {data.sub && (
        <div
          style={{
            fontSize: "14px",
            color: "#6b7280",
            marginBottom: "1px",
            marginTop: "5px",
            lineHeight: "10px",
            height: "10px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {data.sub}
        </div>
      )}
      
      {/* Decorative line */}
      <div
        style={{
          height: "2px",
          borderRadius: "1px",
          background: data.gray ? "#3b82f6" : "none",
          width: "60%",
          margin: "0 auto",
        }}
      />
    </div>
    {/* Relationship Badge */}
    {data.sub && (
      <div
        style={{
          marginTop: "8px",
          fontSize: "10px",
          padding: "3px 8px",
          borderRadius: "12px",
          background: data.gray ? "#dbeafe" : "#dbeafe",
          color: data.gray ? "#1e40af" : "#1e40af",
          border: `1px solid ${data.gray ? "#e5e7eb" : "#93c5fd"}`,
          fontWeight: "500",
        }}
      >
        {data.sub}
      </div>
    )}
  </div>
);

// tiny invisible node used to bend step edges cleanly
const Junction: React.FC = () => <div style={{ width: 1, height: 1 }} />;

const nodeTypes = { person: PersonCard, junction: Junction };

/** -------- Helper to label relationship types -------- */
const relLabel = (t: string) =>
  ({
    SPOUSE: "Spouse",
    PARENT: "Parent",
    MOTHER: "Mother",
    FATHER: "Father",
    CHILD: "Child",
    SON: "Son",
    DAUGHTER: "Daughter",
    BROTHER: "Brother",
    SISTER: "Sister",
    GRANDPARENT: "Grandparent",
    GRANDCHILD: "Grandchild",
    UNCLE: "Uncle",
    AUNT: "Aunt",
    COUSIN: "Cousin",
  }[t] || t);

/** -------- Single-page component -------- */
const FamilyTree: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Relationship | null>(null);

  useEffect(() => {
    fetchFamilyRelationships();
  }, []);

  const fetchFamilyRelationships = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/simple-invitations/family-relationships');
      if (response.data.success) {
        setRelationships(response.data.relationships || []);
      } else {
        setRelationships([]);
      }
    } catch (error: any) {
      console.error('Error fetching family relationships:', error);
      toast.error('Failed to load family relationships');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (user: Relationship) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedUser(null);
  };

  // slot data for the fixed 8 → 4 → 2 → 1 layout
  const { topLeft4, topRight4, midLeft2, midRight2, parents2, child1 } =
    useMemo(() => {
      const makeCard = (r?: Relationship): CardData =>
        r
          ? {
              name: `${r.otherUserFirstName} ${r.otherUserLastName}`.trim(),
              sub: relLabel(r.relationshipType),
              gray: /GRAND|COUSIN|UNCLE|AUNT/.test(r.relationshipType),
              username: r.otherUserUsername,
              relationship: r,
            }
          : { name: "—", gray: true };

      const by = (types: string[]) =>
        relationships.filter((r) => types.includes(r.relationshipType));

      const father = by(["FATHER"])[0] || by(["PARENT"])[0];
      const mother =
        by(["MOTHER"])[0] || by(["PARENT"]).filter((p) => p !== father)[0];

      const parents2 = [makeCard(father), makeCard(mother)];

      const grands = by(["GRANDPARENT"]).slice(0, 4);
      const midLeft2 = [makeCard(grands[0]), makeCard(grands[1])];
      const midRight2 = [makeCard(grands[2]), makeCard(grands[3])];

      const extended = relationships
        .filter(
          (r) =>
            !["FATHER", "MOTHER", "PARENT", "GRANDPARENT", "SON", "DAUGHTER", "CHILD"].includes(
              r.relationshipType
            )
        )
        .slice(0, 8);
      while (extended.length < 8) extended.push(undefined as any);
      const topLeft4 = extended.slice(0, 4).map(makeCard);
      const topRight4 = extended.slice(4, 8).map(makeCard);

      const kids = by(["SON", "DAUGHTER", "CHILD"]);
      const child1 = makeCard(kids[0] || { 
        id: 999, 
        otherUserFirstName: currentUser?.firstName || "You", 
        otherUserLastName: currentUser?.lastName || "", 
        relationshipType: "CHILD",
        otherUserUsername: currentUser?.username || "",
        canViewImages: false,
        canUploadImages: false,
        canDeleteImages: false,
        canManageAlbums: false,
        createdAt: "",
        relationshipNotes: ""
      });

      return { topLeft4, topRight4, midLeft2, midRight2, parents2, child1 };
    }, [relationships, currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-700 text-lg">Loading your family tree...</p>
        </div>
      </div>
    );
  }

  // fixed coordinates that mimic your screenshot
  const X = {
    tl1: -520, tl2: -360, tl3: -200, tl4: -40,
    tr1: 200,  tr2: 360,  tr3: 520,  tr4: 680,
    ml1: -280, ml2: -120, mr1: 320,  mr2: 480,
    pL: -80,   pR: 120,   c: 20,
  };
  const Y = { top: 0, mid: 200, par: 400, kid: 600 };

  const mkNode = (id: string, x: number, y: number, data: CardData, type = "person"): Node => ({
    id,
    type,
    position: { x, y },
    data,
    sourcePosition: Position.Bottom,
    targetPosition: Position.Top,
    draggable: false,
    selectable: false,
    style: { background: "transparent" },
  });

  const nodes: Node[] = [
    // top left 4
    mkNode("tl1", X.tl1, Y.top, topLeft4[0]),
    mkNode("tl2", X.tl2, Y.top, topLeft4[1]),
    mkNode("tl3", X.tl3, Y.top, topLeft4[2]),
    mkNode("tl4", X.tl4, Y.top, topLeft4[3]),
    // top right 4
    mkNode("tr1", X.tr1, Y.top, topRight4[0]),
    mkNode("tr2", X.tr2, Y.top, topRight4[1]),
    mkNode("tr3", X.tr3, Y.top, topRight4[2]),
    mkNode("tr4", X.tr4, Y.top, topRight4[3]),
    // mid (grandparents)
    mkNode("ml1", X.ml1, Y.mid, midLeft2[0]),
    mkNode("ml2", X.ml2, Y.mid, midLeft2[1]),
    mkNode("mr1", X.mr1, Y.mid, midRight2[0]),
    mkNode("mr2", X.mr2, Y.mid, midRight2[1]),
    // parents
    mkNode("pL", X.pL, Y.par, parents2[0]),
    mkNode("pR", X.pR, Y.par, parents2[1]),
    // child
    mkNode("c", X.c, Y.kid, child1),
    // invisible junctions to shape elbows
    { id: "J_topL", type: "junction", position: { x: -240, y: 120 }, data: {} },
    { id: "J_topR", type: "junction", position: { x:  440, y: 120 }, data: {} },
    { id: "J_midL", type: "junction", position: { x: -200, y: 320 }, data: {} },
    { id: "J_midR", type: "junction", position: { x:  400, y: 320 }, data: {} },
    { id: "J_par",  type: "junction", position: { x:   20, y: 520 }, data: {} },
  ];

  const estyle = { stroke: "#3b82f6", strokeWidth: 3 };
  const E = (id: string, s: string, t: string): Edge => ({
    id, source: s, target: t, type: "step", style: estyle,
  });

  const edges: Edge[] = [
    // top-left cluster to mid-left
    E("e_tl1_JL","tl1","J_topL"), E("e_tl2_JL","tl2","J_topL"),
    E("e_tl3_JL","tl3","J_topL"), E("e_tl4_JL","tl4","J_topL"),
    E("e_JL_ml1","J_topL","ml1"), E("e_JL_ml2","J_topL","ml2"),

    // top-right cluster to mid-right
    E("e_tr1_JR","tr1","J_topR"), E("e_tr2_JR","tr2","J_topR"),
    E("e_tr3_JR","tr3","J_topR"), E("e_tr4_JR","tr4","J_topR"),
    E("e_JR_mr1","J_topR","mr1"), E("e_JR_mr2","J_topR","mr2"),

    // mids to parents
    E("e_ml1_JmL","ml1","J_midL"), E("e_ml2_JmL","ml2","J_midL"),
    E("e_mr1_JmR","mr1","J_midR"), E("e_mr2_JmR","mr2","J_midR"),
    E("e_JmL_pL","J_midL","pL"),   E("e_JmR_pR","J_midR","pR"),

    // parents to child (Y branch)
    E("e_pL_JP","pL","J_par"), E("e_pR_JP","pR","J_par"), E("e_JP_c","J_par","c"),
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Family Tree</h1>
          <p className="text-gray-600">Your family connections and relationships</p>
        </div>

        {/* Family Tree Visualization */}
        {relationships.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">👥</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Start Building Your Family Tree</h3>
            <p className="text-gray-600">
              Send invitations to family members and create your family network
            </p>
          </div>
        ) : (
          <div
            style={{
              height: 840,
              width: "100%",
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <div
              style={{
                height: '100%',
                width: "100%",
                maxWidth: 1480,
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid #EEE",
                background: "white",
              }}
            >
              <ReactFlow
                nodes={nodes as Node[]}
                edges={edges}
                nodeTypes={nodeTypes}
                fitView
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                zoomOnScroll={false}
                zoomOnPinch={false}
                panOnScroll={false}
                panOnDrag={false}
                style={{ background: "white" }}
              >
                <Background color="transparent" />
              </ReactFlow>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">User Details</h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <p className="text-lg text-gray-900">
                  {selectedUser.otherUserFirstName} {selectedUser.otherUserLastName}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <p className="text-lg text-gray-900">{selectedUser.otherUserUsername}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                <p className="text-lg text-gray-900">{relLabel(selectedUser.relationshipType)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Permissions</label>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className={`w-3 h-3 rounded-full mr-2 ${selectedUser.canViewImages ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-sm text-gray-700">View Images</span>
                  </div>
                  <div className="flex items-center">
                    <span className={`w-3 h-3 rounded-full mr-2 ${selectedUser.canUploadImages ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-sm text-gray-700">Upload Images</span>
                  </div>
                  <div className="flex items-center">
                    <span className={`w-3 h-3 rounded-full mr-2 ${selectedUser.canDeleteImages ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-sm text-gray-700">Delete Images</span>
                  </div>
                  <div className="flex items-center">
                    <span className={`w-3 h-3 rounded-full mr-2 ${selectedUser.canManageAlbums ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className="text-sm text-gray-700">Manage Albums</span>
                  </div>
                </div>
              </div>
              
              {selectedUser.relationshipNotes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <p className="text-gray-900">{selectedUser.relationshipNotes}</p>
                </div>
              )}
            </div>
            
            <div className="mt-8 flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default FamilyTree;

