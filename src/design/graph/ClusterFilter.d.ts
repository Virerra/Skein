/**
 * @startingPoint section="Components" subtitle="Sidebar cluster checkboxes with color swatches" viewport="700x200"
 */
export interface Cluster {
  id: string;
  name: string;
  color: string;
  count: number;
}
export interface ClusterFilterProps {
  clusters: Cluster[];
  selected: string[];
  onToggle: (id: string) => void;
}
