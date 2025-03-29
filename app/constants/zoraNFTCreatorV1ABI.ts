// Simplified ABI for Zora NFT Creator contract
export const zoraNFTCreatorV1ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_quantity",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "_data",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "_mintReferral",
        "type": "address"
      }
    ],
    "name": "mintWithRewards",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  }
];
