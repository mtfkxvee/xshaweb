import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCurrentCustomer } from "@/lib/erpnext/auth";

export const AUTH_QUERY_KEY = ["current-customer"] as const;

export function useAuth() {
  const query = useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: () => getCurrentCustomer(),
    staleTime: 60_000,
  });

  return {
    user: query.data ?? null,
    isLoading: query.isLoading,
    isLoggedIn: Boolean(query.data?.customer),
  };
}

export function useInvalidateAuth() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
}
