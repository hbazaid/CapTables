import { BrowserProvider, Contract, Eip1193Provider, JsonRpcProvider, JsonRpcSigner } from "ethers";
import { CAP_TABLE_ABI } from "@/lib/abi/capTable";

declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

export type CapTableContract = Contract<typeof CAP_TABLE_ABI>;

export const CAP_TABLE_ABI_READONLY = CAP_TABLE_ABI;

export type ProviderLike = BrowserProvider | JsonRpcProvider | JsonRpcSigner;

export function getCapTableContract(address: string, providerOrSigner: ProviderLike) {
  return new Contract(address, CAP_TABLE_ABI, providerOrSigner) as CapTableContract;
}

export async function connectBrowserProvider() {
  if (typeof window === "undefined") {
    throw new Error("Wallet only available in browser");
  }
  if (!window.ethereum) {
    throw new Error("No injected wallet found. Install MetaMask or a compatible wallet.");
  }
  const provider = new BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const account = await signer.getAddress();
  const network = await provider.getNetwork();

  return {
    provider,
    signer,
    account,
    chainId: Number(network.chainId),
  };
}
