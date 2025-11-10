export const CAP_TABLE_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "initialOwner",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AmountMustBeGreaterThanZero",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "authorized",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "required",
        "type": "uint256"
      }
    ],
    "name": "AuthorizationTooLow",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "holder",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "shareClassId",
        "type": "uint256"
      }
    ],
    "name": "HoldingNotFound",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "available",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "required",
        "type": "uint256"
      }
    ],
    "name": "InsufficientBalance",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidCurrencySymbol",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidShareClassName",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidVestingWindow",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "RecipientIsZeroAddress",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "shareClassId",
        "type": "uint256"
      }
    ],
    "name": "ShareClassNotFound",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "shareClassId",
        "type": "uint256"
      }
    ],
    "name": "TransfersDisabled",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "caller",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      }
    ],
    "name": "UnauthorizedTransfer",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "shareClassId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "authorized",
        "type": "uint256"
      }
    ],
    "name": "ShareClassAuthorizationUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "shareClassId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "authorized",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "currency",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "transferrable",
        "type": "bool"
      }
    ],
    "name": "ShareClassCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "shareClassId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "transferrable",
        "type": "bool"
      }
    ],
    "name": "ShareClassTransferabilityUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "shareClassId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "SharesBurned",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "shareClassId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "SharesIssued",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "shareClassId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "SharesTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "holder",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "shareClassId",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint64",
            "name": "start",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "cliff",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "end",
            "type": "uint64"
          }
        ],
        "indexed": false,
        "internalType": "struct CapTable.VestingSchedule",
        "name": "vesting",
        "type": "tuple"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "hasVesting",
        "type": "bool"
      }
    ],
    "name": "VestingUpdated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "holder",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "shareClassId",
        "type": "uint256"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "shareClassId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "burnShares",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "authorized",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "currency",
        "type": "string"
      },
      {
        "internalType": "bool",
        "name": "transferrable",
        "type": "bool"
      }
    ],
    "name": "createShareClass",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllShareClasses",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "string",
                "name": "name",
                "type": "string"
              },
              {
                "internalType": "uint256",
                "name": "authorized",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "issued",
                "type": "uint256"
              },
              {
                "internalType": "string",
                "name": "currency",
                "type": "string"
              },
              {
                "internalType": "bool",
                "name": "transferrable",
                "type": "bool"
              }
            ],
            "internalType": "struct CapTable.ShareClassData",
            "name": "data",
            "type": "tuple"
          }
        ],
        "internalType": "struct CapTable.ShareClassView[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "holder",
        "type": "address"
      }
    ],
    "name": "getHolderPositions",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "shareClassId",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "total",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "uint64",
                "name": "start",
                "type": "uint64"
              },
              {
                "internalType": "uint64",
                "name": "cliff",
                "type": "uint64"
              },
              {
                "internalType": "uint64",
                "name": "end",
                "type": "uint64"
              }
            ],
            "internalType": "struct CapTable.VestingSchedule",
            "name": "vesting",
            "type": "tuple"
          },
          {
            "internalType": "bool",
            "name": "hasVesting",
            "type": "bool"
          }
        ],
        "internalType": "struct CapTable.HolderPositionView[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "holder",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "shareClassId",
        "type": "uint256"
      }
    ],
    "name": "getHolding",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "shareClassId",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "total",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "uint64",
                "name": "start",
                "type": "uint64"
              },
              {
                "internalType": "uint64",
                "name": "cliff",
                "type": "uint64"
              },
              {
                "internalType": "uint64",
                "name": "end",
                "type": "uint64"
              }
            ],
            "internalType": "struct CapTable.VestingSchedule",
            "name": "vesting",
            "type": "tuple"
          },
          {
            "internalType": "bool",
            "name": "hasVesting",
            "type": "bool"
          }
        ],
        "internalType": "struct CapTable.HolderPositionView",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "shareClassId",
        "type": "uint256"
      }
    ],
    "name": "getShareClass",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "authorized",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "issued",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "currency",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "transferrable",
            "type": "bool"
          }
        ],
        "internalType": "struct CapTable.ShareClassData",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "shareClassId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint64",
            "name": "start",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "cliff",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "end",
            "type": "uint64"
          }
        ],
        "internalType": "struct CapTable.VestingSchedule",
        "name": "vesting",
        "type": "tuple"
      },
      {
        "internalType": "bool",
        "name": "hasVesting",
        "type": "bool"
      }
    ],
    "name": "issueShares",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "listHolders",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "shareClassId",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "transferrable",
        "type": "bool"
      }
    ],
    "name": "setShareClassTransferability",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "shareClassCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "shareClassId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "transferShares",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "shareClassId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "newAuthorized",
        "type": "uint256"
      }
    ],
    "name": "updateShareClassAuthorization",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "holder",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "shareClassId",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint64",
            "name": "start",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "cliff",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "end",
            "type": "uint64"
          }
        ],
        "internalType": "struct CapTable.VestingSchedule",
        "name": "vesting",
        "type": "tuple"
      },
      {
        "internalType": "bool",
        "name": "hasVesting",
        "type": "bool"
      }
    ],
    "name": "updateVesting",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export type CapTableAbi = typeof CAP_TABLE_ABI;
