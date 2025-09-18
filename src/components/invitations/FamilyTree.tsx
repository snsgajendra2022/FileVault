import React, { useMemo, useState, useEffect } from "react";
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

// Add CSS animation for loading spinner and tree connectors/styles
const spinnerStyle = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Tree styles (inspired by provided HTML/CSS) */
  .tree {
    width: 100%;
    height: auto;
    text-align: center;
  }
  .tree ul {
    padding-top: 20px;
    position: relative;
    transition: .5s;
  }
  .tree li {
    display: inline-table;
    text-align: center;
    list-style-type: none;
    position: relative;
    padding: 10px;
    transition: .5s;
  }
  .tree li::before, .tree li::after {
    content: '';
    position: absolute;
    top: 0;
    right: 50%;
    border-top: 1px solid #cbd5e1; /* slate-300 */
    width: 51%;
    height: 10px;
  }
  .tree li::after {
    right: auto;
    left: 50%;
    border-left: 1px solid #cbd5e1;
  }
  .tree li:only-child::after, .tree li:only-child::before {
    display: none;
  }
  .tree li:only-child {
    padding-top: 0;
  }
  .tree li:first-child::before, .tree li:last-child::after {
    border: 0 none;
  }
  .tree li:last-child::before {
    border-right: 1px solid #cbd5e1;
    border-radius: 0 5px 0 0;
  }
  .tree li:first-child::after {
    border-radius: 5px 0 0 0;
  }
  .tree ul ul::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    border-left: 1px solid #cbd5e1;
    width: 0;
    height: 20px;
  }
  .tree li a {
    border: 1px solid #e2e8f0; /* slate-200 */
    padding: 10px;
    display: inline-grid;
    border-radius: 8px;
    text-decoration-line: none;
    transition: .3s;
    background: white;
    min-width: 120px;
  }
  .tree li a:hover, .tree li a:hover span, .tree li a:hover + ul li a {
    background: #e0f2fe; /* sky-100 */
    color: #0f172a; /* slate-900 */
    border: 1px solid #94a3b8; /* slate-400 */
  }
  .tree li a:hover + ul li::after, .tree li a:hover + ul li::before, .tree li a:hover + ul::before, .tree li a:hover + ul ul::before {
    border-color: #94a3b8;
  }
  .tree .avatar {
    width: 56px;
    height: 56px;
    border-radius: 9999px;
    margin: 0 auto 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 20px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.12);
  }
  .tree .label {
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    color: #334155; /* slate-700 */
    padding: 6px 8px;
    font-size: 12px;
    text-transform: none;
    letter-spacing: 0.2px;
    font-weight: 600;
    background: #f8fafc;
  }
  .tree .relation-label {
    margin-top: 6px;
    display: inline-block;
    color: #64748b; /* slate-500 */
    font-size: 11px;
    padding: 4px 6px;
    background: #f1f5f9; /* slate-100 */
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-weight: 500;
  }
`;

// Inject the CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = spinnerStyle;
  document.head.appendChild(style);
}

/** -------- Types for the new family data structure -------- */
type FamilyMember = {
  name: string;
  age: number | null;
  gender: string | null;
  relation: string;
  isYou?: boolean;
  isElder?: boolean;
  userId?: number;
  username?: string;
  email?: string;
};

type FamilyData = {
  you: FamilyMember;
  parents: FamilyMember[];
  siblings: FamilyMember[];
  spouse: FamilyMember | null;
  children: FamilyMember[];
  grandparents: FamilyMember[];
  unclesAunts: FamilyMember[];
  cousins: FamilyMember[];
};

type FamilyResponse = {
  familyData: FamilyData;
  success: boolean;
  message: string;
};

/** -------- Person Card Component -------- */
const PersonCard: React.FC<{ 
  person: FamilyMember; 
  isMobile?: boolean; 
  isTablet?: boolean; 
  isSmallMobile?: boolean;
  onClick?: () => void;
}> = ({ 
  person, 
  isMobile = false, 
  isTablet = false,
  isSmallMobile = false,
  onClick
}) => {
  const getAvatarBackground = () => {
    if (person.isYou) {
      return "linear-gradient(135deg, #4f46e5, #7c3aed)";
    } else if (person.isElder) {
      return "linear-gradient(135deg, #f59e0b, #d97706)";
    } else if (person.gender === 'male') {
      return "linear-gradient(135deg, #3b82f6, #1d4ed8)";
    } else if (person.gender === 'female') {
      return "linear-gradient(135deg, #ec4899, #be185d)";
    } else {
      return "linear-gradient(135deg, #6b7280, #4b5563)";
    }
  };

  const getInitials = () => {
    return person.name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div
      className={`person-card ${person.isYou ? 'you' : ''} ${person.isElder ? 'elder' : ''} ${person.gender || ''}`}
      onClick={onClick}
      style={{
        background: person.isYou ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' : 'white',
        border: person.isYou ? '3px solid #4f46e5' : '3px solid transparent',
        transform: person.isYou ? 'scale(1.05)' : 'scale(1)',
        minWidth: '176px',
        maxWidth: '188px',
        width: '100%',
        borderRadius: '12px',
        padding: isSmallMobile ? '10px' : '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        textAlign: 'center',
        position: 'relative',
        transition: 'all 0.3s ease',
        cursor: onClick ? 'pointer' : 'default',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = person.isYou ? 'scale(1.1) translateY(-5px)' : 'translateY(-5px)';
          e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = person.isYou ? 'scale(1.05)' : 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
        }
      }}
    >
      {/* Avatar */}
      <div
        className="person-avatar"
        style={{
          width: person.isYou ? (isSmallMobile ? '55px' : isMobile ? '60px' : '65px') : (isSmallMobile ? '45px' : isMobile ? '50px' : '55px'),
          height: person.isYou ? (isSmallMobile ? '55px' : isMobile ? '60px' : '65px') : (isSmallMobile ? '45px' : isMobile ? '50px' : '55px'),
          borderRadius: '50%',
          margin: '0 auto 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: person.isYou ? (isSmallMobile ? '22px' : isMobile ? '24px' : '26px') : (isSmallMobile ? '18px' : isMobile ? '20px' : '22px'),
          fontWeight: 'bold',
          color: 'white',
          background: getAvatarBackground(),
        }}
      >
        {getInitials()}
      </div>

      {/* Name */}
      <div
        className="person-name"
        style={{
          fontSize: isSmallMobile ? '0.9rem' : isMobile ? '1rem' : '1.1rem',
          fontWeight: '600',
          marginBottom: '5px',
          color: '#1e293b',
          wordWrap: 'break-word',
          lineHeight: '1.2',
        }}
      >
        {person.name}
      </div>

      {/* Relation */}
      <div
        className="person-relation"
        style={{
          fontSize: isSmallMobile ? '0.8rem' : isMobile ? '0.85rem' : '0.9rem',
          color: '#64748b',
          marginBottom: '8px',
        }}
      >
        {person.relation}
      </div>

      {/* Age */}
      {person.age && (
        <div
          className="person-age"
          style={{
            fontSize: isSmallMobile ? '0.7rem' : '0.75rem',
            color: '#94a3b8',
            background: '#f1f5f9',
            padding: '3px 8px',
            borderRadius: '12px',
            display: 'inline-block',
          }}
        >
          {person.age} years
        </div>
      )}
    </div>
  );
};

/** -------- Generation Section Component -------- */
const GenerationSection: React.FC<{
  label: string;
  people: FamilyMember[];
  isMobile?: boolean;
  isTablet?: boolean;
  isSmallMobile?: boolean;
  onPersonClick?: (person: FamilyMember) => void;
}> = ({ label, people, isMobile, isTablet, isSmallMobile, onPersonClick }) => {
  if (!people || people.length === 0) return null;

  return (
    <div className="generation-section" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '15px',
      minWidth: isSmallMobile ? '100%' : isMobile ? '200px' : '250px',
      flex: 1,
    }}>
      <div className="generation-label" style={{
        fontSize: isSmallMobile ? '0.9rem' : isMobile ? '1rem' : '1.1rem',
        fontWeight: '700',
        color: '#4f46e5',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        whiteSpace: 'nowrap',
        background: 'white',
        padding: isSmallMobile ? '8px 12px' : '10px 15px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        border: '2px solid #e2e8f0',
        textAlign: 'center',
        width: 'fit-content',
      }}>
        {label}
      </div>
      
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '12px',
        width: '100%',
      }}>
        {people.map((person, index) => (
          <PersonCard
            key={`${label}-${index}`}
            person={person}
            isMobile={isMobile}
            isTablet={isTablet}
            isSmallMobile={isSmallMobile}
            onClick={() => onPersonClick?.(person)}
          />
        ))}
      </div>
    </div>
  );
};

/** -------- Family Statistics Component -------- */
const FamilyStats: React.FC<{ familyData: FamilyData }> = ({ familyData }) => {
  const totalMembers = Object.values(familyData).flat().length;
  // const maleCount = Object.values(familyData).flat().filter(m => m?.gender === 'male').length;
  // const femaleCount = Object.values(familyData).flat().filter(m => m?.gender === 'female').length;
  const elderCount = Object.values(familyData).flat().filter(m => m?.isElder).length;

  return (
    <div className="stats" style={{
      background: '#f8fafc',
      padding: '15px',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px solid #e2e8f0',
    }}>
      <h3 style={{
        color: '#1e293b',
        marginBottom: '10px',
        fontSize: '1.1rem',
      }}>
        Family Statistics
      </h3>
      <div className="stats-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '10px',
      }}>
        <div className="stat-item" style={{
          background: 'white',
          padding: '10px',
          borderRadius: '6px',
          textAlign: 'center',
          border: '1px solid #e2e8f0',
        }}>
          <div className="stat-number" style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#4f46e5',
          }}>
            {totalMembers}
          </div>
          <div className="stat-label" style={{
            fontSize: '0.8rem',
            color: '#64748b',
          }}>
            Total Members
          </div>
        </div>
        {/* <div className="stat-item" style={{
          background: 'white',
          padding: '10px',
          borderRadius: '6px',
          textAlign: 'center',
          border: '1px solid #e2e8f0',
        }}>
          <div className="stat-number" style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#4f46e5',
          }}>
            {maleCount}
          </div>
          <div className="stat-label" style={{
            fontSize: '0.8rem',
            color: '#64748b',
          }}>
            Male
          </div>
        </div> */}
        {/* <div className="stat-item" style={{
          background: 'white',
          padding: '10px',
          borderRadius: '6px',
          textAlign: 'center',
          border: '1px solid #e2e8f0',
        }}>
          <div className="stat-number" style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#4f46e5',
          }}>
            {femaleCount}
          </div>
          <div className="stat-label" style={{
            fontSize: '0.8rem',
            color: '#64748b',
          }}>
            Female
          </div>
        </div> */}
        <div className="stat-item" style={{
          background: 'white',
          padding: '10px',
          borderRadius: '6px',
          textAlign: 'center',
          border: '1px solid #e2e8f0',
        }}>
          <div className="stat-number" style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#4f46e5',
          }}>
            {elderCount}
          </div>
          <div className="stat-label" style={{
            fontSize: '0.8rem',
            color: '#64748b',
          }}>
            Elders
          </div>
        </div>
      </div>
    </div>
  );
};

/** -------- Main Family Tree Component -------- */
const FamilyTree: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [familyData, setFamilyData] = useState<FamilyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<FamilyMember | null>(null);
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    fetchFamilyData();
    
    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchFamilyData = async () => {
    try {
      setLoading(true);
      console.log('Fetching family data from API...');
      
      const response = await api.get('/api/simple-invitations/family-relationships');
      console.log('Family data API response:', response.data);
      
      if (response.data.success) {
        // Check if the API response has the expected structure
        if (response.data.familyData) {
          setFamilyData(response.data.familyData);
          toast.success('Family data loaded successfully');
        } else {
          console.error('API response missing familyData:', response.data);
          toast.error('Invalid data format received from server');
          setFamilyData(null);
        }
      } else {
        console.error('API returned success: false', response.data);
        toast.error(response.data.message || 'Failed to load family data');
        setFamilyData(null);
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
      
      setFamilyData(null);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (person: FamilyMember) => {
    setSelectedPerson(person);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPerson(null);
  };

  // Responsive layout calculations
  const isMobile = screenSize.width < 768;
  const isTablet = screenSize.width >= 768 && screenSize.width < 1024;
  const isSmallMobile = screenSize.width < 480;

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            border: '4px solid #4f46e5',
            borderTop: '4px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }}></div>
          <p style={{ color: 'white', fontSize: '18px' }}>Loading your family tree...</p>
        </div>
      </div>
    );
  }

  if (!familyData) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          maxWidth: '400px',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: '#f0f9ff',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '32px',
          }}>
            👥
          </div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#1e293b',
            marginBottom: '8px',
          }}>
            Start Building Your Family Tree
          </h3>
          <p style={{ color: '#64748b' }}>
            Send invitations to family members and create your family network
          </p>
        </div>
      </div>
    );
  }

  const generations = [
    { label: 'Grandparents', members: familyData.grandparents },
    { label: 'Parents', members: familyData.parents },
    { label: 'Uncles & Aunts', members: familyData.unclesAunts },
    { label: 'You', members: [familyData.you] },
    { label: 'Siblings', members: familyData.siblings },
    { label: 'Cousins', members: familyData.cousins },
    { label: 'Spouse', members: familyData.spouse ? [familyData.spouse] : [] },
    { label: 'Children', members: familyData.children }
  ].filter(gen => gen.members.length > 0);

  // Helpers for tree rendering
  const getAvatarBackground = (person?: FamilyMember) => {
    if (!person) return 'linear-gradient(135deg, #64748b, #475569)';
    if (person.isYou) return 'linear-gradient(135deg, #4f46e5, #7c3aed)';
    if (person.isElder) return 'linear-gradient(135deg, #f59e0b, #d97706)';
    if (person.gender === 'male') return 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
    if (person.gender === 'female') return 'linear-gradient(135deg, #ec4899, #be185d)';
    return 'linear-gradient(135deg, #6b7280, #4b5563)';
  };

  const getInitial = (name: string) => (name?.trim()?.charAt(0) || '?').toUpperCase();

  const TreePerson = ({ person }: { person: FamilyMember }) => (
    <a href="#" onClick={(e) => { e.preventDefault(); openModal(person); }}>
      <div className="avatar" style={{ background: getAvatarBackground(person) }}>
        {getInitial(person.name)}
      </div>
      <span className="label">{person.name}</span>
      {person.relation && (
        <span className="relation-label">{person.relation}</span>
      )}
    </a>
  );

  const TreeGroup = ({ title, people }: { title: string; people: FamilyMember[] }) => (
    <li>
      <a href="#" onClick={(e) => e.preventDefault()}>
        <span className="label">{title}</span>
      </a>
      {people && people.length > 0 && (
        <ul>
          {people.map((p, idx) => (
            <li key={`${title}-${idx}`}>
              <TreePerson person={p} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#fff',
      padding: '20px',
      color: '#1e293b',
    }}>
      <div style={{
        maxWidth: '100%',
        margin: '0 auto',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
         background: 'linear-gradient(311deg, rgb(124 72 237) 0%, rgb(115 79 238) 100%)',
          color: 'white',
          padding: '30px',
          textAlign: 'center',
        }}>
          <h1 style={{
            fontSize: isSmallMobile ? '1.8rem' : isMobile ? '2rem' : '2.5rem',
            fontWeight: '700',
            marginBottom: '10px',
          }}>
            🌳 Family Tree
          </h1>
          <p style={{
            fontSize: isSmallMobile ? '1rem' : '1.1rem',
            opacity: 0.9,
          }}>
            Your Family Connections and Relationships
          </p>
        </div>

        {/* Legend */}
        {/* <div style={{
          position: isSmallMobile ? 'relative' : 'fixed',
          top: isSmallMobile ? 'auto' : '20px',
          right: isSmallMobile ? 'auto' : '20px',
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          zIndex: 1000,
          maxWidth: isSmallMobile ? '100%' : '200px',
          marginBottom: isSmallMobile ? '20px' : '0',
        }}>
          <h3 style={{
            fontSize: '1rem',
            marginBottom: '15px',
            color: '#1e293b',
          }}>
            Legend
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontSize: '0.85rem' }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              marginRight: '8px',
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            }}></div>
            <span>You</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontSize: '0.85rem' }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              marginRight: '8px',
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            }}></div>
            <span>Male</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontSize: '0.85rem' }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              marginRight: '8px',
              background: 'linear-gradient(135deg, #ec4899, #be185d)',
            }}></div>
            <span>Female</span>
            </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', fontSize: '0.85rem' }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              marginRight: '8px',
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            }}></div>
            <span>Elder</span>
          </div>
        </div> */}

        {/* Family Tree Container */}
        <div style={{
          padding: isSmallMobile ? '15px 10px' : isMobile ? '20px 15px' : '40px',
          background: '#f8fafc',
          minHeight: '80vh',
          overflowX: 'auto',
          overflowY: 'auto',
        }}>
          {/* Refresh Button */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '20px',
          }}>
            <button
              onClick={fetchFamilyData}
              disabled={loading}
              style={{
                padding: '10px 20px',
                background: loading ? '#9ca3af' : '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#3730a3';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#4f46e5';
                }
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #ffffff',
                    borderTop: '2px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}></div>
                  Loading...
                </>
              ) : (
                <>
                  <span>🔄</span>
                  Refresh Family Data
                </>
              )}
            </button>
                        </div>
                        
          {/* Family Statistics */}
          <FamilyStats familyData={familyData} />
          
          {/* Connector-style Family Tree (dynamic) */}
          <div className="tree" style={{ width: '100%', overflowX: 'auto' }}>
            <ul>
              <li>
                <a href="#" onClick={(e) => { e.preventDefault(); openModal(familyData.you); }}>
                  <div className="avatar" style={{ background: getAvatarBackground(familyData.you) }}>
                    {getInitial(familyData.you.name)}
                  </div>
                  <span className="label">{familyData.you.name}</span>
                </a>
                <ul>
                  {familyData.parents && familyData.parents.length > 0 && (
                    <TreeGroup title="Parents" people={familyData.parents} />
                  )}
                  {familyData.siblings && familyData.siblings.length > 0 && (
                    <TreeGroup title="Siblings" people={familyData.siblings} />
                  )}
                  {familyData.spouse && (
                    <TreeGroup title="Spouse" people={[familyData.spouse]} />
                  )}
                  {familyData.children && familyData.children.length > 0 && (
                    <TreeGroup title="Children" people={familyData.children} />
                  )}
                  {familyData.grandparents && familyData.grandparents.length > 0 && (
                    <TreeGroup title="Grandparents" people={familyData.grandparents} />
                  )}
                  {familyData.unclesAunts && familyData.unclesAunts.length > 0 && (
                    <TreeGroup title="Uncles & Aunts" people={familyData.unclesAunts} />
                  )}
                  {familyData.cousins && familyData.cousins.length > 0 && (
                    <TreeGroup title="Cousins" people={familyData.cousins} />
                  )}
                </ul>
              </li>
            </ul>
          </div>
                          </div>
                        </div>
                        
      {/* Person Details Modal */}
      {showModal && selectedPerson && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '20px',
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '400px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#1e293b',
              }}>
                Family Member Details
              </h2>
              <button
                onClick={closeModal}
                style={{
                  color: '#9ca3af',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
                        </div>
                        
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '4px',
                }}>
                  Name
                </label>
                <p style={{
                  fontSize: '18px',
                  color: '#1e293b',
                }}>
                  {selectedPerson.name}
                </p>
                        </div>
                        
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '4px',
                }}>
                  Relationship
                </label>
                <p style={{
                  fontSize: '18px',
                  color: '#1e293b',
                }}>
                  {selectedPerson.relation}
                </p>
                        </div>
                        
              {selectedPerson.username && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '4px',
                  }}>
                    Username
                  </label>
                  <p style={{
                    fontSize: '18px',
                    color: '#1e293b',
                  }}>
                    {selectedPerson.username}
                  </p>
                </div>
              )}

              {selectedPerson.email && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '4px',
                  }}>
                    Email
                  </label>
                  <p style={{
                    fontSize: '18px',
                    color: '#1e293b',
                  }}>
                    {selectedPerson.email}
                  </p>
                </div>
              )}

              {selectedPerson.age && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '4px',
                  }}>
                    Age
                  </label>
                  <p style={{
                    fontSize: '18px',
                    color: '#1e293b',
                  }}>
                    {selectedPerson.age} years
                  </p>
                </div>
              )}
            </div>

            <div style={{
              marginTop: '32px',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
                  <button
                onClick={closeModal}
                style={{
                  padding: '8px 16px',
                  background: '#6b7280',
                  color: 'white',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
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

