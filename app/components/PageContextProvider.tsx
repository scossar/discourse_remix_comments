import { useState } from "react";
import { PageContext } from "~/hooks/PageContext";
import Comments from "~/components/Comments";
import type { PageContextType } from "~/hooks/PageContext";

interface PageProviderProps {
  value: PageContextType;
  children: React.ReactElement<typeof Comments>;
}

export default function PageContextProvider({
  children,
  value,
}: PageProviderProps) {
  const [page, setPage] = useState<number | null>(value.page);
  const contextValue = { page, setPage };

  return (
    <PageContext.Provider value={contextValue}>{children}</PageContext.Provider>
  );
}
