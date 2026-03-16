import type { ReactNode } from "react";

import { PageSection } from "@/components/layout/PageSection";

type TableSectionProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function TableSection({ title, description, actions, children, className = "" }: TableSectionProps) {
  return (
    <PageSection title={title} description={description} actions={actions} cardClassName={className} contentClassName="table-section-body" density="default">
      <div className="table-section-scroll">{children}</div>
    </PageSection>
  );
}
