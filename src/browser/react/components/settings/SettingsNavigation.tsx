import * as React from 'react';

import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import type { SettingsPage } from './types';

interface NavigationItem {
  page: SettingsPage;
  labelKey: string;
}

interface NavigationGroup {
  labelKey: string;
  assistant?: boolean;
  items: NavigationItem[];
}

const groups: NavigationGroup[] = [
  {
    labelKey: 'tab_general',
    items: [
      { page: 'general.session', labelKey: 'session' },
      { page: 'general.images', labelKey: 'paste_images' },
      { page: 'general.appearance', labelKey: 'appearance' },
      { page: 'general.scrollbars', labelKey: 'scrollbars' },
      { page: 'general.zoom', labelKey: 'zoom' },
    ],
  },
  {
    labelKey: 'category_editor',
    items: [
      { page: 'editor.formatting', labelKey: 'formatting' },
      { page: 'editor.editing', labelKey: 'editor_ui' },
      { page: 'editor.fonts', labelKey: 'fonts' },
    ],
  },
  {
    labelKey: 'category_ai',
    assistant: true,
    items: [{ page: 'assistant.providers', labelKey: 'tab_assistant' }],
  },
];

export const SettingsNavigation: React.FC<{
  page: SettingsPage;
  showAssistant: boolean;
  onPageChange: (page: SettingsPage) => void;
}> = ({ page, showAssistant, onPageChange }) => {
  const { t } = useTranslation();
  const visibleGroups = groups.filter(
    (group) => showAssistant || !group.assistant,
  );

  return (
    <>
      <div className="border-b border-border p-3 md:hidden">
        <Select
          value={page}
          onValueChange={(value) => onPageChange(value as SettingsPage)}
        >
          <SelectTrigger aria-label={t('modals-settings:navigation_label')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {visibleGroups.flatMap((group) =>
              group.items.map((item) => (
                <SelectItem key={item.page} value={item.page}>
                  {t(`modals-settings:${group.labelKey}`)} ·{' '}
                  {t(`modals-settings:${item.labelKey}`)}
                </SelectItem>
              )),
            )}
          </SelectContent>
        </Select>
      </div>

      <nav
        aria-label={t('modals-settings:navigation_label')}
        className="hidden w-56 shrink-0 overflow-y-auto border-r border-border bg-muted/20 px-3 py-5 md:block"
      >
        {visibleGroups.map((group) => (
          <div key={group.labelKey} className="mb-5 last:mb-0">
            <p className="mb-1 px-2 text-base font-bold text-foreground">
              {t(`modals-settings:${group.labelKey}`)}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <button
                  key={item.page}
                  type="button"
                  aria-current={page === item.page ? 'page' : undefined}
                  onClick={() => onPageChange(item.page)}
                  className={cn(
                    'w-full cursor-pointer rounded-sm border-l-2 px-3 py-1.5 text-left text-sm transition-colors',
                    page === item.page
                      ? 'border-primary bg-accent text-accent-foreground'
                      : 'border-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                  )}
                >
                  {t(`modals-settings:${item.labelKey}`)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </>
  );
};
