"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  BrowserProvider,
  JsonRpcProvider,
  JsonRpcSigner,
  TransactionReceipt,
  isAddress,
} from "ethers";
import {
  connectBrowserProvider,
  getCapTableContract,
  ProviderLike,
} from "@/lib/contract";
import {
  ShareClass,
  HolderSummary,
  ShareClassFormState,
  IssueSharesFormState,
  TransferSharesFormState,
  BurnSharesFormState,
  UpdateVestingFormState,
  HolderPosition,
  VestingSchedule,
} from "@/lib/types";
import {
  formatBigInt,
  formatPercentage,
  formatUnixTimestamp,
} from "@/lib/format";

type Feedback = {
  type: "success" | "error" | "info";
  message: string;
};

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CAP_TABLE_ADDRESS ?? "").trim();
const READ_ONLY_RPC = (process.env.NEXT_PUBLIC_PUBLIC_RPC_URL ?? "").trim();

function extractErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: string }).message;
    if (maybeMessage) return maybeMessage;
    const maybeReason = (error as { reason?: string }).reason;
    if (maybeReason) return maybeReason;
  }
  return "Something went wrong. Check the console for more details.";
}

function coerceBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string" && value.length > 0) return BigInt(value);
  if (value && typeof value === "object" && "toString" in value) {
    return BigInt((value as { toString: () => string }).toString());
  }
  return 0n;
}

function hydrateShareClasses(raw: unknown[]): ShareClass[] {
  return raw.map((item) => {
    const record = item as {
      id?: unknown;
      data?: {
        name?: string;
        authorized?: unknown;
        issued?: unknown;
        currency?: string;
        transferrable?: boolean;
      };
    };
    const data = record.data ?? (record as never)[1] ?? {};
    return {
      id: coerceBigInt(record.id ?? (record as never)[0]),
      name: data.name ?? "",
      authorized: coerceBigInt(data.authorized),
      issued: coerceBigInt(data.issued),
      currency: data.currency ?? "",
      transferrable: Boolean(data.transferrable),
    };
  });
}

function hydratePositions(raw: unknown[]): HolderPosition[] {
  return raw.map((item) => {
    const record = item as {
      shareClassId?: unknown;
      total?: unknown;
      vesting?: {
        start?: unknown;
        cliff?: unknown;
        end?: unknown;
      };
      hasVesting?: boolean;
    };
    const vesting = record.vesting ?? (record as never)[2] ?? {};
    return {
      shareClassId: coerceBigInt(record.shareClassId ?? (record as never)[0]),
      total: coerceBigInt(record.total ?? (record as never)[1]),
      vesting: {
        start: coerceBigInt(vesting.start),
        cliff: coerceBigInt(vesting.cliff),
        end: coerceBigInt(vesting.end),
      },
      hasVesting: Boolean(record.hasVesting ?? (record as never)[3]),
    };
  });
}

function parseDateToUnix(input: string): bigint {
  if (!input) return 0n;
  const timestamp = Math.floor(new Date(input).getTime() / 1000);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    throw new Error("Invalid date provided. Use a valid YYYY-MM-DD value.");
  }
  return BigInt(timestamp);
}

function shortAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function CapTableDashboard() {
  const [readProvider, setReadProvider] = useState<BrowserProvider | JsonRpcProvider | null>(null);
  const [walletProvider, setWalletProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [account, setAccount] = useState<string>("");
  const [chainId, setChainId] = useState<number | null>(null);

  const [shareClasses, setShareClasses] = useState<ShareClass[]>([]);
  const [holders, setHolders] = useState<HolderSummary[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [shareClassForm, setShareClassForm] = useState<ShareClassFormState>({
    name: "",
    authorized: "",
    currency: "USD",
    transferrable: true,
  });

  const [issueForm, setIssueForm] = useState<IssueSharesFormState>({
    recipient: "",
    shareClassId: "",
    amount: "",
    hasVesting: false,
    vestingStart: "",
    vestingCliff: "",
    vestingEnd: "",
  });

  const [transferForm, setTransferForm] = useState<TransferSharesFormState>({
    from: "",
    to: "",
    shareClassId: "",
    amount: "",
  });

  const [burnForm, setBurnForm] = useState<BurnSharesFormState>({
    holder: "",
    shareClassId: "",
    amount: "",
  });

  const [vestingForm, setVestingForm] = useState<UpdateVestingFormState>({
    holder: "",
    shareClassId: "",
    hasVesting: true,
    vestingStart: "",
    vestingCliff: "",
    vestingEnd: "",
  });

  const providerForReads: ProviderLike | null = useMemo(() => {
    if (signer) return signer;
    if (walletProvider) return walletProvider;
    if (readProvider) return readProvider;
    return null;
  }, [signer, walletProvider, readProvider]);

  const needsContractAddress = !CONTRACT_ADDRESS;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (window.ethereum) {
      const provider = new BrowserProvider(window.ethereum);
      setReadProvider(provider);
      provider.getNetwork().then((network) => {
        setChainId((current) => current ?? Number(network.chainId));
      });

      const handleAccountsChanged = (accounts: string[]) => {
        const nextAccount = accounts?.[0] ?? "";
        setAccount(nextAccount);
        setTransferForm((prev) => ({
          ...prev,
          from: nextAccount || prev.from,
        }));
        void loadData();
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on?.("accountsChanged", handleAccountsChanged);
      window.ethereum.on?.("chainChanged", handleChainChanged);

      return () => {
        window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
        window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
      };
    }

    if (READ_ONLY_RPC) {
      const provider = new JsonRpcProvider(READ_ONLY_RPC);
      setReadProvider(provider);
      provider.getNetwork().then((network) => {
        setChainId((current) => current ?? Number(network.chainId));
      });
    }
  }, [loadData]);

  const loadData = useCallback(async () => {
    if (needsContractAddress) {
      setError("Set NEXT_PUBLIC_CAP_TABLE_ADDRESS in your environment to enable contract interactions.");
      return;
    }
    if (!providerForReads) {
      setError("Connect a wallet or configure NEXT_PUBLIC_PUBLIC_RPC_URL for read access.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const contract = getCapTableContract(CONTRACT_ADDRESS, providerForReads);
      const rawShareClasses = await contract.getAllShareClasses();
      const parsedShareClasses = hydrateShareClasses(rawShareClasses);
      setShareClasses(parsedShareClasses);

      const holderAddresses: string[] = await contract.listHolders();
      const summaries: HolderSummary[] = await Promise.all(
        holderAddresses.map(async (holder) => {
          const positionsRaw = await contract.getHolderPositions(holder);
          const positions = hydratePositions(positionsRaw);
          const totalShares = positions.reduce((acc, current) => acc + current.total, 0n);
          return {
            address: holder,
            positions,
            totalShares,
          };
        }),
      );

      setHolders(summaries);
    } catch (err) {
      console.error(err);
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [needsContractAddress, providerForReads]);

  useEffect(() => {
    if (!needsContractAddress) {
      void loadData();
    }
  }, [loadData, needsContractAddress]);

  useEffect(() => {
    if (account) {
      setTransferForm((prev) => ({
        ...prev,
        from: account,
      }));
    }
  }, [account]);

  const handleConnectWallet = useCallback(async () => {
    setFeedback(null);
    setError(null);
    try {
      const { provider, signer: nextSigner, account: nextAccount, chainId: nextChain } =
        await connectBrowserProvider();
      setWalletProvider(provider);
      setSigner(nextSigner);
      setAccount(nextAccount);
      setChainId(nextChain);
      setTransferForm((prev) => ({ ...prev, from: nextAccount }));
      setFeedback({ type: "success", message: "Wallet connected successfully." });
      await loadData();
    } catch (err) {
      console.error(err);
      setError(extractErrorMessage(err));
    }
  }, [loadData]);

  function requireSignerContract() {
    if (needsContractAddress) {
      throw new Error("Missing NEXT_PUBLIC_CAP_TABLE_ADDRESS environment value.");
    }
    if (!signer) {
      throw new Error("Connect your wallet to perform this action.");
    }
    return getCapTableContract(CONTRACT_ADDRESS, signer);
  }

  async function waitForReceipt(txPromise: Promise<unknown>) {
    const tx = (await txPromise) as { wait: () => Promise<TransactionReceipt> };
    const receipt = await tx.wait();
    return receipt;
  }

  const handleCreateShareClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    try {
      const contract = requireSignerContract();
      if (!shareClassForm.name.trim()) {
        throw new Error("Share class name is required.");
      }
      if (!shareClassForm.currency.trim()) {
        throw new Error("Currency symbol is required.");
      }
      const authorized = BigInt(shareClassForm.authorized);
      if (authorized <= 0n) {
        throw new Error("Authorized shares must be greater than zero.");
      }

      await waitForReceipt(
        contract.createShareClass(
          shareClassForm.name.trim(),
          authorized,
          shareClassForm.currency.trim(),
          shareClassForm.transferrable,
        ),
      );
      setFeedback({
        type: "success",
        message: `Share class ${shareClassForm.name} created.`,
      });
      setShareClassForm({
        name: "",
        authorized: "",
        currency: "USD",
        transferrable: true,
      });
      await loadData();
    } catch (err) {
      console.error(err);
      setError(extractErrorMessage(err));
    }
  };

  const handleIssueShares = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    try {
      const contract = requireSignerContract();
      const { recipient, shareClassId, amount, hasVesting, vestingStart, vestingCliff, vestingEnd } = issueForm;
      if (!isAddress(recipient)) {
        throw new Error("Recipient must be a valid Ethereum address.");
      }
      const shareClass = BigInt(shareClassId || "0");
      if (shareClass <= 0n) {
        throw new Error("Share class ID must be provided.");
      }
      const shareAmount = BigInt(amount || "0");
      if (shareAmount <= 0n) {
        throw new Error("Amount must be greater than zero.");
      }

      let vesting: VestingSchedule = { start: 0n, cliff: 0n, end: 0n };
      const hasVestingFlag = Boolean(hasVesting);
      if (hasVestingFlag) {
        const start = parseDateToUnix(vestingStart);
        const cliff = parseDateToUnix(vestingCliff);
        const end = parseDateToUnix(vestingEnd);
        vesting = { start, cliff, end };
      }

      await waitForReceipt(
        contract.issueShares(recipient, shareClass, shareAmount, vesting, hasVestingFlag),
      );
      setFeedback({ type: "success", message: "Shares issued successfully." });
      setIssueForm({
        recipient: "",
        shareClassId: "",
        amount: "",
        hasVesting: false,
        vestingStart: "",
        vestingCliff: "",
        vestingEnd: "",
      });
      await loadData();
    } catch (err) {
      console.error(err);
      setError(extractErrorMessage(err));
    }
  };

  const handleTransferShares = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    try {
      const contract = requireSignerContract();
      const { from, to, shareClassId, amount } = transferForm;
      if (!isAddress(from)) {
        throw new Error("Sender address is invalid.");
      }
      if (!isAddress(to)) {
        throw new Error("Recipient address is invalid.");
      }
      const shareClass = BigInt(shareClassId || "0");
      if (shareClass <= 0n) {
        throw new Error("Share class ID must be provided.");
      }
      const shareAmount = BigInt(amount || "0");
      if (shareAmount <= 0n) {
        throw new Error("Amount must be greater than zero.");
      }

      await waitForReceipt(contract.transferShares(from, to, shareClass, shareAmount));
      setFeedback({ type: "success", message: "Shares transferred successfully." });
      setTransferForm((prev) => ({
        ...prev,
        to: "",
        shareClassId: "",
        amount: "",
      }));
      await loadData();
    } catch (err) {
      console.error(err);
      setError(extractErrorMessage(err));
    }
  };

  const handleBurnShares = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    try {
      const contract = requireSignerContract();
      const { holder, shareClassId, amount } = burnForm;
      if (!isAddress(holder)) {
        throw new Error("Holder address is invalid.");
      }
      const shareClass = BigInt(shareClassId || "0");
      if (shareClass <= 0n) {
        throw new Error("Share class ID must be provided.");
      }
      const shareAmount = BigInt(amount || "0");
      if (shareAmount <= 0n) {
        throw new Error("Amount must be greater than zero.");
      }

      await waitForReceipt(contract.burnShares(holder, shareClass, shareAmount));
      setFeedback({ type: "success", message: "Shares burned successfully." });
      setBurnForm({
        holder: "",
        shareClassId: "",
        amount: "",
      });
      await loadData();
    } catch (err) {
      console.error(err);
      setError(extractErrorMessage(err));
    }
  };

  const handleUpdateVesting = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    try {
      const contract = requireSignerContract();
      const { holder, shareClassId, hasVesting, vestingStart, vestingCliff, vestingEnd } = vestingForm;
      if (!isAddress(holder)) {
        throw new Error("Holder address is invalid.");
      }
      const shareClass = BigInt(shareClassId || "0");
      if (shareClass <= 0n) {
        throw new Error("Share class ID must be provided.");
      }
      let vesting: VestingSchedule = { start: 0n, cliff: 0n, end: 0n };
      const hasVestingFlag = Boolean(hasVesting);
      if (hasVestingFlag) {
        vesting = {
          start: parseDateToUnix(vestingStart),
          cliff: parseDateToUnix(vestingCliff),
          end: parseDateToUnix(vestingEnd),
        };
      }

      await waitForReceipt(contract.updateVesting(holder, shareClass, vesting, hasVestingFlag));
      setFeedback({ type: "success", message: "Vesting details updated." });
      setVestingForm({
        holder: "",
        shareClassId: "",
        hasVesting: true,
        vestingStart: "",
        vestingCliff: "",
        vestingEnd: "",
      });
      await loadData();
    } catch (err) {
      console.error(err);
      setError(extractErrorMessage(err));
    }
  };

  const totals = useMemo(() => {
    return shareClasses.reduce(
      (acc, current) => {
        acc.authorized += current.authorized;
        acc.issued += current.issued;
        return acc;
      },
      { authorized: 0n, issued: 0n },
    );
  }, [shareClasses]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12">
        <header className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-[1px] shadow-lg">
          <div className="rounded-3xl bg-white/95 p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-widest text-slate-500">On-Chain Governance</p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-900 md:text-4xl">
                  Cap Table Management Console
                </h1>
                <p className="mt-3 max-w-2xl text-base text-slate-600">
                  Administer share classes, allocations, vesting schedules, and secondary transfers with a
                  secure smart contract backend.
                </p>
              </div>
              <div className="flex flex-col items-start gap-3">
                {account ? (
                  <div className="rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow">
                    Connected: {shortAddress(account)}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectWallet}
                    className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-slate-700"
                  >
                    Connect Wallet
                  </button>
                )}
                {CONTRACT_ADDRESS && (
                  <p className="text-xs font-mono uppercase tracking-wide text-slate-500">
                    Contract: {shortAddress(CONTRACT_ADDRESS)}
                  </p>
                )}
                {chainId && (
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Chain ID: {chainId}
                  </p>
                )}
              </div>
            </div>
          </div>
        </header>

        {feedback && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              feedback.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : feedback.type === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            {feedback.message}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Share Classes</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{shareClasses.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Authorized Shares</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{formatBigInt(totals.authorized)}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Issued Shares</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{formatBigInt(totals.issued)}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Active Holders</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{holders.length}</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Share Classes</h2>
              <button
                type="button"
                onClick={() => void loadData()}
                className="text-sm font-medium text-slate-500 hover:text-slate-800"
              >
                Refresh
              </button>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4">ID</th>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Authorized</th>
                    <th className="py-2 pr-4">Issued</th>
                    <th className="py-2 pr-4">Utilization</th>
                    <th className="py-2">Transferable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shareClasses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-sm text-slate-500">
                        {isLoading ? "Loading data..." : "No share classes found yet."}
                      </td>
                    </tr>
                  )}
                  {shareClasses.map((shareClass) => (
                    <tr key={shareClass.id.toString()} className="text-slate-700">
                      <td className="py-2 pr-4 font-mono text-xs text-slate-400">
                        #{shareClass.id.toString()}
                      </td>
                      <td className="py-2 pr-4 font-medium text-slate-900">
                        {shareClass.name}{" "}
                        <span className="ml-1 text-xs text-slate-400">{shareClass.currency}</span>
                      </td>
                      <td className="py-2 pr-4">{formatBigInt(shareClass.authorized)}</td>
                      <td className="py-2 pr-4">{formatBigInt(shareClass.issued)}</td>
                      <td className="py-2 pr-4">
                        {formatPercentage(shareClass.issued, shareClass.authorized)}
                      </td>
                      <td className="py-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            shareClass.transferrable
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {shareClass.transferrable ? "Enabled" : "Restricted"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Holders & Allocations</h2>
            <div className="mt-4 space-y-4">
              {holders.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-500">
                  {isLoading ? "Loading allocations..." : "No equity holders yet."}
                </p>
              )}
              {holders.map((holder) => (
                <div key={holder.address} className="rounded-2xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-xs uppercase tracking-wide text-slate-500">
                      {holder.address}
                    </p>
                    <p className="text-sm font-semibold text-slate-800">
                      Total: {formatBigInt(holder.totalShares)}
                    </p>
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    {holder.positions.map((position) => (
                      <div
                        key={`${holder.address}-${position.shareClassId.toString()}`}
                        className="flex flex-col rounded-xl bg-slate-50 px-3 py-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-800">
                            Share Class #{position.shareClassId.toString()}
                          </span>
                          <span className="font-semibold text-slate-900">
                            {formatBigInt(position.total)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                          <span>
                            Vesting:{" "}
                            {position.hasVesting
                              ? `${formatUnixTimestamp(position.vesting.start)} → ${formatUnixTimestamp(position.vesting.end)}`
                              : "Immediate"}
                          </span>
                          {position.hasVesting && (
                            <span>Cliff: {formatUnixTimestamp(position.vesting.cliff)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={handleCreateShareClass}
            className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"
          >
            <h3 className="text-lg font-semibold text-slate-900">Create Share Class</h3>
            <div className="mt-4 grid gap-3">
              <label className="text-sm font-medium text-slate-600">
                Name
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  value={shareClassForm.name}
                  onChange={(event) =>
                    setShareClassForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="e.g. Series A Preferred"
                  required
                />
              </label>
              <label className="text-sm font-medium text-slate-600">
                Authorized shares
                <input
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  value={shareClassForm.authorized}
                  onChange={(event) =>
                    setShareClassForm((prev) => ({ ...prev, authorized: event.target.value }))
                  }
                  placeholder="1000000"
                  required
                />
              </label>
              <label className="text-sm font-medium text-slate-600">
                Currency symbol
                <input
                  maxLength={10}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  value={shareClassForm.currency}
                  onChange={(event) =>
                    setShareClassForm((prev) => ({ ...prev, currency: event.target.value }))
                  }
                  placeholder="USD"
                  required
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={shareClassForm.transferrable}
                  onChange={(event) =>
                    setShareClassForm((prev) => ({ ...prev, transferrable: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
                />
                Enable secondary transfers
              </label>
            </div>
            <button
              type="submit"
              className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-slate-700"
            >
              Create share class
            </button>
          </form>

          <form
            onSubmit={handleIssueShares}
            className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"
          >
            <h3 className="text-lg font-semibold text-slate-900">Issue Shares</h3>
            <div className="mt-4 grid gap-3">
              <label className="text-sm font-medium text-slate-600">
                Recipient address
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  value={issueForm.recipient}
                  onChange={(event) =>
                    setIssueForm((prev) => ({ ...prev, recipient: event.target.value }))
                  }
                  placeholder="0x..."
                  required
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-600">
                  Share class ID
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    value={issueForm.shareClassId}
                    onChange={(event) =>
                      setIssueForm((prev) => ({ ...prev, shareClassId: event.target.value }))
                    }
                    placeholder="1"
                    required
                  />
                </label>
                <label className="text-sm font-medium text-slate-600">
                  Amount
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    value={issueForm.amount}
                    onChange={(event) => setIssueForm((prev) => ({ ...prev, amount: event.target.value }))}
                    placeholder="10000"
                    required
                  />
                </label>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={issueForm.hasVesting}
                  onChange={(event) =>
                    setIssueForm((prev) => ({ ...prev, hasVesting: event.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
                />
                Apply vesting schedule
              </label>
              {issueForm.hasVesting && (
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="text-sm font-medium text-slate-600">
                    Start
                    <input
                      type="date"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      value={issueForm.vestingStart}
                      onChange={(event) =>
                        setIssueForm((prev) => ({ ...prev, vestingStart: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-600">
                    Cliff
                    <input
                      type="date"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      value={issueForm.vestingCliff}
                      onChange={(event) =>
                        setIssueForm((prev) => ({ ...prev, vestingCliff: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-600">
                    End
                    <input
                      type="date"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      value={issueForm.vestingEnd}
                      onChange={(event) =>
                        setIssueForm((prev) => ({ ...prev, vestingEnd: event.target.value }))
                      }
                      required
                    />
                  </label>
                </div>
              )}
            </div>
            <button
              type="submit"
              className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-slate-700"
            >
              Issue shares
            </button>
          </form>

          <form
            onSubmit={handleTransferShares}
            className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"
          >
            <h3 className="text-lg font-semibold text-slate-900">Transfer Shares</h3>
            <div className="mt-4 grid gap-3">
              <label className="text-sm font-medium text-slate-600">
                From address
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  value={transferForm.from}
                  onChange={(event) =>
                    setTransferForm((prev) => ({ ...prev, from: event.target.value }))
                  }
                  placeholder="0x..."
                  required
                />
              </label>
              <label className="text-sm font-medium text-slate-600">
                To address
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  value={transferForm.to}
                  onChange={(event) =>
                    setTransferForm((prev) => ({ ...prev, to: event.target.value }))
                  }
                  placeholder="0x..."
                  required
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-600">
                  Share class ID
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    value={transferForm.shareClassId}
                    onChange={(event) =>
                      setTransferForm((prev) => ({ ...prev, shareClassId: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="text-sm font-medium text-slate-600">
                  Amount
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    value={transferForm.amount}
                    onChange={(event) =>
                      setTransferForm((prev) => ({ ...prev, amount: event.target.value }))
                    }
                    required
                  />
                </label>
              </div>
            </div>
            <button
              type="submit"
              className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-slate-700"
            >
              Transfer
            </button>
          </form>

          <form
            onSubmit={handleBurnShares}
            className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"
          >
            <h3 className="text-lg font-semibold text-slate-900">Burn Shares</h3>
            <div className="mt-4 grid gap-3">
              <label className="text-sm font-medium text-slate-600">
                Holder address
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  value={burnForm.holder}
                  onChange={(event) =>
                    setBurnForm((prev) => ({ ...prev, holder: event.target.value }))
                  }
                  placeholder="0x..."
                  required
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-600">
                  Share class ID
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    value={burnForm.shareClassId}
                    onChange={(event) =>
                      setBurnForm((prev) => ({ ...prev, shareClassId: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="text-sm font-medium text-slate-600">
                  Amount
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    value={burnForm.amount}
                    onChange={(event) => setBurnForm((prev) => ({ ...prev, amount: event.target.value }))}
                    required
                  />
                </label>
              </div>
            </div>
            <button
              type="submit"
              className="mt-4 w-full rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-rose-500"
            >
              Burn
            </button>
          </form>

          <form
            onSubmit={handleUpdateVesting}
            className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"
          >
            <h3 className="text-lg font-semibold text-slate-900">Update Vesting</h3>
            <div className="mt-4 grid gap-3">
              <label className="text-sm font-medium text-slate-600">
                Holder address
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  value={vestingForm.holder}
                  onChange={(event) =>
                    setVestingForm((prev) => ({ ...prev, holder: event.target.value }))
                  }
                  placeholder="0x..."
                  required
                />
              </label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-600">
                  Share class ID
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    value={vestingForm.shareClassId}
                    onChange={(event) =>
                      setVestingForm((prev) => ({ ...prev, shareClassId: event.target.value }))
                    }
                    required
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={vestingForm.hasVesting}
                    onChange={(event) =>
                      setVestingForm((prev) => ({ ...prev, hasVesting: event.target.checked }))
                    }
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-200"
                  />
                  Apply vesting schedule
                </label>
              </div>
              {vestingForm.hasVesting && (
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="text-sm font-medium text-slate-600">
                    Start
                    <input
                      type="date"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      value={vestingForm.vestingStart}
                      onChange={(event) =>
                        setVestingForm((prev) => ({ ...prev, vestingStart: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-600">
                    Cliff
                    <input
                      type="date"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      value={vestingForm.vestingCliff}
                      onChange={(event) =>
                        setVestingForm((prev) => ({ ...prev, vestingCliff: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-600">
                    End
                    <input
                      type="date"
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      value={vestingForm.vestingEnd}
                      onChange={(event) =>
                        setVestingForm((prev) => ({ ...prev, vestingEnd: event.target.value }))
                      }
                      required
                    />
                  </label>
                </div>
              )}
            </div>
            <button
              type="submit"
              className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-slate-700"
            >
              Update vesting
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
