// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhenixprotocol/contracts/access/Permissioned.sol";
import "@fhenixprotocol/cofhe-contracts/ICofhe.sol";

interface ISealBid {

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed creator,
        string title,
        uint256 endTime
    );

    event BidSubmitted(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 totalBids
    );

    event AuctionFinalized(
        uint256 indexed auctionId,
        uint256 timestamp
    );

    event WinnerClaimed(
        uint256 indexed auctionId,
        address indexed winner
    );

    error AuctionNotFound(uint256 auctionId);
    error AuctionStillActive(uint256 auctionId, uint256 endTime);
    error AuctionEnded(uint256 auctionId);
    error AuctionAlreadyFinalized(uint256 auctionId);
    error AuctionNotFinalized(uint256 auctionId);
    error CreatorCannotBid(uint256 auctionId);
    error InvalidDuration(uint256 provided, uint256 min, uint256 max);
    error InvalidTitle();
    error NoBidFound(uint256 auctionId, address bidder);
    error BidDoesNotMatchHighest(uint256 auctionId);
    error WinnerAlreadyClaimed(uint256 auctionId);

    function createAuction(
        string calldata title,
        string calldata description,
        uint256 duration
    ) external returns (uint256 auctionId);

    function submitBid(
        uint256 auctionId,
        InEuint128 calldata encryptedBid
    ) external;

    function finalizeAuction(uint256 auctionId) external;

    function claimWin(uint256 auctionId, uint128 claimedBidAmount) external;

    function sealMyBid(
        uint256 auctionId,
        Permission calldata permission
    ) external view returns (string memory);

    function getAuction(uint256 auctionId) external view returns (
        uint256 id,
        address creator,
        string memory title,
        string memory description,
        uint256 endTime,
        bool finalized,
        address winner,
        uint128 revealedHighestBid,
        uint256 bidCount
    );

    function getBidders(uint256 auctionId) external view returns (address[] memory);

    function hasBid(uint256 auctionId, address bidder) external view returns (bool);
}
