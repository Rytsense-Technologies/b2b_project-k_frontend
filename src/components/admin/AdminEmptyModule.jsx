'use client';

import { ComingSoon } from '@/components/shared/module-ui';

/**
 * Honest "not live yet" module frame (College Admin, HOD / Faculty).
 * Renders the shared ComingSoon hero (design-system.md §4b) — never sample numbers.
 *
 * Props: title, description, epic (what unlocks it), actions, icon, steps[{title, body}], children.
 */
export default function AdminEmptyModule({
  title,
  description,
  epic,
  actions = null,
  icon = 'layers',
  steps = [],
  children = null,
}) {
  return (
    <div className="animate-fade-in sp pm-page">
      <ComingSoon
        icon={icon}
        title={title}
        body={description}
        unlock={epic}
        steps={steps}
        actions={actions}
      />
      {children}
    </div>
  );
}
