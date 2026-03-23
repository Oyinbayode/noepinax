// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NoepinaxMarketplace is ReentrancyGuard {
    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
        bool active;
    }

    uint256 private _nextListingId;
    mapping(uint256 => Listing) public listings;
    mapping(address => mapping(uint256 => uint256)) public tokenListing;

    event Listed(uint256 indexed listingId, address indexed seller, uint256 indexed tokenId, uint256 price);
    event Sold(uint256 indexed listingId, address indexed buyer, uint256 indexed tokenId, uint256 price);
    event Cancelled(uint256 indexed listingId);
    event PriceUpdated(uint256 indexed listingId, uint256 newPrice);

    function listItem(
        address nftContract,
        uint256 tokenId,
        uint256 price
    ) external returns (uint256) {
        require(price > 0, "Price must be positive");
        require(IERC721(nftContract).ownerOf(tokenId) == msg.sender, "Not token owner");
        require(
            IERC721(nftContract).getApproved(tokenId) == address(this) ||
            IERC721(nftContract).isApprovedForAll(msg.sender, address(this)),
            "Marketplace not approved"
        );

        uint256 listingId = _nextListingId++;
        listings[listingId] = Listing({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            price: price,
            active: true
        });
        tokenListing[nftContract][tokenId] = listingId;

        emit Listed(listingId, msg.sender, tokenId, price);
        return listingId;
    }

    function buyItem(uint256 listingId) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(listing.active, "Not active");
        require(msg.value >= listing.price, "Insufficient payment");

        // effects before interactions
        listing.active = false;
        delete tokenListing[listing.nftContract][listing.tokenId];

        // handle ERC-2981 royalties if supported
        uint256 royaltyAmount = 0;
        address royaltyReceiver;
        try IERC2981(listing.nftContract).royaltyInfo(listing.tokenId, listing.price) returns (
            address receiver, uint256 amount
        ) {
            royaltyReceiver = receiver;
            royaltyAmount = amount;
        } catch {}

        uint256 sellerProceeds = listing.price - royaltyAmount;

        // transfer NFT to buyer
        IERC721(listing.nftContract).transferFrom(listing.seller, msg.sender, listing.tokenId);

        // pay seller
        (bool sellerPaid,) = payable(listing.seller).call{value: sellerProceeds}("");
        require(sellerPaid, "Seller payment failed");

        // pay royalties
        if (royaltyAmount > 0 && royaltyReceiver != address(0)) {
            (bool royaltyPaid,) = payable(royaltyReceiver).call{value: royaltyAmount}("");
            require(royaltyPaid, "Royalty payment failed");
        }

        // refund overpayment
        uint256 excess = msg.value - listing.price;
        if (excess > 0) {
            (bool refunded,) = payable(msg.sender).call{value: excess}("");
            require(refunded, "Refund failed");
        }

        emit Sold(listingId, msg.sender, listing.tokenId, listing.price);
    }

    function cancelListing(uint256 listingId) external {
        Listing storage listing = listings[listingId];
        require(listing.active, "Not active");
        require(msg.sender == listing.seller, "Not seller");

        listing.active = false;
        delete tokenListing[listing.nftContract][listing.tokenId];

        emit Cancelled(listingId);
    }

    function updatePrice(uint256 listingId, uint256 newPrice) external {
        Listing storage listing = listings[listingId];
        require(listing.active, "Not active");
        require(msg.sender == listing.seller, "Not seller");
        require(newPrice > 0, "Price must be positive");

        listing.price = newPrice;
        emit PriceUpdated(listingId, newPrice);
    }

    function getListing(uint256 listingId) external view returns (
        address seller, address nftContract, uint256 tokenId, uint256 price, bool active
    ) {
        Listing storage l = listings[listingId];
        return (l.seller, l.nftContract, l.tokenId, l.price, l.active);
    }

    function nextListingId() external view returns (uint256) {
        return _nextListingId;
    }
}
