// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NoepinaxAuction is ReentrancyGuard {
    struct Auction {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 reservePrice;
        uint256 highestBid;
        address highestBidder;
        uint256 endTime;
        bool settled;
    }

    uint256 private _nextAuctionId;
    mapping(uint256 => Auction) public auctions;

    uint256 public constant MIN_BID_INCREMENT_BPS = 500; // 5%

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed seller,
        uint256 indexed tokenId,
        uint256 reservePrice,
        uint256 endTime
    );

    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount
    );

    event AuctionSettled(
        uint256 indexed auctionId,
        address indexed winner,
        uint256 amount
    );

    event AuctionCancelled(uint256 indexed auctionId);

    function createAuction(
        address nftContract,
        uint256 tokenId,
        uint256 reservePrice,
        uint256 duration
    ) external returns (uint256) {
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        uint256 auctionId = _nextAuctionId++;
        auctions[auctionId] = Auction({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            reservePrice: reservePrice,
            highestBid: 0,
            highestBidder: address(0),
            endTime: block.timestamp + duration,
            settled: false
        });

        emit AuctionCreated(auctionId, msg.sender, tokenId, reservePrice, block.timestamp + duration);
        return auctionId;
    }

    function bid(uint256 auctionId) external payable nonReentrant {
        Auction storage a = auctions[auctionId];
        require(block.timestamp < a.endTime, "Auction ended");
        require(!a.settled, "Already settled");

        if (a.highestBid == 0) {
            require(msg.value >= a.reservePrice, "Below reserve");
        } else {
            uint256 minBid = a.highestBid + (a.highestBid * MIN_BID_INCREMENT_BPS) / 10000;
            require(msg.value >= minBid, "Bid too low");
        }

        address previousBidder = a.highestBidder;
        uint256 previousBid = a.highestBid;

        a.highestBid = msg.value;
        a.highestBidder = msg.sender;

        if (previousBidder != address(0)) {
            payable(previousBidder).transfer(previousBid);
        }

        emit BidPlaced(auctionId, msg.sender, msg.value);
    }

    function settleAuction(uint256 auctionId) external nonReentrant {
        Auction storage a = auctions[auctionId];
        require(block.timestamp >= a.endTime, "Not ended yet");
        require(!a.settled, "Already settled");

        a.settled = true;

        if (a.highestBidder != address(0)) {
            IERC721(a.nftContract).transferFrom(address(this), a.highestBidder, a.tokenId);
            payable(a.seller).transfer(a.highestBid);
            emit AuctionSettled(auctionId, a.highestBidder, a.highestBid);
        } else {
            IERC721(a.nftContract).transferFrom(address(this), a.seller, a.tokenId);
            emit AuctionSettled(auctionId, address(0), 0);
        }
    }

    function cancelAuction(uint256 auctionId) external {
        Auction storage a = auctions[auctionId];
        require(msg.sender == a.seller, "Not seller");
        require(a.highestBidder == address(0), "Has bids");
        require(!a.settled, "Already settled");

        a.settled = true;
        IERC721(a.nftContract).transferFrom(address(this), a.seller, a.tokenId);
        emit AuctionCancelled(auctionId);
    }

    function getAuction(uint256 auctionId) external view returns (
        address seller, uint256 tokenId, uint256 reservePrice,
        uint256 highestBid, address highestBidder, uint256 endTime, bool settled
    ) {
        Auction storage a = auctions[auctionId];
        return (a.seller, a.tokenId, a.reservePrice, a.highestBid, a.highestBidder, a.endTime, a.settled);
    }

    function nextAuctionId() external view returns (uint256) {
        return _nextAuctionId;
    }
}
