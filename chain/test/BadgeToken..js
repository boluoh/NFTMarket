const { expect } = require("chai");
const { ethers } = require("hardhat");

const base64 = require( "base-64")

describe("BadgeToken", function () {

    const _name = 'xuyh token'
    const _symbol = 'XYH'

    let BadgeToken;
    let badge;
    let owner;
    let account1;
    let account2;

    beforeEach(async function () {
        // Get the ContractFactory and Signers here.
        BadgeToken = await ethers.getContractFactory("BadgeToken");
        [owner, deposit, account1, account2] = await ethers.getSigners();

        // To deploy our contract, we just have to call Token.deploy() and await
        // for it to be deployed(), which happens onces its transaction has been
        // mined.
        badge = await BadgeToken.deploy(_name, _symbol);
        await badge.deployed();
    })

    it("Should has the correct name and symbol ", async function () {
        expect(await badge.name()).to.equal(_name)
        expect(await badge.symbol()).to.equal(_symbol)
    })

    it("Should tokenId start from 1 and auto increment", async function () {
        const address1 = await account1.getAddress()
        await badge.mintTo(address1)
        expect(await badge.ownerOf(1)).to.equal(address1)

        await badge.mintTo(address1)
        expect(await badge.ownerOf(2)).to.equal(address1)
        expect(await badge.balanceOf(address1)).to.equal(2)
    })

    it("Should mint a token with event", async function () {
        const address1 = await account1.getAddress()
        await expect(badge.mintTo(address1))
            .to.emit(badge, 'Transfer')
            .withArgs(ethers.constants.AddressZero, address1, 1)
    })

    it("Should mint a token with desired tokenURI (log result for inspection)", async function () {
        const address1=await account1.getAddress()
        await badge.mintTo(address1)
    
        const tokenUri = await badge.tokenURI(1)
        // console.log("tokenURI:")
        // console.log(tokenUri)
    
        const tokenId = 1
        const data = base64.decode(tokenUri.slice(29))
        const itemInfo = JSON.parse(data)
        expect(itemInfo.name).to.be.equal('Badge #'+String(tokenId))
        expect(itemInfo.description).to.be.equal('Badge NFT with on-chain SVG image.')
    
        const svg = base64.decode(itemInfo.image.slice(26))
        const idInSVG = svg.slice(256,-13)
        expect(idInSVG).to.be.equal(String(tokenId))
        // console.log("SVG image:")
        // console.log(svg)
      })  

      it("Should mint 10 token with desired tokenURI", async function () {
        const address1=await account1.getAddress()
    
        for(let i=1;i<=10;i++){
          await badge.mintTo(address1)
          const tokenUri = await badge.tokenURI(i)
    
          const data = base64.decode(tokenUri.slice(29))
          const itemInfo = JSON.parse(data)
          expect(itemInfo.name).to.be.equal('Badge #'+String(i))
          expect(itemInfo.description).to.be.equal('Badge NFT with on-chain SVG image.')
    
          const svg = base64.decode(itemInfo.image.slice(26))
          const idInSVG = svg.slice(256,-13)
          expect(idInSVG).to.be.equal(String(i))
        }
    
        expect(await badge.balanceOf(address1)).to.equal(10)
      }) 
});