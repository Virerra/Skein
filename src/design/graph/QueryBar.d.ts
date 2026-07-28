/**
 * @startingPoint section="Components" subtitle="Terminal-style RAG query input with result line" viewport="700x140"
 */
export interface QueryBarProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  result?: string;
}
