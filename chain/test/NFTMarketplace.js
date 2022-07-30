const { expect } = require("chai")
const { ethers, upgrades } = require("hardhat")

const _name = 'BadgeToken'
const _symbol = 'BADGE'

describe("NFTMarketplace", function () {
  let nft
  let market
  let ProxyAdmin
  let TransparentUpgradeableProxy 
  let account0, account1, account2
  let address0, address1, address2

  let listingFee
  const auctionPrice = ethers.utils.parseEther('1')

  beforeEach(async function () {
    [account0, account1, account2] = await ethers.getSigners()
    address0 = await account0.getAddress()
    address1 = await account1.getAddress()
    address2 = await account2.getAddress()

    const BadgeToken = await ethers.getContractFactory("BadgeToken")
    nft = await BadgeToken.deploy(_name, _symbol)

    const NFTMarketplace = await ethers.getContractFactory("NFTMarketplace");

    market = await upgrades.deployProxy(NFTMarketplace, [], { initializer: 'initialize' })

    // console.log(market.address," NFTMarket Contract Address")

    // console.log(market.address, " market(proxy) address")
    // TransparentUpgradeableProxy = await upgrades.erc1967.getImplementationAddress(market.address);
    // console.log(TransparentUpgradeableProxy," getImplementationAddress")

    // ProxyAdmin = await upgrades.erc1967.getAdminAddress(market.address);
    // console.log(ProxyAdmin, " getAdminAddress")

    // const Market = await ethers.getContractFactory("NFTMarketplace")
    // market = await Market.deploy()
    listingFee = await market.getListingFee()

  })

  it("Should upgrade market version successfully", async function () {

    await nft.mintTo(address0)  //tokenId=1
    await nft.approve(market.address, 1)
    await market.createMarketItem(nft.address, 1, auctionPrice, { value: listingFee })
    expect(await market.getItemCount()).to.be.equal(1)

    const pageResult = await market.fetchMyCreatedItems()
    expect(pageResult.length).to.be.equal(1)

    const MarketV2 = await ethers.getContractFactory("NFTMarketplaceV2");
    const marketV2 = await upgrades.upgradeProxy(market.address, MarketV2);
    marketV2.attach(market.address)
    marketV2.changeOwner(address2)
    // console.log(marketV2.getOwner())
    expect(await marketV2.marketOwner()).to.be.equal(address2)
    console.log(market.address)
    console.log(marketV2.address)
    const pageResultV2 = await marketV2.fetchMyCreatedItems()
    expect(pageResultV2.length).to.be.equal(1)

  })

  it("Should create market item successfully", async function () {
    await nft.mintTo(address0)  //tokenId=1
    await nft.approve(market.address, 1)
    await market.createMarketItem(nft.address, 1, auctionPrice, { value: listingFee })
    expect(await market.getItemCount()).to.be.equal(1)

    const pageResult = await market.fetchMyCreatedItems()
    expect(pageResult.length).to.be.equal(1)
  })

  it("Should create market item with EVENT", async function () {
    await nft.mintTo(address0)  //tokenId=1
    await nft.approve(market.address, 1)
    await expect(market.createMarketItem(nft.address, 1, auctionPrice, { value: listingFee }))
      .to.emit(market, 'MarketItemCreated')
      .withArgs(
        1,
        nft.address,
        1,
        address0,
        ethers.constants.AddressZero,
        auctionPrice,
        0)
  })

  it("Should revert to create market item if nft is not approved", async function () {
    await nft.mintTo(address0)  //tokenId=1
    // await nft.approve(market.address,1)
    await expect(market.createMarketItem(nft.address, 1, auctionPrice, { value: listingFee }))
      .to.be.revertedWith('NFT must be approved to market')
  })

  it("Should create market item and buy (by address#1) successfully", async function () {
    await nft.mintTo(address0)  //tokenId=1
    await nft.approve(market.address, 1)
    await market.createMarketItem(nft.address, 1, auctionPrice, { value: listingFee })

    await expect(market.connect(account1).buyMarketItem(nft.address, 1, { value: auctionPrice }))
      .to.emit(market, 'MarketItemSold')
      .withArgs(
        1,
        nft.address,
        1,
        address0,
        address1,
        auctionPrice,
        1)

    expect(await nft.ownerOf(1)).to.be.equal(address1)

  })

  it("Should revert buy if seller remove approve", async function () {
    await nft.mintTo(address0)  //tokenId=1
    await nft.approve(market.address, 1)
    await market.createMarketItem(nft.address, 1, auctionPrice, { value: listingFee })

    await nft.approve(ethers.constants.AddressZero, 1)

    await expect(market.connect(account1).buyMarketItem(nft.address, 1, { value: auctionPrice }))
      .to.be.reverted
  })

  it("Should revert buy if seller transfer the token out", async function () {
    await nft.mintTo(address0)  //tokenId=1
    await nft.approve(market.address, 1)
    await market.createMarketItem(nft.address, 1, auctionPrice, { value: listingFee })

    await nft.transferFrom(address0, address2, 1)

    await expect(market.connect(account1).buyMarketItem(nft.address, 1, { value: auctionPrice }))
      .to.be.reverted
  })

  it("Should revert to delete(de-list) with wrong params", async function () {
    await nft.mintTo(address0)  //tokenId=1
    await nft.approve(market.address, 1)
    await market.createMarketItem(nft.address, 1, auctionPrice, { value: listingFee })

    //not a correct id
    await expect(market.deleteMarketItem(2)).to.be.reverted

    //not owner
    await expect(market.connect(account1).deleteMarketItem(1)).to.be.reverted

    await nft.transferFrom(address0, address1, 1)
    //not approved to market now
    await expect(market.deleteMarketItem(1)).to.be.reverted
  })

  it("Should create market item and delete(de-list) successfully", async function () {
    await nft.mintTo(address0)  //tokenId=1
    await nft.approve(market.address, 1)

    await market.createMarketItem(nft.address, 1, auctionPrice, { value: listingFee })
    await market.deleteMarketItem(1)

    await nft.approve(ethers.constants.AddressZero, 1)

    // should revert if trying to delete again
    await expect(market.deleteMarketItem(1))
      .to.be.reverted
  })

  it("Should seller, buyer and market owner correct ETH value after sale", async function () {
    let txresponse, txreceipt
    let gas
    const marketownerBalance = await ethers.provider.getBalance(address0)

    await nft.connect(account1).mintTo(address1)  //tokenId=1
    await nft.connect(account1).approve(market.address, 1)

    let sellerBalance = await ethers.provider.getBalance(address1)
    txresponse = await market.connect(account1).createMarketItem(nft.address, 1, auctionPrice, { value: listingFee })
    const sellerAfter = await ethers.provider.getBalance(address1)

    txreceipt = await txresponse.wait()
    gas = txreceipt.gasUsed.mul(txreceipt.effectiveGasPrice)

    // sellerAfter = sellerBalance - listingFee - gas
    expect(sellerAfter).to.equal(sellerBalance.sub(listingFee).sub(gas))

    const buyerBalance = await ethers.provider.getBalance(address2)
    txresponse = await market.connect(account2).buyMarketItem(nft.address, 1, { value: auctionPrice })
    const buyerAfter = await ethers.provider.getBalance(address2)

    txreceipt = await txresponse.wait()
    gas = txreceipt.gasUsed.mul(txreceipt.effectiveGasPrice)
    expect(buyerAfter).to.equal(buyerBalance.sub(auctionPrice).sub(gas))

    const marketownerAfter = await ethers.provider.getBalance(address0)
    expect(marketownerAfter).to.equal(marketownerBalance.add(listingFee))
  })
})