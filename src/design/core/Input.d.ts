/**
 * @startingPoint section="Components" subtitle="Text field, plain and terminal-style" viewport="700x120"
 */
export interface InputProps {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  mono?: boolean;
  prompt?: string;
}
