import { createContext, Dispatch, SetStateAction } from "react";

export interface PageContextType {
  page: number | null;
  setPage: Dispatch<SetStateAction<number | null>>;
}

const defaultPageContextValues: PageContextType = {
  page: 0,
  setPage: () => {},
};

export const PageContext = createContext<PageContextType>(
  defaultPageContextValues
);
