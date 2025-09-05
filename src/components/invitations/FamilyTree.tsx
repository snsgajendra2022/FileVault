import React, { useMemo } from "react";
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useState, useEffect } from 'react';

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

/** -------- Responsive "person card" component -------- */
const PersonCard: React.FC<{ data: CardData; isMobile?: boolean; isTablet?: boolean; isSmallMobile?: boolean }> = ({ 
  data, 
  isMobile = false, 
  isTablet = false,
  isSmallMobile = false
}) => {
  const cardWidth = isSmallMobile ? 80 : isMobile ? 100 : isTablet ? 120 : 138;
  const cardHeight = isSmallMobile ? 120 : isMobile ? 140 : isTablet ? 160 : 188;
  const avatarSize = isSmallMobile ? 32 : isMobile ? 40 : isTablet ? 48 : 56;
  const nameFontSize = isSmallMobile ? "10px" : isMobile ? "12px" : isTablet ? "13px" : "14px";
  const subFontSize = isSmallMobile ? "8px" : isMobile ? "10px" : isTablet ? "11px" : "12px";
  const badgeFontSize = isSmallMobile ? "7px" : isMobile ? "8px" : isTablet ? "9px" : "10px";
  const contentWidth = isSmallMobile ? 60 : isMobile ? 70 : isTablet ? 80 : 88;

  return (
    <div
      style={{
        width: cardWidth,
        height: cardHeight,
        borderRadius: 12,
        border: `1.5px solid ${Navy}`,
        background: "white",
        boxShadow: "0 2px 8px rgba(0,0,0,.06)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: isSmallMobile ? 8 : isMobile ? 10 : isTablet ? 12 : 14,
      }}
    >
      {/* avatar */}
      <div
        style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: "50%",
          overflow: "hidden",
          border: "2px solid #E5E7EB",
          background: data.gray 
            ? "radial-gradient(circle at 30% 30%, rgb(117 21 21) 0%, rgb(236 0 40) 45%, rgb(255 0 62) 100%)"
            : "radial-gradient(circle at 30% 30%, #3b82f6 0%, #1d4ed8 45%, #1e40af 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: isSmallMobile ? "16px" : isMobile ? "18px" : isTablet ? "20px" : "24px",
          fontWeight: "bold",
          color: "white",
        }}
      >
        {data.name.charAt(0)}
      </div>
      {/* Name and Relationship */}
      <div style={{ width: contentWidth, marginTop: isSmallMobile ? 6 : isMobile ? 8 : isTablet ? 10 : 12, textAlign: "center" }}>
        {/* Name */}
        <div
          style={{
            fontSize: 10,
            fontWeight: "bold",
            color: "#1f2937",
            marginBottom: "4px",
            lineHeight: nameFontSize,
            height: nameFontSize,
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
              fontSize: subFontSize,
              color: "#6b7280",
              marginBottom: "1px",
              marginTop: "5px",
              lineHeight: subFontSize,
              height: subFontSize,
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
            background: data.gray ? "rgb(242 7 46)" : "none",
            width: "60%",
            margin: "0 auto",
          }}
        />
      </div>
      {/* Relationship Badge */}
      {data.sub && (
        <div
          style={{
            marginTop: isSmallMobile ? "4px" : isMobile ? "6px" : isTablet ? "7px" : "8px",
            fontSize: badgeFontSize,
            padding: isSmallMobile ? "1px 4px" : isMobile ? "2px 6px" : isTablet ? "2px 7px" : "3px 8px",
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
};

// Custom SVG-based family tree component
const CustomFamilyTree: React.FC<{
  topLeft4: CardData[];
  topRight4: CardData[];
  midLeft2: CardData[];
  midRight2: CardData[];
  parents2: CardData[];
  child1: CardData;
}> = ({ topLeft4, topRight4, midLeft2, midRight2, parents2, child1 }) => {
  // Responsive coordinates based on screen size
  const [screenSize, setScreenSize] = React.useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  React.useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Responsive layout calculations
  const isMobile = screenSize.width < 768;
  const isTablet = screenSize.width >= 768 && screenSize.width < 1024;
  const isSmallMobile = screenSize.width < 480;
  
  // Card dimensions
  const cardWidth = isSmallMobile ? 80 : isMobile ? 100 : isTablet ? 120 : 138;
  const cardHeight = isSmallMobile ? 120 : isMobile ? 140 : isTablet ? 160 : 188;
  
  // Calculate responsive coordinates with better spacing
  const getResponsiveCoordinates = () => {
    if (isSmallMobile) {
      // Small mobile: Very compact layout
      return {
        X: {
          tl1: 10, tl2: 100, tl3: 190, tl4: 300,
          tr1: 370, tr2: 460, tr3: 550, tr4: 640,
          ml1: 55, ml2: 145, mr1: 415, mr2: 505,
          pL: 100, pR: 190, c: 145,
        },
        Y: { top: 10, mid: 150, par: 290, kid: 430 }
      };
    } else if (isMobile) {
      // Mobile: Compact layout with horizontal scrolling
      return {
        X: {
          tl1: 20, tl2: 130, tl3: 240, tl4: 350,
          tr1: 460, tr2: 570, tr3: 715, tr4: 790,
          ml1: 75, ml2: 185, mr1: 515, mr2: 625,
          pL: 130, pR: 240, c: 185,
        },
        Y: { top: 20, mid: 170, par: 320, kid: 470 }
      };
    } else if (isTablet) {
      // Tablet: Medium spacing
      return {
        X: {
          tl1: 50, tl2: 200, tl3: 350, tl4: 500,
          tr1: 700, tr2: 850, tr3: 1000, tr4: 1150,
          ml1: 200, ml2: 350, mr1: 800, mr2: 950,
          pL: 400, pR: 550, c: 475,
        },
        Y: { top: 50, mid: 250, par: 450, kid: 650 }
      };
    } else {
      // Desktop: Full spacing
      return {
        X: {
          tl1: 80, tl2: 240, tl3: 400, tl4: 560,
          tr1: 800, tr2: 960, tr3: 1120, tr4: 1280,
          ml1: 320, ml2: 507, mr1: 920, mr2: 1080,
          pL: 520, pR: 720, c: 620,
        },
        Y: { top: 80, mid: 300, par: 507, kid: 715}
      };
    }
  };

  const { X, Y } = getResponsiveCoordinates();

  // SVG path for connection lines
  const createConnectionPath = (fromX: number, fromY: number, toX: number, toY: number) => {
    const midY = (fromY + toY) / 2;
    return `M ${fromX} ${fromY} L ${fromX} ${midY} L ${toX} ${midY} L ${toX} ${toY}`;
  };

  // Create junction points for cleaner connections
  const createJunctionPath = (fromX: number, fromY: number, junctionX: number, junctionY: number, toX: number, toY: number) => {
    return `M ${fromX} ${fromY} L ${fromX} ${junctionY} L ${junctionX} ${junctionY} L ${junctionX} ${toY} L ${toX} ${toY}`;
  };

  // Calculate container dimensions
  const containerWidth = isSmallMobile ? 730 : isMobile ? 900 : isTablet ? 1200 : 1480;
  const containerHeight = isSmallMobile ? 550 : isMobile ? 600 : isTablet ? 700 : 840;

  return (
    <div 
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: '100%',
        overflow: (isMobile || isSmallMobile) ? 'auto' : 'visible',
        minHeight: containerHeight,
        minWidth: containerWidth
      }}
    >
      {/* SVG for connection lines */}
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: containerWidth,
          height: containerHeight,
          pointerEvents: 'none',
          zIndex: 1,
        }}
        viewBox={`0 0 ${containerWidth} ${containerHeight}`}
      >
        {/* Responsive connection lines */}
        {!isSmallMobile && (
          <>
            {/* Top-left cluster to mid-left connections */}
            {topLeft4.map((_, index) => {
              const fromX = X[`tl${index + 1}` as keyof typeof X];
              const junctionY = isMobile ? 95 : isTablet ? 150 : 180;
              const junctionX = isMobile ? 130 : isTablet ? 275 : 400;
              const cardCenterY = Y.top + (cardHeight / 2);
              const midCardCenterY = Y.mid + (cardHeight / 2);
              return (
                <path
                  key={`tl${index + 1}-junction`}
                  d={createJunctionPath(fromX, cardCenterY, junctionX, junctionY, junctionX, midCardCenterY)}
                  stroke="#3b82f6"
                  strokeWidth={isMobile ? "1.5" : isTablet ? "2" : "3"}
                  fill="none"
                />
              );
            })}
            
            {/* Junction to mid-left nodes */}
            <path
              d={createConnectionPath(
                isMobile ? 130 : isTablet ? 275 : 400, 
                isMobile ? 95 : isTablet ? 150 : 180, 
                X.ml1, 
                Y.mid + (cardHeight / 2)
              )}
              stroke="#3b82f6"
              strokeWidth={isMobile ? "1.5" : isTablet ? "2" : "3"}
              fill="none"
            />
            <path
              d={createConnectionPath(
                isMobile ? 130 : isTablet ? 275 : 400, 
                isMobile ? 95 : isTablet ? 150 : 180, 
                X.ml2, 
                Y.mid + (cardHeight / 2)
              )}
              stroke="#3b82f6"
              strokeWidth={isMobile ? "1.5" : isTablet ? "2" : "3"}
              fill="none"
            />

            {/* Top-right cluster to mid-right connections */}
            {topRight4.map((_, index) => {
              const fromX = X[`tr${index + 1}` as keyof typeof X];
              const junctionY = isMobile ? 95 : isTablet ? 150 : 180;
              const junctionX = isMobile ? 570 : isTablet ? 875 : 1000;
              const cardCenterY = Y.top + (cardHeight / 2);
              const midCardCenterY = Y.mid + (cardHeight / 2);
              return (
                <path
                  key={`tr${index + 1}-junction`}
                  d={createJunctionPath(fromX, cardCenterY, junctionX, junctionY, junctionX, midCardCenterY)}
                  stroke="#3b82f6"
                  strokeWidth={isMobile ? "1.5" : isTablet ? "2" : "3"}
                  fill="none"
                />
              );
            })}
            
            {/* Junction to mid-right nodes */}
            <path
              d={createConnectionPath(
                isMobile ? 570 : isTablet ? 875 : 1000, 
                isMobile ? 95 : isTablet ? 150 : 180, 
                X.mr1, 
                Y.mid + (cardHeight / 2)
              )}
              stroke="#3b82f6"
              strokeWidth={isMobile ? "1.5" : isTablet ? "2" : "3"}
              fill="none"
            />
            <path
              d={createConnectionPath(
                isMobile ? 570 : isTablet ? 875 : 1000, 
                isMobile ? 95 : isTablet ? 150 : 180, 
                X.mr2, 
                Y.mid + (cardHeight / 2)
              )}
              stroke="#3b82f6"
              strokeWidth={isMobile ? "1.5" : isTablet ? "2" : "3"}
              fill="none"
            />

            {/* Mid-left to parent-left */}
            <path
              d={createJunctionPath(
                X.ml1, 
                Y.mid + (cardHeight / 2), 
                isMobile ? 185 : isTablet ? 475 : 520, 
                isMobile ? 245 : isTablet ? 350 : 380, 
                X.pL, 
                Y.par + (cardHeight / 2)
              )}
              stroke="#3b82f6"
              strokeWidth={isMobile ? "1.5" : isTablet ? "2" : "3"}
              fill="none"
            />
            <path
              d={createJunctionPath(
                X.ml2, 
                Y.mid + (cardHeight / 2), 
                isMobile ? 185 : isTablet ? 475 : 520, 
                isMobile ? 245 : isTablet ? 350 : 380, 
                X.pL, 
                Y.par + (cardHeight / 2)
              )}
              stroke="#3b82f6"
              strokeWidth={isMobile ? "1.5" : isTablet ? "2" : "3"}
              fill="none"
            />

            {/* Mid-right to parent-right */}
            <path
              d={createJunctionPath(
                X.mr1, 
                Y.mid + (cardHeight / 2), 
                isMobile ? 395 : isTablet ? 575 : 720, 
                isMobile ? 245 : isTablet ? 350 : 380, 
                X.pR, 
                Y.par + (cardHeight / 2)
              )}
              stroke="#3b82f6"
              strokeWidth={isMobile ? "1.5" : isTablet ? "2" : "3"}
              fill="none"
            />
            <path
              d={createJunctionPath(
                X.mr2, 
                Y.mid + (cardHeight / 2), 
                isMobile ? 395 : isTablet ? 575 : 720, 
                isMobile ? 245 : isTablet ? 350 : 380, 
                X.pR, 
                Y.par + (cardHeight / 2)
              )}
              stroke="#3b82f6"
              strokeWidth={isMobile ? "1.5" : isTablet ? "2" : "3"}
              fill="none"
            />

            {/* Parents to child */}
            <path
              d={createJunctionPath(
                X.pL, 
                Y.par + (cardHeight / 2), 
                isMobile ? 185 : isTablet ? 475 : 620, 
                isMobile ? 405 : isTablet ? 550 : 580, 
                X.c, 
                Y.kid + (cardHeight / 2)
              )}
              stroke="#3b82f6"
              strokeWidth={isMobile ? "1.5" : isTablet ? "2" : "3"}
              fill="none"
            />
            <path
              d={createJunctionPath(
                X.pR, 
                Y.par + (cardHeight / 2), 
                isMobile ? 185 : isTablet ? 475 : 620, 
                isMobile ? 405 : isTablet ? 550 : 580, 
                X.c, 
                Y.kid + (cardHeight / 2)
              )}
              stroke="#3b82f6"
              strokeWidth={isMobile ? "1.5" : isTablet ? "2" : "3"}
              fill="none"
            />
          </>
        )}
      </svg>

      {/* Person cards positioned absolutely */}
      <div style={{ position: 'relative', zIndex: 2, width: containerWidth, height: containerHeight }}>
        {/* Top row - 8 cards */}
        {topLeft4.map((card, index) => (
          <div
            key={`tl${index + 1}`}
            style={{
              position: 'absolute',
              left: X[`tl${index + 1}` as keyof typeof X] - (cardWidth / 2),
              top: Y.top,
            }}
          >
            <PersonCard data={card} isMobile={isMobile} isTablet={isTablet} isSmallMobile={isSmallMobile} />
          </div>
        ))}
        
        {topRight4.map((card, index) => (
          <div
            key={`tr${index + 1}`}
            style={{
              position: 'absolute',
              left: X[`tr${index + 1}` as keyof typeof X] - (cardWidth / 2),
              top: Y.top,
            }}
          >
            <PersonCard data={card} isMobile={isMobile} isTablet={isTablet} isSmallMobile={isSmallMobile} />
          </div>
        ))}

        {/* Mid row - 4 cards (grandparents) */}
        {midLeft2.map((card, index) => (
          <div
            key={`ml${index + 1}`}
            style={{
              position: 'absolute',
              left: X[`ml${index + 1}` as keyof typeof X] - (cardWidth / 2),
              top: Y.mid,
            }}
          >
            <PersonCard data={card} isMobile={isMobile} isTablet={isTablet} isSmallMobile={isSmallMobile} />
          </div>
        ))}
        
        {midRight2.map((card, index) => (
          <div
            key={`mr${index + 1}`}
            style={{
              position: 'absolute',
              left: X[`mr${index + 1}` as keyof typeof X] - (cardWidth / 2),
              top: Y.mid,
            }}
          >
            <PersonCard data={card} isMobile={isMobile} isTablet={isTablet} isSmallMobile={isSmallMobile} />
          </div>
        ))}

        {/* Parents row - 2 cards */}
        <div
          style={{
            position: 'absolute',
            left: X.pL - (cardWidth / 2),
            top: Y.par,
          }}
        >
          <PersonCard data={parents2[0]} isMobile={isMobile} isTablet={isTablet} />
        </div>
        
        <div
          style={{
            position: 'absolute',
            left: X.pR - (cardWidth / 2),
            top: Y.par,
          }}
        >
          <PersonCard data={parents2[1]} isMobile={isMobile} isTablet={isTablet} />
        </div>

        {/* Child row - 1 card */}
        <div
          style={{
            position: 'absolute',
            left: X.c - (cardWidth / 2),
            top: Y.kid,
          }}
        >
          <PersonCard data={child1} isMobile={isMobile} isTablet={isTablet} />
        </div>
      </div>
    </div>
  );
};

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

  // const openModal = (user: Relationship) => {
  //   setSelectedUser(user);
  //   setShowModal(true);
  // };

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


  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-full mx-auto p-6">
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
              height: 1000,
              width: "100%",
              background: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: window.innerWidth < 480 ? 8 : window.innerWidth < 768 ? 12 : 24,
            }}
          >
            <div
              style={{
                height: 1000,
                width: "100%",
                maxWidth: window.innerWidth < 480 ? "100%" : window.innerWidth < 768 ? "100%" : 1480,
                borderRadius: 16,
                overflow: window.innerWidth < 768 ? "auto" : "hidden",
                border: "1px solid #EEE",
                background: "white",
                position: "relative",
              }}
            >
              <CustomFamilyTree
                topLeft4={topLeft4}
                topRight4={topRight4}
                midLeft2={midLeft2}
                midRight2={midRight2}
                parents2={parents2}
                child1={child1}
              />
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

