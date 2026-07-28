/**
 * @startingPoint section="Components" subtitle="Bracketed status tags: active, superseded, correction" viewport="700x100"
 */
export interface BadgeProps {
  status?: "active" | "superseded" | "correction";
  children: React.ReactNode;
}
