require("@nomicfoundation/hardhat-toolbox");

const INFURA_PROJECT_ID = "YOUR INFURA PROJECT ID";

const ROPSTEN_PRIVATE_KEY = "YOUR ROPSTEN PRIVATE KEY";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.9",
  // networks: {
  //   ropsten: {
  //     url: `https://ropsten.infura.io/v3/${INFURA_PROJECT_ID}`,
  //     accounts: [`0x${ROPSTEN_PRIVATE_KEY}`]
  //   }
  // }
};
