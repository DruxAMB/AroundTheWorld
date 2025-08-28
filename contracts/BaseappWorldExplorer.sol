// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.0;

// import "https://github.com/chiru-labs/ERC721A/blob/main/contracts/ERC721A.sol";
// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.9.0/contracts/access/Ownable.sol";
// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.9.0/contracts/security/ReentrancyGuard.sol";

// contract BaseappWorldExplorer is ERC721A, Ownable, ReentrancyGuard {
//     struct Level {
//         string name;
//         string ipfsHash;
//         uint256 maxSupply;
//         uint256 totalMinted;
//         bool isActive;
//     }

//     // Level ID => Level Details
//     mapping(uint256 => Level) public levels;
//     // User => Level ID => Number of mints
//     mapping(address => mapping(uint256 => uint256)) public mintsPerLevel;
//     // Token ID => Level ID
//     mapping(uint256 => uint256) public tokenToLevel;
    
//     string public baseURI = "ipfs://";
//     uint256 public currentTokenId = 1;
//     uint256 public mintPrice = 0.00005 ether; // $0.05 in ETH (approximate)
//     uint256 public maxMintsPerLevelPerWallet = 0; // 0 means unlimited

//     event LevelAdded(uint256 indexed levelId, string name, string ipfsHash, uint256 maxSupply);
//     event LevelMinted(address indexed to, uint256 indexed levelId, uint256 tokenId);

//     constructor() ERC721A("FarcasterWorldExplorer", "FWE") {}

//     function addLevel(
//         uint256 levelId,
//         string memory name,
//         string memory ipfsHash,
//         uint256 maxSupply
//     ) external onlyOwner {
//         require(bytes(levels[levelId].name).length == 0, "Level already exists");
//         levels[levelId] = Level(name, ipfsHash, maxSupply, 0, true);
//         emit LevelAdded(levelId, name, ipfsHash, maxSupply);
//     }

//     function toggleLevel(uint256 levelId, bool isActive) external onlyOwner {
//         require(bytes(levels[levelId].name).length > 0, "Level doesn't exist");
//         levels[levelId].isActive = isActive;
//     }

//     function mint(uint256 levelId) external payable nonReentrant {
//         Level storage level = levels[levelId];
//         require(level.isActive, "Level not active");
//         require(level.totalMinted < level.maxSupply, "Max supply reached");
//         require(msg.value >= mintPrice, "Insufficient payment");
        
//         // Check if there's a limit per wallet and enforce it
//         if (maxMintsPerLevelPerWallet > 0) {
//             require(mintsPerLevel[msg.sender][levelId] < maxMintsPerLevelPerWallet, "Mint limit reached for this level");
//         }

//         uint256 tokenId = currentTokenId++;
//         _safeMint(msg.sender, 1);
        
//         tokenToLevel[tokenId] = levelId;
//         mintsPerLevel[msg.sender][levelId]++;
//         level.totalMinted++;

//         emit LevelMinted(msg.sender, levelId, tokenId);
//     }

//     function tokenURI(uint256 tokenId) 
//         public 
//         view 
//         override 
//         returns (string memory) 
//     {
//         require(_exists(tokenId), "Nonexistent token");
//         uint256 levelId = tokenToLevel[tokenId];
//         return string(abi.encodePacked(
//             baseURI, 
//             levels[levelId].ipfsHash
//         ));
//     }

//     function _baseURI() internal view override returns (string memory) {
//         return baseURI;
//     }

//     function setBaseURI(string memory newBaseURI) external onlyOwner {
//         baseURI = newBaseURI;
//     }

//     function setMintPrice(uint256 newPrice) external onlyOwner {
//         mintPrice = newPrice;
//     }
    
//     function setMaxMintsPerLevelPerWallet(uint256 newLimit) external onlyOwner {
//         maxMintsPerLevelPerWallet = newLimit;
//     }
    
//     function getMintsForLevel(address wallet, uint256 levelId) public view returns (uint256) {
//         return mintsPerLevel[wallet][levelId];
//     }

//     // Emergency withdrawal in case someone sends ETH by mistake
//     function withdraw() external onlyOwner {
//         (bool success, ) = owner().call{value: address(this).balance}("");
//         require(success, "Withdrawal failed");
//     }
// }