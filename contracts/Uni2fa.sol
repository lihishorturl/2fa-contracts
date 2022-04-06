//SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";

contract Uni2fa is OwnableUpgradeable {

    struct TokenOwnership {
        address addr;
        bytes32 note;
        string secret;
    }

    struct AddressData {
        uint8 slot;
        uint8 minted;
        uint8 referred;
        uint[] tokenIds;
    }

    uint256 public currentIndex;
    uint256 public slotPrice; // 1000000000000000 = 0.001 Ether = 1 Finney
    uint8 public slotQuantity;
    uint8 private refferalLimit;
    uint8 private defaultSlots;
    bool public isSaleActive;
    bool public isMintActive;
    bytes32 public merkleRoot;

    mapping(uint256 => TokenOwnership) internal ownerships;
    mapping(address => AddressData) private addressData;

    event Punched(address from, uint256 amount);
    event Minted(address from, uint256 tokenId);
    event Updated(address from, uint256 tokenId);
    event PriceSetted(address from, uint256 price);
    event QuantitySetted(address from, uint256 number);
    event RefferalLimitSetted(address from, uint256 number);
    event DefaultSlotsSetted(address from, uint256 number);
    event RootSetted(address from, bytes32 root);

    function initialize(uint256 price, uint8 quantity, uint8 refferalQuota, uint8 slotsQuota, bool saleStauts, bool mintStatus, bytes32 root) public initializer {
        __Context_init_unchained();
        __Ownable_init_unchained();
        slotPrice = price;
        slotQuantity = quantity;
        refferalLimit = refferalQuota;
        defaultSlots = slotsQuota;
        isSaleActive = saleStauts;
        isMintActive = mintStatus;
        merkleRoot = root;
    }

    function setParameters(uint256 price, uint8 quantity, uint8 refferalQuota, uint8 slotsQuota, bool saleStauts, bool mintStatus, bytes32 root) external onlyOwner {
        slotPrice = price;
        slotQuantity = quantity;
        refferalLimit = refferalQuota;
        defaultSlots = slotsQuota;
        isSaleActive = saleStauts;
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

    function getRefferalLimit() external view returns (uint8 number) {
        number = refferalLimit;
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

    function whitelistMint(string memory secret, bytes32 note, bytes32[] calldata _merkleProof) external {
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        require(MerkleProofUpgradeable.verify(_merkleProof, merkleRoot, leaf) == true, "Invalid proof");
        if(addressData[msg.sender].slot == 0) {
            addressData[msg.sender].slot = uint8(defaultSlots);
        }
        require(addressData[msg.sender].minted < addressData[msg.sender].slot, "Need more slots");
        _set(msg.sender, secret, note);
    }

    function mint(string memory secret, bytes32 note) external {
        require(isMintActive, "Not available now");
        if(addressData[msg.sender].slot == 0) {
            addressData[msg.sender].slot = uint8(defaultSlots);
        }
        require(addressData[msg.sender].minted < addressData[msg.sender].slot, "Need more slots");
        _set(msg.sender, secret, note);
    }

    function mintWithReferral(string memory secret, bytes32 note, address referral) external {
        require(isMintActive, "Not available now");
        require(referral == address(referral), "Invalid address");
        require(referral != address(0), "Referral is not address" );
        require(referral != msg.sender, "Referral is same address" );
        if(addressData[msg.sender].slot == 0) {
            addressData[msg.sender].slot = uint8(defaultSlots);
        }
        require(addressData[msg.sender].minted < addressData[msg.sender].slot, "Need more slots");
        if(addressData[referral].slot == 0) {
            addressData[referral].slot = uint8(defaultSlots);
        }
        if(addressData[referral].referred < refferalLimit) {
            _addSlot(referral, 1);
            _addReferred(referral);
        }
    
        _set(msg.sender, secret, note);
    }

    function update(uint256 tokenId, string memory secret, bytes32 note) external {
        require(ownerships[tokenId].addr == msg.sender, "Only owner can update");
        
        _update(tokenId, secret, note);
    }

    function punch() external payable {
        require(isSaleActive, "Sale is off" );
        require(msg.value >= slotPrice, "Need a price");
        require(uint16(addressData[msg.sender].slot) + slotQuantity < 255, "Reach the limit of slot number" );
        if(addressData[msg.sender].slot == 0) {
            addressData[msg.sender].slot = uint8(2);
        }
        
        _addSlot(msg.sender, slotQuantity);
        emit Punched(msg.sender, msg.value);
    }

    function getSecret(uint256 tokenId) external view returns(string memory secret) {
        require (msg.sender == ownerships[tokenId].addr, "Only owner can get secret");
        secret = ownerships[tokenId].secret;
    }

    function getNote(uint tokenId) external view returns(bytes32 note) {
        require (msg.sender == ownerships[tokenId].addr, "Only owner can get secret");
        note = ownerships[tokenId].note;
    }

    function getRefferedNumber() external view returns(uint8 number) {
        number = addressData[msg.sender].referred;
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
        emit RootSetted(msg.sender, root);
    }

    function setPrice(uint256 number) external onlyOwner {
        slotPrice = number;
        emit PriceSetted(msg.sender, number);
    }

    function setQuantity(uint8 number) external onlyOwner {
        require (number > 0, "invalid number");
        slotQuantity = number;
        emit QuantitySetted(msg.sender, number);
    }

    function setRefferalLimit(uint8 number) external onlyOwner {
        require (number > 0, "invalid number");
        refferalLimit = number;
        emit RefferalLimitSetted(msg.sender, number);
    }

    function setDefaultSlots(uint8 number) external onlyOwner {
        require (number > 0, "invalid number");
        defaultSlots = number;
        emit DefaultSlotsSetted(msg.sender, number);
    }

    function _addSlot(address to, uint8 quantity) private {
        addressData[to].slot += quantity;
    }

    function _addReferred(address to) private {
        addressData[to].referred += 1;
    }

    function _set(
        address to,
        string memory secret,
        bytes32 note
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
        bytes32 note
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