import { useOwnerrNetwork } from "@/context/ownerr-network/OwnerrNetworkProvider";
import { useAuth } from "@/context/AuthContext";

export function useOwnerrNetworkAuth() {
  const auth = useAuth();
  const network = useOwnerrNetwork();
  return {
    ...auth,
    ...network,
    refreshProfile: network.reload,
  };
}
