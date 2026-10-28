// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ALUAssetRegistry is ERC721 {
    struct AssetMetadata {
        string assetName;
        string fileType;
        bytes32 contentHash;
        address registrant;
        uint256 registeredAt;
    }

    uint256 private _nextTokenId = 1;
    mapping(uint256 tokenId => AssetMetadata metadata) private _assets;
    mapping(bytes32 contentHash => bool registered) public hashRegistered;

    event AssetRegistered(
        uint256 indexed tokenId,
        string assetName,
        string fileType,
        bytes32 indexed contentHash,
        address indexed registrant
    );

    constructor() ERC721("ALU Asset Registry", "ALUASSET") {}

    function registerAsset(
        string calldata assetName,
        string calldata fileType,
        bytes32 contentHash
    ) external returns (uint256 tokenId) {
        require(contentHash != bytes32(0), "Content hash cannot be empty");
        require(!hashRegistered[contentHash], "Asset hash already registered");

        tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);

        _assets[tokenId] = AssetMetadata({
            assetName: assetName,
            fileType: fileType,
            contentHash: contentHash,
            registrant: msg.sender,
            registeredAt: block.timestamp
        });
        hashRegistered[contentHash] = true;

        emit AssetRegistered(
            tokenId,
            assetName,
            fileType,
            contentHash,
            msg.sender
        );
    }

    function verifyLogoIntegrity(
        uint256 tokenId,
        bytes32 suppliedHash
    ) external view returns (bool authentic, string memory message) {
        require(_ownerOf(tokenId) != address(0), "Asset does not exist");
        authentic = _assets[tokenId].contentHash == suppliedHash;
        message = authentic
            ? "Logo is authentic."
            : "Warning: logo does not match.";
    }

    function getAsset(
        uint256 tokenId
    ) external view returns (AssetMetadata memory) {
        require(_ownerOf(tokenId) != address(0), "Asset does not exist");
        return _assets[tokenId];
    }
}
