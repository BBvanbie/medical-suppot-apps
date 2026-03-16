import type { ReactNode } from "react";

import { ContentCard } from "@/components/layout/ContentCard";

type PageSectionProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  cardClassName?: string;
  contentClassName?: string;
  density?: "compact" | "default" | "spacious";
};

export function PageSection({
  title,
  description,
  actions,
  children,
  cardClassName = "",
  contentClassName = "",
  density = "default",
}: PageSectionProps) {
  return (
    <ContentCard density={density} className={cardClassName}>
      {(title || description || actions) ? (
        <div className="page-section-header">
          <div className="page-section-copy">
            {title ? <h2 className="page-section-title">{title}</h2> : null}
            {description ? <p className="page-section-description">{description}</p> : null}
          </div>
          {actions ? <div className="page-section-actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className={["page-section-content", contentClassName].filter(Boolean).join(" ")}>{children}</div>
    </ContentCard>
  );
}
