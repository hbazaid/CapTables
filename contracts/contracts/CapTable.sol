// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/// @title CapTable
/// @author GPT
/// @notice Manages share classes and stakeholder positions for an on-chain cap table.
contract CapTable is Ownable {
    using EnumerableSet for EnumerableSet.UintSet;
    using EnumerableSet for EnumerableSet.AddressSet;

    struct ShareClassData {
        string name;
        uint256 authorized;
        uint256 issued;
        string currency;
        bool transferrable;
    }

    struct VestingSchedule {
        uint64 start;
        uint64 cliff;
        uint64 end;
    }

    struct Holding {
        uint256 total;
        VestingSchedule vesting;
        bool hasVesting;
        bool exists;
    }

    struct ShareClassView {
        uint256 id;
        ShareClassData data;
    }

    struct HolderPositionView {
        uint256 shareClassId;
        uint256 total;
        VestingSchedule vesting;
        bool hasVesting;
    }

    uint256 private _nextShareClassId = 1;

    mapping(uint256 => ShareClassData) private _shareClasses;
    mapping(uint256 => bool) private _shareClassExists;
    EnumerableSet.UintSet private _shareClassIds;

    mapping(address => mapping(uint256 => Holding)) private _holdings;
    mapping(address => EnumerableSet.UintSet) private _holderShareClasses;
    EnumerableSet.AddressSet private _holderAddresses;

    event ShareClassCreated(uint256 indexed shareClassId, string name, uint256 authorized, string currency, bool transferrable);
    event ShareClassAuthorizationUpdated(uint256 indexed shareClassId, uint256 authorized);
    event ShareClassTransferabilityUpdated(uint256 indexed shareClassId, bool transferrable);
    event SharesIssued(address indexed to, uint256 indexed shareClassId, uint256 amount);
    event SharesBurned(address indexed from, uint256 indexed shareClassId, uint256 amount);
    event SharesTransferred(address indexed from, address indexed to, uint256 indexed shareClassId, uint256 amount);
    event VestingUpdated(address indexed holder, uint256 indexed shareClassId, VestingSchedule vesting, bool hasVesting);

    error ShareClassNotFound(uint256 shareClassId);
    error InvalidShareClassName();
    error InvalidCurrencySymbol();
    error AuthorizationTooLow(uint256 authorized, uint256 required);
    error RecipientIsZeroAddress();
    error AmountMustBeGreaterThanZero();
    error InsufficientBalance(uint256 available, uint256 required);
    error HoldingNotFound(address holder, uint256 shareClassId);
    error TransfersDisabled(uint256 shareClassId);
    error UnauthorizedTransfer(address caller, address from);
    error InvalidVestingWindow();

    constructor(address initialOwner) Ownable(initialOwner) {}

    // ------------------------------------------------------------------------------------------
    // Share class management
    // ------------------------------------------------------------------------------------------

    function createShareClass(string memory name, uint256 authorized, string memory currency, bool transferrable)
        external
        onlyOwner
        returns (uint256)
    {
        if (bytes(name).length == 0) {
            revert InvalidShareClassName();
        }
        if (bytes(currency).length == 0 || bytes(currency).length > 10) {
            revert InvalidCurrencySymbol();
        }
        if (authorized == 0) {
            revert AuthorizationTooLow(0, 1);
        }

        uint256 shareClassId = _nextShareClassId++;
        _shareClasses[shareClassId] = ShareClassData({
            name: name,
            authorized: authorized,
            issued: 0,
            currency: currency,
            transferrable: transferrable
        });
        _shareClassExists[shareClassId] = true;
        _shareClassIds.add(shareClassId);

        emit ShareClassCreated(shareClassId, name, authorized, currency, transferrable);
        return shareClassId;
    }

    function updateShareClassAuthorization(uint256 shareClassId, uint256 newAuthorized) external onlyOwner {
        ShareClassData storage shareClass = _getShareClassOrRevert(shareClassId);
        if (newAuthorized < shareClass.issued) {
            revert AuthorizationTooLow(newAuthorized, shareClass.issued);
        }
        shareClass.authorized = newAuthorized;
        emit ShareClassAuthorizationUpdated(shareClassId, newAuthorized);
    }

    function setShareClassTransferability(uint256 shareClassId, bool transferrable) external onlyOwner {
        ShareClassData storage shareClass = _getShareClassOrRevert(shareClassId);
        if (shareClass.transferrable == transferrable) {
            return;
        }
        shareClass.transferrable = transferrable;
        emit ShareClassTransferabilityUpdated(shareClassId, transferrable);
    }

    function getShareClass(uint256 shareClassId) external view returns (ShareClassData memory) {
        ShareClassData memory shareClass = _shareClasses[shareClassId];
        if (!_shareClassExists[shareClassId]) {
            revert ShareClassNotFound(shareClassId);
        }
        return shareClass;
    }

    function getAllShareClasses() external view returns (ShareClassView[] memory) {
        uint256 length = _shareClassIds.length();
        ShareClassView[] memory classes = new ShareClassView[](length);
        for (uint256 i = 0; i < length; i++) {
            uint256 id = _shareClassIds.at(i);
            classes[i] = ShareClassView({id: id, data: _shareClasses[id]});
        }
        return classes;
    }

    function shareClassCount() external view returns (uint256) {
        return _shareClassIds.length();
    }

    // ------------------------------------------------------------------------------------------
    // Holder management
    // ------------------------------------------------------------------------------------------

    function issueShares(address to, uint256 shareClassId, uint256 amount, VestingSchedule calldata vesting, bool hasVesting)
        external
        onlyOwner
    {
        if (to == address(0)) {
            revert RecipientIsZeroAddress();
        }
        if (amount == 0) {
            revert AmountMustBeGreaterThanZero();
        }

        ShareClassData storage shareClass = _getShareClassOrRevert(shareClassId);
        shareClass.issued += amount;
        if (shareClass.issued > shareClass.authorized) {
            revert AuthorizationTooLow(shareClass.authorized, shareClass.issued);
        }

        Holding storage holding = _holdings[to][shareClassId];
        if (!holding.exists) {
            holding.exists = true;
            _holderShareClasses[to].add(shareClassId);
            _holderAddresses.add(to);
        }
        holding.total += amount;
        if (hasVesting) {
            _validateVesting(vesting);
            holding.vesting = vesting;
            holding.hasVesting = true;
        }

        emit SharesIssued(to, shareClassId, amount);
        if (hasVesting) {
            emit VestingUpdated(to, shareClassId, vesting, true);
        }
    }

    function updateVesting(
        address holder,
        uint256 shareClassId,
        VestingSchedule calldata vesting,
        bool hasVesting
    ) external onlyOwner {
        Holding storage position = _getHoldingOrRevert(holder, shareClassId);
        if (hasVesting) {
            _validateVesting(vesting);
            position.vesting = vesting;
            position.hasVesting = true;
        } else {
            position.hasVesting = false;
            position.vesting = VestingSchedule({start: 0, cliff: 0, end: 0});
        }

        emit VestingUpdated(holder, shareClassId, position.vesting, position.hasVesting);
    }

    function burnShares(address from, uint256 shareClassId, uint256 amount) external onlyOwner {
        if (amount == 0) {
            revert AmountMustBeGreaterThanZero();
        }

        ShareClassData storage shareClass = _getShareClassOrRevert(shareClassId);
        Holding storage holding = _getHoldingOrRevert(from, shareClassId);

        if (holding.total < amount) {
            revert InsufficientBalance(holding.total, amount);
        }

        holding.total -= amount;
        shareClass.issued -= amount;
        _pruneEmptyHolding(from, shareClassId, holding);

        emit SharesBurned(from, shareClassId, amount);
    }

    function transferShares(address from, address to, uint256 shareClassId, uint256 amount) external {
        if (to == address(0)) {
            revert RecipientIsZeroAddress();
        }
        if (amount == 0) {
            revert AmountMustBeGreaterThanZero();
        }

        ShareClassData storage shareClass = _getShareClassOrRevert(shareClassId);
        if (msg.sender != owner()) {
            if (!shareClass.transferrable) {
                revert TransfersDisabled(shareClassId);
            }
            if (msg.sender != from) {
                revert UnauthorizedTransfer(msg.sender, from);
            }
        }

        Holding storage fromHolding = _getHoldingOrRevert(from, shareClassId);
        if (fromHolding.total < amount) {
            revert InsufficientBalance(fromHolding.total, amount);
        }

        fromHolding.total -= amount;
        _pruneEmptyHolding(from, shareClassId, fromHolding);

        Holding storage toHolding = _holdings[to][shareClassId];
        if (!toHolding.exists) {
            toHolding.exists = true;
            _holderShareClasses[to].add(shareClassId);
            _holderAddresses.add(to);
        }
        toHolding.total += amount;

        emit SharesTransferred(from, to, shareClassId, amount);
    }

    // ------------------------------------------------------------------------------------------
    // Views
    // ------------------------------------------------------------------------------------------

    function balanceOf(address holder, uint256 shareClassId) external view returns (uint256) {
        Holding storage holding = _holdings[holder][shareClassId];
        return holding.total;
    }

    function getHolding(address holder, uint256 shareClassId) external view returns (HolderPositionView memory) {
        Holding storage holding = _holdings[holder][shareClassId];
        if (!holding.exists) {
            return HolderPositionView({
                shareClassId: shareClassId,
                total: 0,
                vesting: VestingSchedule({start: 0, cliff: 0, end: 0}),
                hasVesting: false
            });
        }
        return HolderPositionView({
            shareClassId: shareClassId,
            total: holding.total,
            vesting: holding.vesting,
            hasVesting: holding.hasVesting
        });
    }

    function getHolderPositions(address holder) external view returns (HolderPositionView[] memory) {
        uint256 length = _holderShareClasses[holder].length();
        HolderPositionView[] memory positions = new HolderPositionView[](length);
        for (uint256 i = 0; i < length; i++) {
            uint256 shareClassId = _holderShareClasses[holder].at(i);
            Holding storage holding = _holdings[holder][shareClassId];
            positions[i] = HolderPositionView({
                shareClassId: shareClassId,
                total: holding.total,
                vesting: holding.vesting,
                hasVesting: holding.hasVesting
            });
        }
        return positions;
    }

    function listHolders() external view returns (address[] memory) {
        return _holderAddresses.values();
    }

    // ------------------------------------------------------------------------------------------
    // Internal helpers
    // ------------------------------------------------------------------------------------------

    function _getShareClassOrRevert(uint256 shareClassId) private view returns (ShareClassData storage shareClass) {
        if (!_shareClassExists[shareClassId]) {
            revert ShareClassNotFound(shareClassId);
        }
        return _shareClasses[shareClassId];
    }

    function _getHoldingOrRevert(address holder, uint256 shareClassId) private view returns (Holding storage holding) {
        holding = _holdings[holder][shareClassId];
        if (!holding.exists || holding.total == 0) {
            revert HoldingNotFound(holder, shareClassId);
        }
    }

    function _pruneEmptyHolding(address holder, uint256 shareClassId, Holding storage holding) private {
        if (holding.total == 0) {
            holding.exists = false;
            holding.hasVesting = false;
            holding.vesting = VestingSchedule({start: 0, cliff: 0, end: 0});

            _holderShareClasses[holder].remove(shareClassId);
            if (_holderShareClasses[holder].length() == 0) {
                _holderAddresses.remove(holder);
            }
        }
    }

    function _validateVesting(VestingSchedule calldata vesting) private pure {
        if (vesting.end == 0) {
            revert InvalidVestingWindow();
        }
        if (vesting.start == 0 || vesting.start > vesting.cliff || vesting.cliff > vesting.end) {
            revert InvalidVestingWindow();
        }
    }
}
