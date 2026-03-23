// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NoepinaxArt is ERC721URIStorage, ERC2981, Ownable {
    uint256 private _nextTokenId;
    mapping(uint256 => address) private _creators;

    constructor(address artistWallet) ERC721("Noepinax", "NPNX") Ownable(msg.sender) {
        _setDefaultRoyalty(artistWallet, 500); // 5%
    }

    function mint(address to, string memory uri) external onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        _creators[tokenId] = to;
        return tokenId;
    }

    function tokenCreator(uint256 tokenId) external view returns (address) {
        return _creators[tokenId];
    }

    function totalSupply() external view returns (uint256) {
        return _nextTokenId;
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721URIStorage, ERC2981) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
