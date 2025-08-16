// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PlayerRegistry
 * @dev A simple contract to register players for an on-chain game.
 * This creates a permanent, verifiable record of all participants.
 */
contract PlayerRegistry {
    // Mapping to efficiently check if an address is already registered.
    mapping(address => bool) private _isPlayer;

    // Array to store all registered player addresses.
    address[] public players;

    // Event to be emitted when a new player registers.
    event PlayerRegistered(address indexed playerAddress);

    /**
     * @dev Registers the calling address as a new player.
     * The transaction will fail if the player is already registered.
     */
    function register() public {
        require(!_isPlayer[msg.sender], "PlayerRegistry: Address is already registered.");

        _isPlayer[msg.sender] = true;
        players.push(msg.sender);

        emit PlayerRegistered(msg.sender);
    }

    /**
     * @dev Checks if a given address is registered.
     * @param playerAddress The address to check.
     * @return bool True if the address is registered, false otherwise.
     */
    function isRegistered(address playerAddress) public view returns (bool) {
        return _isPlayer[playerAddress];
    }

    /**
     * @dev Returns the total number of registered players.
     * @return uint256 The total count of players.
     */
    function getTotalPlayers() public view returns (uint256) {
        return players.length;
    }
}
