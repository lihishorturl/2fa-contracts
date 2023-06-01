//SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";

contract Uni2fa is OwnableUpgradeable {

    struct TokenOwnership {
        address addr;
        string note;
        string secret;
    }

    struct AddressData {
        uint8 slot;
        uint8 minted;
        uint[] tokenIds;
    }

    uint256 public currentIndex;
    uint256 public slotPrice; // 1000000000000000 = 0.001 Ether = 1 Finney
    uint8 public slotQuantity;
    uint8 private defaultSlots;
    bool public isSaleActive;
    bool public isMintActive;
    bytes32 public merkleRoot;

    mapping(uint256 => TokenOwnership) internal ownerships;
    mapping(address => AddressData) private addressData;

    event Punched(address from, uint256 amount);
    event Minted(address from, uint256 tokenId);
    event Updated(address from, uint256 tokenId);
    event PriceSet(address from, uint256 price);
    event QuantitySet(address from, uint256 number);
    event DefaultSlotsSet(address from, uint256 number);
    event RootSet(address from, bytes32 root);

    function initialize(uint256 price, uint8 quantity, uint8 slotsQuota, bool saleStatus, bool mintStatus, bytes32 root) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        slotPrice = price;
        slotQuantity = quantity;
        defaultSlots = slotsQuota;
        isSaleActive = saleStatus;
        isMintActive = mintStatus;
        merkleRoot = root;
    }

    function setParameters(uint256 price, uint8 quantity, uint8 slotsQuota, bool saleStatus, bool mintStatus, bytes32 root) external onlyOwner {
        slotPrice = price;
        slotQuantity = quantity;
        defaultSlots = slotsQuota;
        isSaleActive = saleStatus;
        isMintActive = mintStatus;
        merkleRoot = root;
    }

    function getIndex() external view returns (uint256 index) {
        index = currentIndex;
    }

    function getData(address target) external view returns (AddressData memory data) {
        data = addressData[target];
    }

    function getStatus() external view returns (bool status) {
        status = isSaleActive;
    }

    function getMintStatus() external view returns (bool status) {
        status = isMintActive;
    }

    function getDefaultSlots() external view returns (uint8 number) {
        number = defaultSlots;
    }

    function getPrice() external view returns (uint price) {
        price = slotPrice;
    }

    function getRoot() external view returns (bytes32 root) {
        root = merkleRoot;
    }

    function getOwnerships(uint256 index) external view returns (TokenOwnership memory ownership) {
        ownership = ownerships[index];
    }

    function getQuantity() external view returns (uint8 quantity) {
        quantity = slotQuantity;
    }

    function getProof(bytes32[] calldata _merkleProof) external view returns (bool proof) {
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProofUpgradeable.verify(_merkleProof, merkleRoot, leaf) == true, "Invalid proof");

        proof = true;
    }

    function mint(string memory secret, string memory note) external {
        require(isMintActive, "Currently unavailable for minting.");
        if(addressData[msg.sender].slot == 0) {
            addressData[msg.sender].slot = uint8(defaultSlots);
        }
        require(addressData[msg.sender].minted < addressData[msg.sender].slot, "Need more slots");
        _set(msg.sender, secret, note);
    }

    function update(uint256 tokenId, string memory secret, string memory note) external {
        require(ownerships[tokenId].addr == msg.sender, "Only owner can update");
        
        _update(tokenId, secret, note);
    }

    function listPunch(bytes32[] calldata _merkleProof) external payable {
        require(isSaleActive, "Currently unavailable for sale.");
        require(msg.value >= (slotPrice / 2), "Bidding Insufficient");
        require(uint16(addressData[msg.sender].slot) + slotQuantity < 255, "Reach the limit of slot number" );

        if(addressData[msg.sender].slot == 0) {
            addressData[msg.sender].slot = uint8(defaultSlots);
        }

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProofUpgradeable.verify(_merkleProof, merkleRoot, leaf) == true, "Invalid proof");
        if(addressData[msg.sender].slot == 0) {
            addressData[msg.sender].slot = uint8(defaultSlots);
        }

        _addSlot(msg.sender, slotQuantity);
        emit Punched(msg.sender, msg.value);
    }

    function punch() external payable {
        require(isSaleActive, "Currently unavailable for sale." );
        require(msg.value >= slotPrice, "Bidding Insufficient");
        require(uint16(addressData[msg.sender].slot) + slotQuantity <= 255, "Reach the limit of slot number" );
        if(addressData[msg.sender].slot == 0) {
            addressData[msg.sender].slot = uint8(defaultSlots);
        }
        
        _addSlot(msg.sender, slotQuantity);
        emit Punched(msg.sender, msg.value);
    }

    function getSecret(uint256 tokenId) external view returns(string memory secret) {
        require (msg.sender == ownerships[tokenId].addr, "Only creator can get secret");
        secret = ownerships[tokenId].secret;
    }

    function getNote(uint tokenId) external view returns(string memory note) {
        require (msg.sender == ownerships[tokenId].addr, "Only creator can get note");
        note = ownerships[tokenId].note;
    }

    function getMintedNumber() external view returns(uint8 number) {
        number = addressData[msg.sender].minted;
    }

    function getSlotNumber() external view returns(uint8 number) {
        number = addressData[msg.sender].slot;
    }

    function getTokenIds() external view returns(uint256[] memory list) {
        list = addressData[msg.sender].tokenIds;
    }

    function balance() onlyOwner external view returns(uint256) {
        return address(this).balance;
    }

    function toggleSaleStatus() external onlyOwner {
        isSaleActive = !isSaleActive;
    }

    function toggleMintStatus() external onlyOwner {
        isMintActive = !isMintActive;
    }

    function setRoot(bytes32 root) external onlyOwner {
        merkleRoot = root;
        emit RootSet(msg.sender, root);
    }

    function setPrice(uint256 number) external onlyOwner {
        slotPrice = number;
        emit PriceSet(msg.sender, number);
    }

    function setQuantity(uint8 number) external onlyOwner {
        require (number > 0, "invalid number");
        slotQuantity = number;
        emit QuantitySet(msg.sender, number);
    }

    function setDefaultSlots(uint8 number) external onlyOwner {
        require (number > 0, "invalid number");
        defaultSlots = number;
        emit DefaultSlotsSet(msg.sender, number);
    }

    function _addSlot(address to, uint8 quantity) private {
        addressData[to].slot += quantity;
    }

    function _set(
        address to,
        string memory secret,
        string memory note
    ) internal {
        uint256 tokenId = currentIndex;
        ownerships[tokenId].addr = msg.sender;
        ownerships[tokenId].secret = secret;
        ownerships[tokenId].note = note;
        _add(to, tokenId);
        currentIndex += 1;

        emit Minted(msg.sender, tokenId);
    }

    function _update(
        uint256 tokenId,
        string memory secret,
        string memory note
    ) internal {
        ownerships[tokenId].secret = secret;
        ownerships[tokenId].note = note;

        emit Updated(msg.sender, tokenId);
    }

    function _add(
        address to,
        uint256 tokenId
    ) internal {
        addressData[to].minted += uint8(1);
        addressData[to].tokenIds.push(tokenId);
    }

    function withdraw() onlyOwner external {
        payable(owner()).transfer(address(this).balance);
    }
}