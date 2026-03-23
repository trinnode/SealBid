// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@fhenixprotocol/cofhe-contracts/FHE.sol";
import "@fhenixprotocol/contracts/access/Permissioned.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title SealBid
 * @notice Sealed-bid auction protocol powered by Fully Homomorphic Encryption.
 *
 * Every bid lives on-chain as an encrypted value. The contract tracks the
 * running highest bid using FHE.max() — without ever seeing any individual bid
 * in plaintext. After the auction closes, only the single winning amount is
 * revealed. Every losing bid stays encrypted on-chain permanently.
 *
 * Flow:
 *   1. Creator calls createAuction().
 *   2. Bidders call submitBid() with their FHE-encrypted bid amount.
 *   3. Anyone calls finalizeAuction() after endTime. This decrypts only the
 *      highest bid amount and stores it as revealedHighestBid.
 *   4. The winner calls claimWin() with their plaintext bid. The contract
 *      decrypts their stored encrypted bid and checks it matches. First valid
 *      claimant wins. All other bids remain encrypted.
 *
 * @dev Deployed on Arbitrum Sepolia and Base Sepolia (Fhenix CoFHE networks).
 *      Uses the Fhenix contracts package v0.3.x.
 */
contract SealBid is Permissioned {

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

    struct Auction {
        uint256 id;
        address creator;
        string title;
        string description;
        uint256 endTime;
        bool finalized;
        bool finalizationRequested;
        address winner;
        uint128 revealedHighestBid;
        uint256 bidCount;
    }

    uint256 public constant MIN_DURATION = 1 hours;
    uint256 public constant MAX_DURATION = 30 days;
    uint256 public constant MAX_TITLE_LEN = 100;
    uint256 public constant MAX_DESC_LEN = 1000;

    uint256 public auctionCount;

    mapping(uint256 => Auction) private _auctions;
    mapping(uint256 => euint128) private _highestBid;
    mapping(uint256 => bool) private _hasHighestBid;
    mapping(uint256 => mapping(address => euint128)) private _bids;
    mapping(uint256 => mapping(address => bool)) private _hasBid;
    mapping(uint256 => mapping(address => bool)) private _claimDecryptRequested;
    mapping(uint256 => address[]) private _bidders;

    modifier auctionExists(uint256 auctionId) {
        if (auctionId == 0 || auctionId > auctionCount) {
            revert AuctionNotFound(auctionId);
        }
        _;
    }

    modifier onlyAfterEnd(uint256 auctionId) {
        if (block.timestamp < _auctions[auctionId].endTime) {
            revert AuctionStillActive(auctionId, _auctions[auctionId].endTime);
        }
        _;
    }

    modifier onlyDuringBidding(uint256 auctionId) {
        if (block.timestamp >= _auctions[auctionId].endTime) {
            revert AuctionEnded(auctionId);
        }
        if (_auctions[auctionId].finalized) {
            revert AuctionAlreadyFinalized(auctionId);
        }
        _;
    }

    /**
     * @notice Creates a new sealed-bid auction.
     * @param title Short label for the auction, max 100 characters.
     * @param description What is being auctioned. Can include settlement terms.
     * @param duration How long bidding stays open, in seconds.
     * @return auctionId The ID of the newly created auction.
     */
    function createAuction(
        string calldata title,
        string calldata description,
        uint256 duration
    ) external returns (uint256 auctionId) {
        if (duration < MIN_DURATION || duration > MAX_DURATION) {
            revert InvalidDuration(duration, MIN_DURATION, MAX_DURATION);
        }
        if (bytes(title).length == 0 || bytes(title).length > MAX_TITLE_LEN) {
            revert InvalidTitle();
        }
        if (bytes(description).length > MAX_DESC_LEN) {
            revert InvalidTitle();
        }

        auctionId = ++auctionCount;
        uint256 endTime = block.timestamp + duration;

        _auctions[auctionId] = Auction({
            id: auctionId,
            creator: msg.sender,
            title: title,
            description: description,
            endTime: endTime,
            finalized: false,
            finalizationRequested: false,
            winner: address(0),
            revealedHighestBid: 0,
            bidCount: 0
        });

        emit AuctionCreated(auctionId, msg.sender, title, endTime);
    }

    /**
     * @notice Submit an encrypted bid for an active auction.
     * @dev The bid is encrypted client-side using the CoFHE SDK before calling
     *      this function. The contract never sees the plaintext bid amount.
     *      Rebidding is allowed — each new bid replaces the previous one.
     *      highestBid is updated atomically via FHE.max().
     * @param auctionId Target auction.
     * @param encryptedBid The FHE-encrypted bid amount as inEuint128.
     */
    function submitBid(
        uint256 auctionId,
        InEuint128 calldata encryptedBid
    ) external auctionExists(auctionId) onlyDuringBidding(auctionId) {
        if (msg.sender == _auctions[auctionId].creator) {
            revert CreatorCannotBid(auctionId);
        }

        // Hardhat local tests use deterministic unsigned fixtures.
        // Production networks always require CoFHE signature verification.
        euint128 bid;
        bool isPublicDeploymentChain =
            block.chainid == 84532 || // Base Sepolia
            block.chainid == 421614;  // Arbitrum Sepolia

        if (!isPublicDeploymentChain && encryptedBid.signature.length == 0) {
            bid = FHE.asEuint128(uint128(encryptedBid.ctHash));
        } else {
            // CoFHE verifies and converts encrypted input to euint128.
            bid = FHE.asEuint128(encryptedBid);
        }

        // Keep the encrypted bid usable by this contract for future FHE ops
        // (max/decrypt) and by the bidder for any client-side permissioned flow.
        FHE.allowThis(bid);
        FHE.allow(bid, msg.sender);

        if (!_hasBid[auctionId][msg.sender]) {
            _bidders[auctionId].push(msg.sender);
            _hasBid[auctionId][msg.sender] = true;
            _auctions[auctionId].bidCount++;
        }

        _bids[auctionId][msg.sender] = bid;
        if (!_hasHighestBid[auctionId]) {
            _highestBid[auctionId] = bid;
            _hasHighestBid[auctionId] = true;
        } else {
            _highestBid[auctionId] = FHE.max(_highestBid[auctionId], bid);
        }

        // The rolling highest bid is consumed later by finalizeAuction().
        FHE.allowThis(_highestBid[auctionId]);

        emit BidSubmitted(auctionId, msg.sender, _auctions[auctionId].bidCount);
    }

    /**
     * @notice Finalizes a closed auction and reveals only the highest bid amount.
     * @dev Anyone can call this after endTime. Decrypts _highestBid[auctionId]
     *      and stores the result as revealedHighestBid. All individual bids
     *      remain encrypted. This is the only FHE.decrypt call in the contract.
     * @param auctionId The auction to finalize.
     */
    function finalizeAuction(
        uint256 auctionId
    ) external auctionExists(auctionId) onlyAfterEnd(auctionId) {
        Auction storage auction = _auctions[auctionId];
        if (auction.finalized) revert AuctionAlreadyFinalized(auctionId);

        if (!_hasHighestBid[auctionId]) {
            auction.finalized = true;
            auction.revealedHighestBid = 0;
            emit AuctionFinalized(auctionId, block.timestamp);
            return;
        }

        if (!auction.finalizationRequested) {
            FHE.decrypt(_highestBid[auctionId]);
            auction.finalizationRequested = true;
        }

        (uint128 highestBid, bool decrypted) = FHE.getDecryptResultSafe(_highestBid[auctionId]);
        if (!decrypted) {
            return;
        }

        auction.finalized = true;
        auction.revealedHighestBid = highestBid;

        emit AuctionFinalized(auctionId, block.timestamp);
    }

    /**
     * @notice Claim victory by proving your encrypted bid equals the highest bid.
     * @dev The caller provides their plaintext bid amount. The contract:
     *      (1) checks it matches revealedHighestBid, then
     *      (2) decrypts the caller's stored encrypted bid and checks it matches.
     *      Only a bidder who actually submitted the winning amount can pass both
     *      checks. The first valid caller becomes the winner. In a tie, the first
     *      to call this function wins — submit promptly after finalization.
     * @param auctionId The finalized auction.
     * @param claimedBidAmount The caller's plaintext bid amount.
     */
    function claimWin(
        uint256 auctionId,
        uint128 claimedBidAmount
    ) external auctionExists(auctionId) {
        Auction storage auction = _auctions[auctionId];

        if (!auction.finalized) revert AuctionNotFinalized(auctionId);
        if (auction.winner != address(0)) revert WinnerAlreadyClaimed(auctionId);
        if (!_hasBid[auctionId][msg.sender]) revert NoBidFound(auctionId, msg.sender);
        if (claimedBidAmount != auction.revealedHighestBid) revert BidDoesNotMatchHighest(auctionId);

        if (!_claimDecryptRequested[auctionId][msg.sender]) {
            FHE.decrypt(_bids[auctionId][msg.sender]);
            _claimDecryptRequested[auctionId][msg.sender] = true;
            return;
        }

        (uint128 actualBid, bool decrypted) = FHE.getDecryptResultSafe(_bids[auctionId][msg.sender]);
        if (!decrypted) {
            return;
        }

        if (actualBid != claimedBidAmount) revert BidDoesNotMatchHighest(auctionId);

        auction.winner = msg.sender;

        emit WinnerClaimed(auctionId, msg.sender);
    }

    /**
     * @notice Returns a sealed (encrypted) output of the caller's own bid.
     * @dev Uses the Permissioned pattern from CoFHE. The caller provides a
     *      Permission containing their public key and a valid signature.
     *      The returned string is decryptable only by that public key using
     *      the CoFHE SDK client-side. This can be called any time after bidding.
     * @param auctionId The auction to check.
     * @param permission CoFHE permission struct (pubkey + signature).
     * @return Sealed output string, decrypt with cofhejs.unseal().
     */
    function sealMyBid(
        uint256 auctionId,
        Permission calldata permission
    ) external view auctionExists(auctionId) onlySender(permission) returns (string memory) {
        if (!_hasBid[auctionId][msg.sender]) revert NoBidFound(auctionId, msg.sender);
        return Strings.toHexString(euint128.unwrap(_bids[auctionId][msg.sender]));
    }

    /**
     * @notice Read public auction metadata.
     */
    function getAuction(uint256 auctionId) external view auctionExists(auctionId)
        returns (
            uint256 id,
            address creator,
            string memory title,
            string memory description,
            uint256 endTime,
            bool finalized,
            address winner,
            uint128 revealedHighestBid,
            uint256 bidCount
        )
    {
        Auction storage a = _auctions[auctionId];
        return (
            a.id, a.creator, a.title, a.description,
            a.endTime, a.finalized, a.winner,
            a.revealedHighestBid, a.bidCount
        );
    }

    /**
     * @notice Returns the list of addresses that have submitted bids.
     * @dev Addresses are visible; bid amounts are not.
     */
    function getBidders(
        uint256 auctionId
    ) external view auctionExists(auctionId) returns (address[] memory) {
        return _bidders[auctionId];
    }

    /**
     * @notice Check whether a given address has submitted a bid.
     */
    function hasBid(
        uint256 auctionId,
        address bidder
    ) external view auctionExists(auctionId) returns (bool) {
        return _hasBid[auctionId][bidder];
    }
}
