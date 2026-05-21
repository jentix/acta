import { createContext, useContext } from "react";

type GraphContextValue = {
  selectedId: string | null;
  connectedIds: Set<string>;
};

export const GraphContext = createContext<GraphContextValue>({
  selectedId: null,
  connectedIds: new Set(),
});

export function useGraphContext() {
  return useContext(GraphContext);
}
