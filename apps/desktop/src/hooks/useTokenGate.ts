import { useQuery } from "@tanstack/react-query";
import { tokenExists } from "../lib/up-api/invoke";

export const TOKEN_EXISTS_QUERY_KEY = ["up", "tokenExists"] as const;

export function useTokenGate() {
  return useQuery({
    queryKey: TOKEN_EXISTS_QUERY_KEY,
    queryFn: tokenExists,
    staleTime: 30_000,
  });
}
