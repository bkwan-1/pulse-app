"use client";

import { Toaster } from "sonner";
import { useTheme } from "next-themes";

export function ToasterWrapper() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme as "light" | "dark" | "system"}
      position="bottom-right"
      richColors
    />
  );
}
