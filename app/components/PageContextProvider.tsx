import { useState } from "react";
import { PageContext } from "~/hooks/PageContext";
import Comments from "~/components/Comments";
import type { PageContextType } from "~/hooks/PageContext";

interface PageProviderProps {
  value: PageContextType;
  children: React.ReactElement<typeof Comments>;
}

export default function PageContextProvider({ children }: PageProviderProps) {
  const [page, setPage] = useState<number | null>(null);
  const value = { page, setPage };

  return <PageContext.Provider value={value}>{children}</PageContext.Provider>;
}
