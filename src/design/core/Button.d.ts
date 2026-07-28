import React from "react";

/**
 * @startingPoint section="Components" subtitle="Primary, secondary, ghost, correction buttons" viewport="700x160"
 */
export interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "correction";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}
