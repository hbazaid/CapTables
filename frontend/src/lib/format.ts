export function formatBigInt(value: bigint): string {
  const stringValue = value.toString();
  return stringValue.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatPercentage(numerator: bigint, denominator: bigint): string {
  if (denominator === 0n) {
    return "0%";
  }
  const ratio = Number((numerator * 10_000n) / denominator) / 100;
  return `${ratio.toFixed(2)}%`;
}

export function formatUnixTimestamp(value: bigint): string {
  if (!value || value === 0n) {
    return "—";
  }
  const millis = Number(value) * 1000;
  return new Date(millis).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
