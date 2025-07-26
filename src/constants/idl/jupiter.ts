import type { Idl } from "@coral-xyz/anchor";

export type Perpetuals = {
  version: "0.1.0";
  name: "perpetuals";
  instructions: [];
  accounts: [
    {
      name: "position";
      type: {
        kind: "struct";
        fields: [
          {
            name: "owner";
            type: "publicKey";
          },
          {
            name: "pool";
            type: "publicKey";
          },
          {
            name: "custody";
            type: "publicKey";
          },
          {
            name: "collateralCustody";
            type: "publicKey";
          },
          {
            name: "openTime";
            type: "i64";
          },
          {
            name: "updateTime";
            type: "i64";
          },
          {
            name: "side";
            type: {
              defined: "Side";
            };
          },
          {
            name: "price";
            type: "u64";
          },
          {
            name: "sizeUsd";
            type: "u64";
          },
          {
            name: "collateralUsd";
            type: "u64";
          },
          {
            name: "realisedPnlUsd";
            type: "i64";
          },
          {
            name: "cumulativeInterestSnapshot";
            type: "u128";
          },
          {
            name: "lockedAmount";
            type: "u64";
          },
          {
            name: "bump";
            type: "u8";
          },
        ];
      };
    },
  ];
  types: [
    {
      name: "Side";
      type: {
        kind: "enum";
        variants: [
          {
            name: "None";
          },
          {
            name: "Long";
          },
          {
            name: "Short";
          },
        ];
      };
    },
  ];
};

export const IDL: Idl = {
  version: "0.1.0",
  name: "perpetuals",
  instructions: [],
  accounts: [
    {
      name: "position",
      type: {
        kind: "struct",
        fields: [
          {
            name: "owner",
            type: "publicKey",
          },
          {
            name: "pool",
            type: "publicKey",
          },
          {
            name: "custody",
            type: "publicKey",
          },
          {
            name: "collateralCustody",
            type: "publicKey",
          },
          {
            name: "openTime",
            type: "i64",
          },
          {
            name: "updateTime",
            type: "i64",
          },
          {
            name: "side",
            type: {
              defined: "Side",
            },
          },
          {
            name: "price",
            type: "u64",
          },
          {
            name: "sizeUsd",
            type: "u64",
          },
          {
            name: "collateralUsd",
            type: "u64",
          },
          {
            name: "realisedPnlUsd",
            type: "i64",
          },
          {
            name: "cumulativeInterestSnapshot",
            type: "u128",
          },
          {
            name: "lockedAmount",
            type: "u64",
          },
          {
            name: "bump",
            type: "u8",
          },
        ],
      },
    },
  ],
  types: [
    {
      name: "Side",
      type: {
        kind: "enum",
        variants: [
          {
            name: "None",
          },
          {
            name: "Long",
          },
          {
            name: "Short",
          },
        ],
      },
    },
  ],
};
