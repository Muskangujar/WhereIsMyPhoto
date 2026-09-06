// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AttestationRegistry — write-once, tamper-evident discovery records
contract AttestationRegistry {
    struct Attestation {
        bytes32 merkleRoot;
        address attester;
        uint64 timestamp;
    }

    /// recordId => Attestation
    mapping(bytes32 => Attestation) private _attestations;

    event Attested(
        bytes32 indexed recordId,
        bytes32 merkleRoot,
        address attester,
        uint256 timestamp
    );

    /// @notice Record a discovery. Reverts if recordId already exists (write-once).
    function attest(bytes32 recordId, bytes32 merkleRoot) external {
        require(
            _attestations[recordId].timestamp == 0,
            "AttestationRegistry: already attested"
        );
        require(merkleRoot != bytes32(0), "AttestationRegistry: zero merkle root");

        _attestations[recordId] = Attestation({
            merkleRoot: merkleRoot,
            attester: msg.sender,
            timestamp: uint64(block.timestamp)
        });

        emit Attested(recordId, merkleRoot, msg.sender, block.timestamp);
    }

    /// @notice Retrieve an attestation by recordId.
    function getAttestation(bytes32 recordId)
        external
        view
        returns (
            bytes32 merkleRoot,
            address attester,
            uint64 timestamp
        )
    {
        Attestation memory a = _attestations[recordId];
        return (a.merkleRoot, a.attester, a.timestamp);
    }
}
