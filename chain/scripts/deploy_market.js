const { ethers, upgrades } = require("hardhat")

async function main() {

    const [deployer] = await ethers.getSigners();

    console.log(
        "Deploying contracts with the account:",
        await deployer.getAddress()
    );

    console.log("Account balance:", (await deployer.getBalance()).toString());

    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");
    console.log("Deploying NFTMarketplace...")

    const market = await upgrades.deployProxy(NFTMarketplace, [], { initializer: 'initialize' })

    console.log(market.address, " market(proxy) address")

    console.log(await upgrades.erc1967.getImplementationAddress(market.address), " getImplementationAddress")
    console.log(await upgrades.erc1967.getAdminAddress(market.address), " getAdminAddress")
}

main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})