import { useContext } from "react";
import { PageContext } from "~/hooks/PageContext";

export const usePageContext = () => useContext(PageContext);
