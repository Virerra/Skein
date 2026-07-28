/**
 * @startingPoint section="Components" subtitle="Marble graph node: raised & glossy, or sunk & matte when superseded" viewport="700x160"
 */
export interface KnotProps {
  label?: string;
  status?: "active" | "superseded" | "correction";
  size?: number;
}
