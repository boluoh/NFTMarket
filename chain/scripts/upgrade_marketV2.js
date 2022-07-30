const { ethers, upgrades } = require("hardhat")

async function main() {

    const [deployer] = await ethers.getSigners();

    console.log(
        "Upgrade contracts with the account:",
        await deployer.getAddress()
    );

    console.log("Account balance:", (await deployer.getBalance()).toString());

    const NFTMarketplaceV2 = await ethers.getContractFactory("NFTMarketplaceV2");
    console.log("Upgrade NFTMarketplaceV2...")

    const marketV2 = await upgrades.upgradeProxy("0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0", NFTMarketplaceV2)
    marketV2.attach("0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0")

    console.log(marketV2.address, " market(proxy) address")

    console.log(await upgrades.erc1967.getImplementationAddress(marketV2.address), " getImplementationAddress")
    console.log(await upgrades.erc1967.getAdminAddress(marketV2.address), " getAdminAddress")
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})