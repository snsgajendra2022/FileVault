import React from 'react';
import OpenClawAssistantPanel from '../components/openclaw/OpenClawAssistantPanel';

/** Full-page assistant (sidebar + chat). Same chat engine as the floating drawer. */
const OpenClawAssistantPage: React.FC = () => {
  return <OpenClawAssistantPanel layout="page" />;
};

export default OpenClawAssistantPage;
