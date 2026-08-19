import React from 'react';
import { useTranslation } from 'react-i18next';
import { ProjectChatbotPanel } from 'om-ai-assistant/react';

/**
 * Zero-config — Project Brain auto-discovers menus, theme, screen, and data.
 * Host App already provides QueryClientProvider.
 */
export default function AIPage() {
  const { t } = useTranslation();

  return (
    <div className="portal-page-surface w-full min-h-[50vh] p-4 sm:p-6">

        <div className="wa-ai-host">
          <ProjectChatbotPanel wrapProvider={false} />
        </div>
      </div>
  );
}
