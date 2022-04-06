/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require('@nomiclabs/hardhat-waffle');
require("hardhat-gas-reporter");
require('@openzeppelin/hardhat-upgrades');
require('dotenv').config();

module.exports = {
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    ropsten: {
      chainId: 3,
      url: 'https://ropsten.infura.io/v3/acfe228be8b44b419945bf4b97d224fa',
      accounts: [process.env.PRIVATE_KEY]
    },
    matic: {
      chainId: 137,
      url: 'https://rpc-mainnet.matic.network',
      accounts: [process.env.PRIVATE_KEY]
    },
    matic_testnet: {
      chainId: 80001,
      url: "https://rpc-mumbai.maticvigil.com",
      accounts: [process.env.PRIVATE_KEY]
    },
    bsc: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      gasPrice: 20000000000,
      accounts: [process.env.PRIVATE_KEY]
    },
    bsc_testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: [process.env.PRIVATE_KEY]
    }
  },
};
