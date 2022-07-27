// SPDX-License-Identifier: MIT OR Apache-2.0
// adapt and edit from (Nader Dabit): https://github.com/dabit3/polygon-ethereum-nextjs-marketplace/blob/main/contracts/Market.sol

pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract NFTMarketplace is ReentrancyGuard {
    using Counters for Counters.Counter;

    Counters.Counter private _itemCounter; // start from 1
    Counters.Counter private _itemSoldCounter;

    address payable public marketOwner;

    uint256 private listingFee = 0.01 ether;

    enum State {
        Created,
        Release,
        Inactive
    }

    struct MarketItem {
        uint id;
        address nftContract;
        uint256 tokenId;
        address payable seller;
        address payable buyer;
        uint256 price;
        State state;
    }

    mapping(uint256 => MarketItem) marketItems;

    event MarketItemCreated(
        uint indexed id,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        address buyer,
        uint256 price,
        State state
    );

    event MarketItemDelete(
        uint indexed id,
        address indexed nftContract,
        uint256 indexed tokenId,
        address owner,
        State state
    );

    event MarketItemSold(
        uint indexed id,
        address indexed nftContract,
        uint256 indexed tokenId,
        address seller,
        address buyer,
        uint256 price,
        State state
    );

    constructor() {
        marketOwner = payable(msg.sender);
    }

    function getListingFee() external view returns (uint) {
        return listingFee;
    }

    function createMarketItem(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external payable nonReentrant {
        require(msg.value == listingFee, "Fee must be equal to listing fee");
        require(
            IERC721(nftContract).getApproved(tokenId) == address(this),
            "NFT must be approved to market"
        );
        _itemCounter.increment();
        uint256 id = _itemCounter.current();

        marketItems[id] = MarketItem(
            id,
            nftContract,
            tokenId,
            payable(msg.sender),
            payable(address(0)),
            price,
            State.Created
        );

        emit MarketItemCreated(
            id,
            nftContract,
            tokenId,
            msg.sender,
            address(0),
            price,
            State.Created
        );
    }

    function deleteMarketItem(uint256 ietmId) external nonReentrant {
        // require(ietmId <= _itemCounter.current(), "id must <= count");
        require(
            marketItems[ietmId].state == State.Created,
            "Item must be on market"
        );
        MarketItem storage item = marketItems[ietmId];
        require(
            IERC721(item.nftContract).ownerOf(item.tokenId) == msg.sender,
            "Must be item owner"
        );
        require(
            IERC721(item.nftContract).getApproved(item.tokenId) ==
                address(this),
            "NFT must be approved to market"
        );

        item.state = State.Inactive;

        emit MarketItemDelete(
            ietmId,
            item.nftContract,
            item.tokenId,
            msg.sender,
            item.state
        );
    }

    function createMarketSale(address nftContract, uint256 itemId)
        external
        payable
        nonReentrant
    {
        MarketItem storage item = marketItems[itemId];
        uint price = item.price;
        uint tokenId = item.tokenId;
        require(msg.value == price, "Please submit the asking price");
        require(
            IERC721(nftContract).getApproved(tokenId) == address(this),
            "NFT must be approved to market"
        );

        IERC721(nftContract).transferFrom(item.seller, msg.sender, tokenId);

        payable(marketOwner).transfer(listingFee);
        item.seller.transfer(msg.value);

        item.buyer = payable(msg.sender);
        item.state = State.Release;
        _itemSoldCounter.increment();

        emit MarketItemSold(
            itemId,
            nftContract,
            tokenId,
            item.seller,
            msg.sender,
            price,
            State.Release
        );
    }
}
