import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    "base": {
      url: `https://sepolia.base.org`,
      accounts: [process.env.WALLET_PRIVATE_KEY as string],
    }
  },
  etherscan: {
    apiKey: {
      "base": process.env.BASESCAN_API_KEY as string,
    }
  }
};

export default config;
