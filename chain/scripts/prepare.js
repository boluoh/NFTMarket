const { expect } = require("chai")
const { ethers } = require("hardhat")

const _name = 'BadgeToken'
const _symbol = 'BADGE'

async function main() {

  console.log("========   deploy to a **new** localhost ======")

  /* deploy the NFT contract */
  const NFT = await ethers.getContractFactory("BadgeToken")
  const nftContract = await NFT.deploy(_name, _symbol)
  await nftContract.deployed()

  const tokenAddress = nftContract.address;

  /* deploy the marketplace */
  const Market = await ethers.getContractFactory("NFTMarketplace")
  const marketContract = await Market.deploy()

  const marketAddress = marketContract.address;

  console.log("nftContractAddress:", nftContract.address)
  console.log("marketAddress     :", marketContract.address)

  console.log("========   Prepare for webapp dev ======")
  console.log("nftContractAddress:", tokenAddress)
  console.log("marketAddress     :", marketAddress)
  console.log("**should be the same**")

  let owner, account1, account2

  [owner, account1, account2] = await ethers.getSigners()
  const address0 = await owner.getAddress()
  const address1 = await account1.getAddress()
  const address2 = await account2.getAddress()

  const market = await ethers.getContractAt("NFTMarketplace", marketAddress)
  const nft = await ethers.getContractAt("BadgeToken", tokenAddress)

  const listingFee = await market.getListingFee()
  const auctionPrice = ethers.utils.parseUnits('1', 'ether')

  console.log("1. == mint 1-6 to account#0,%", address0)
  for (let i = 1; i <= 6; i++) {
    await nft.mintTo(address0)
  }

  console.log("2. == list 1-6 to market")
  for (let i = 1; i <= 6; i++) {
    await nft.approve(marketAddress, i)
    await market.createMarketItem(tokenAddress, i, auctionPrice, { value: listingFee })
  }

  console.log("3. == mint 7-9 to account#1,%", address1)
  for (let i = 7; i <= 9; i++) {
    await nft.connect(account1).mintTo(address1)
  }

  console.log("4. == list 1-6 to market")
  for (let i = 7; i <= 9; i++) {
    await nft.connect(account1).approve(marketAddress, i)
    await market.connect(account1).createMarketItem(tokenAddress, i, auctionPrice, { value: listingFee })
  }

  console.log("5. == account#0,% buy 7 & 8", address0)
  await market.buyMarketItem(tokenAddress, 7, { value: auctionPrice })
  await market.buyMarketItem(tokenAddress, 8, { value: auctionPrice })

  console.log("6. == account#1,% buy 1", address1)
  await market.connect(account1).buyMarketItem(tokenAddress, 1, { value: auctionPrice })

  console.log("7. == account#2,% buy 2", address2)
  await market.connect(account2).buyMarketItem(tokenAddress, 2, { value: auctionPrice })

  console.log("8. == account#0,% delete 6", address0)
  await market.deleteMarketItem(6)

}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})