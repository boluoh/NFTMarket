// SPDX-License-Identifier: MIT OR Apache-2.0

pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract NFTMarketplace is ReentrancyGuard {
    using Counters for Counters.Counter;

    Counters.Counter private _itemCounter; // start from 1
    Counters.Counter private _itemSoldCounter;

    address payable private marketOwner;

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

    error UnsupporFetch();

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

    // TODO: make contract upgradeable
    constructor() {
        marketOwner = payable(msg.sender);
    }

    function getItemCount() external view returns (uint256) {
        return _itemCounter.current();
    }

    function getListingFee() external view returns (uint) {
        return listingFee;
    }

    function createMarketItem(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) public payable nonReentrant {
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

    function deleteMarketItem(uint256 ietmId) public nonReentrant {
        require(ietmId <= _itemCounter.current(), "id must <= count");
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

    function buyMarketItem(address nftContract, uint256 itemId)
        public
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

    modifier validPage(uint256 _pageNumber, uint256 _pageSize) {
        require(_pageNumber > 0 && _pageSize > 0, "Invalid page param");
        _;
    }

    function fetchActiveItems() public view returns (MarketItem[] memory) {
        return fetchHelper(FetchOperation.ActiveItems);
    }

    function fetchMyPurchasedItems() public view returns (MarketItem[] memory) {
        return fetchHelper(FetchOperation.MyPurchasedItems);
    }

    function fetchMyCreatedItems() public view returns (MarketItem[] memory) {
        return fetchHelper(FetchOperation.MyCreatedItems);
    }

    enum FetchOperation {
        ActiveItems,
        MyPurchasedItems,
        MyCreatedItems
    }

    // TODO: pagination
    function fetchHelper(FetchOperation _op)
        private
        view
        returns (MarketItem[] memory)
    {
        uint total = _itemCounter.current();

        uint itemCount = 0;
        for (uint i = 1; i <= total; i++) {
            if (isCondition(marketItems[i], _op)) {
                itemCount++;
            }
        }

        uint index = 0;
        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint i = 1; i <= total; i++) {
            if (isCondition(marketItems[i], _op)) {
                items[index] = marketItems[i];
                index++;
            }
        }
        return items;
    }

    function isCondition(MarketItem memory item, FetchOperation _operation)
        private
        view
        returns (bool)
    {
        if (_operation == FetchOperation.MyCreatedItems) {
            return
                (item.seller == msg.sender && item.state != State.Inactive)
                    ? true
                    : false;
        } else if (_operation == FetchOperation.MyPurchasedItems) {
            return (item.buyer == msg.sender) ? true : false;
        } else if (_operation == FetchOperation.ActiveItems) {
            return
                (item.buyer == address(0) && item.state == State.Created)
                    ? true
                    : false;
        } else {
            revert UnsupporFetch();
        }
    }
}
