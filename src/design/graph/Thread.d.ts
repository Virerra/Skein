/**
 * @startingPoint section="Components" subtitle="Curved edge: solid+glow (active) or dashed (superseded)" viewport="700x120"
 */
export interface ThreadProps {
  width?: number;
  height?: number;
  status?: "active" | "superseded" | "correction";
}
