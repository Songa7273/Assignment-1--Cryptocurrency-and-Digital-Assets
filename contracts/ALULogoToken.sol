// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ALULogoToken is ERC20, Ownable {
    uint256 public constant MAX_SUPPLY = 1_000_000 * 10 ** 18;

    constructor(address logoOwner)
        ERC20("ALU Logo Token", "ALUT")
        Ownable(logoOwner)
    {
        require(logoOwner != address(0), "Logo owner cannot be zero address");
        _mint(logoOwner, MAX_SUPPLY);
    }

    function distributeShares(
        address recipient,
        uint256 amount
    ) external onlyOwner {
        require(recipient != address(0), "Recipient cannot be zero address");
        require(amount > 0, "Amount must be greater than zero");
        _transfer(owner(), recipient, amount);
    }

    function ownershipPercentage(
        address account
    ) external view returns (uint256) {
        return (balanceOf(account) * 100) / MAX_SUPPLY;
    }
}
