import React from 'react';
import { createPortal } from 'react-dom';
import { FaTimes, FaCheck } from 'react-icons/fa';
import { getTemplate, listTemplatesForEvent } from '../templates';
import type { EventType, GeneratedPage, LayoutType } from '../types';
import { getTheme } from '../themes';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (layoutType: LayoutType) => void;
  eventType: EventType;
};

const LayoutPickerModal: React.FC<Props> = ({ open, onClose, onSelect, eventType }) => {
  const templates = listTemplatesForEvent(eventType);
  const [selected, setSelected] = React.useState<LayoutType | null>(null);

  if (!open) return null;

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
      setSelected(null);
    }
  };

  return createPortal(
    <div className="studio-flipbook-modal-overlay" onClick={onClose}>
      <div className="studio-flipbook-modal layout-picker-modal" onClick={e => e.stopPropagation()}>
        <div className="studio-flipbook-modal-header">
          <h3>Choose Page Layout</h3>
          <button type="button" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="layout-picker-grid">
          {templates.map((t) => {
            const tmpl = getTemplate(t.id as LayoutType);
            const isSelected = selected === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`layout-picker-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelected(t.id as LayoutType)}
              >
                <div className="layout-picker-preview">
                  {/* mini preview showing slot rectangles */}
                  <svg viewBox="0 0 160 100" className="layout-picker-svg">
                    <rect x="0" y="0" width="160" height="100" fill={getTheme(eventType === 'wedding' ? 'wedding_modern' : 'family_classic').backgroundColor} rx="2" />
                    {tmpl.imageSlots.map((slot) => (
                      <rect
                        key={slot.id}
                        x={slot.x * 1.6}
                        y={slot.y}
                        width={slot.width * 1.6}
                        height={slot.height}
                        fill="#cbd5e1"
                        stroke="#94a3b8"
                        strokeWidth="0.5"
                        rx={slot.borderRadius ? slot.borderRadius / 10 : 0}
                      />
                    ))}
                    {tmpl.textSlots.map((slot) => (
                      <rect
                        key={slot.id}
                        x={slot.x * 1.6}
                        y={slot.y}
                        width={slot.width * 1.6}
                        height={slot.height}
                        fill="none"
                        stroke="#60a5fa"
                        strokeWidth="0.5"
                        strokeDasharray="2,2"
                        rx="1"
                      />
                    ))}
                  </svg>
                </div>
                <div className="layout-picker-info">
                  <span className="layout-picker-name">{tmpl.name}</span>
                  <span className="layout-picker-meta">{tmpl.imageSlots.length} images · {tmpl.pageType}</span>
                </div>
                {isSelected && <div className="layout-picker-check"><FaCheck /></div>}
              </button>
            );
          })}
        </div>
        <div className="layout-picker-footer">
          <button type="button" className="layout-picker-cancel" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="layout-picker-confirm"
            onClick={handleConfirm}
            disabled={!selected}
          >
            Add Page
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LayoutPickerModal;
