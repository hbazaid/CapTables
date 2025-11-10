export type ShareClass = {
  id: bigint;
  name: string;
  authorized: bigint;
  issued: bigint;
  currency: string;
  transferrable: boolean;
};

export type VestingSchedule = {
  start: bigint;
  cliff: bigint;
  end: bigint;
};

export type HolderPosition = {
  shareClassId: bigint;
  total: bigint;
  vesting: VestingSchedule;
  hasVesting: boolean;
};

export type HolderSummary = {
  address: string;
  positions: HolderPosition[];
  totalShares: bigint;
};

export type ShareClassFormState = {
  name: string;
  authorized: string;
  currency: string;
  transferrable: boolean;
};

export type IssueSharesFormState = {
  recipient: string;
  shareClassId: string;
  amount: string;
  hasVesting: boolean;
  vestingStart: string;
  vestingCliff: string;
  vestingEnd: string;
};

export type TransferSharesFormState = {
  from: string;
  to: string;
  shareClassId: string;
  amount: string;
};

export type BurnSharesFormState = {
  holder: string;
  shareClassId: string;
  amount: string;
};

export type UpdateVestingFormState = {
  holder: string;
  shareClassId: string;
  hasVesting: boolean;
  vestingStart: string;
  vestingCliff: string;
  vestingEnd: string;
};
