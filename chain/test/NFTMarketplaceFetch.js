const { expect } = require("chai")
const { ethers } = require("hardhat")

const _name = 'BadgeToken'
const _symbol = 'BADGE'

describe("NFTMarketplace Fetch functions", function () {
  let nftContract
  let market
  let account0,account1,account2
  let address0, address1, address2

  let listingFee
  const auctionPrice = ethers.utils.parseUnits('1', 'ether')

  beforeEach(async function () {
    [account0, account1, account2] = await ethers.getSigners()
    address0 = await account0.getAddress()
    address1 = await account1.getAddress()
    address2 = await account2.getAddress()

    const BadgeToken = await ethers.getContractFactory("BadgeToken")
    nft = await BadgeToken.deploy(_name,_symbol)
    // tokenAddress = nft.address

    const Market = await ethers.getContractFactory("NFTMarketplace")
    market = await Market.deploy()
    listingFee = await market.getListingFee()

    // console.log("1. == mint 1-6 to account#0")
    for(let i=1;i<=6;i++){
      await nft.mintTo(address0)
    }

    // console.log("3. == mint 7-9 to account#1")
    for(let i=7;i<=9;i++){
      await nft.connect(account1).mintTo(address1)
    }

    // console.log("2. == list 1-6 to market")
    for(let i=1;i<=6;i++){
      await nft.approve(market.address,i)
      await market.createMarketItem(nft.address, i, auctionPrice, { value: listingFee })
    }    
  })

  it("Should fetchActiveItems correctly", async function() {
    const items = await market.fetchActiveItems()
    expect(items.length).to.be.equal(6)
  })  

  it("Should fetchMyCreatedItems correctly", async function() {
    const items = await market.fetchMyCreatedItems()
    expect(items.length).to.be.equal(6)

    //should delete correctly
    await market.deleteMarketItem(1)
    const newPageResult = await market.fetchMyCreatedItems()
    expect(newPageResult.length).to.be.equal(5)
  })

  it("Should fetchMyPurchasedItems correctly", async function() {
    const pageResult = await market.fetchMyPurchasedItems()
    expect(pageResult.length).to.be.equal(0)
  })

  it("Should fetchActiveItems with correct return values", async function() {
    const pageResult = await market.fetchActiveItems()

    expect(pageResult[0].id).to.be.equal(ethers.BigNumber.from(1))
    expect(pageResult[0].nftContract).to.be.equal(nft.address)
    expect(pageResult[0].tokenId).to.be.equal(ethers.BigNumber.from(1))
    expect(pageResult[0].seller).to.be.equal(address0)
    expect(pageResult[0].buyer).to.be.equal(ethers.constants.AddressZero)
    expect(pageResult[0].state).to.be.equal(0)//enum State.Created
  }) 

  it("Should fetchMyPurchasedItems with correct return values", async function() {
    await market.connect(account1).buyMarketItem(nft.address, 1, { value: auctionPrice})
    const pageResult = await market.connect(account1).fetchMyPurchasedItems()

    expect(pageResult[0].id).to.be.equal(ethers.BigNumber.from(1))
    expect(pageResult[0].nftContract).to.be.equal(nft.address)
    expect(pageResult[0].tokenId).to.be.equal(ethers.BigNumber.from(1))
    expect(pageResult[0].seller).to.be.equal(address0)
    expect(pageResult[0].buyer).to.be.equal(address1)//address#1
    expect(pageResult[0].state).to.be.equal(1)//enum State.Release

  })    

})