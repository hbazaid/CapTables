import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const VESTING_SAMPLE = {
  start: 100,
  cliff: 200,
  end: 400,
};

async function deployCapTableFixture() {
  const [owner, alice, bob, carol] = await ethers.getSigners();
  const CapTable = await ethers.getContractFactory("CapTable");
  const capTable = await CapTable.deploy(owner.address);
  await capTable.waitForDeployment();

  return { capTable, owner, alice, bob, carol };
}

describe("CapTable", function () {
  describe("Share class management", function () {
    it("creates share classes with sequential identifiers", async function () {
      const { capTable } = await loadFixture(deployCapTableFixture);

      await expect(capTable.createShareClass("Common", 1_000_000, "USD", true))
        .to.emit(capTable, "ShareClassCreated")
        .withArgs(1, "Common", 1_000_000, "USD", true);

      await expect(capTable.createShareClass("Preferred", 500_000, "USD", false))
        .to.emit(capTable, "ShareClassCreated")
        .withArgs(2, "Preferred", 500_000, "USD", false);

      const classes = await capTable.getAllShareClasses();
      expect(classes).to.have.length(2);
      expect(classes[0].id).to.equal(1);
      expect(classes[1].data.transferrable).to.equal(false);
    });

    it("prevents invalid inputs when creating share classes", async function () {
      const { capTable } = await loadFixture(deployCapTableFixture);

      await expect(capTable.createShareClass("", 1_000, "USD", true)).to.be.revertedWithCustomError(
        capTable,
        "InvalidShareClassName",
      );

      await expect(capTable.createShareClass("Common", 0, "USD", true)).to.be.revertedWithCustomError(
        capTable,
        "AuthorizationTooLow",
      );

      await expect(capTable.createShareClass("Common", 1_000, "", true)).to.be.revertedWithCustomError(
        capTable,
        "InvalidCurrencySymbol",
      );
    });

    it("allows increasing authorized shares but not reducing below issued", async function () {
      const { capTable, alice } = await loadFixture(deployCapTableFixture);

      await capTable.createShareClass("Common", 100, "USD", true);
      await capTable.updateShareClassAuthorization(1, 200);
      await capTable.issueShares(alice.address, 1, 150, { start: 0, cliff: 0, end: 0 }, false);

      await expect(capTable.updateShareClassAuthorization(1, 149)).to.be.revertedWithCustomError(
        capTable,
        "AuthorizationTooLow",
      );
    });
  });

  describe("Share issuance", function () {
    it("issues shares and records vesting metadata", async function () {
      const { capTable, alice } = await loadFixture(deployCapTableFixture);
      await capTable.createShareClass("Common", 1_000_000, "USD", true);

      await expect(capTable.issueShares(alice.address, 1, 250_000, VESTING_SAMPLE, true))
        .to.emit(capTable, "SharesIssued")
        .withArgs(alice.address, 1, 250_000);

      const position = await capTable.getHolding(alice.address, 1);
      expect(position.total).to.equal(250_000);
      expect(position.hasVesting).to.equal(true);
      expect(position.vesting.cliff).to.equal(VESTING_SAMPLE.cliff);

      const shareClass = await capTable.getShareClass(1);
      expect(shareClass.issued).to.equal(250_000);
    });

    it("rejects issuances that exceed authorized supply", async function () {
      const { capTable, alice } = await loadFixture(deployCapTableFixture);
      await capTable.createShareClass("Common", 100, "USD", true);

      await expect(capTable.issueShares(alice.address, 1, 101, { start: 0, cliff: 0, end: 0 }, false)).to.be.revertedWithCustomError(
        capTable,
        "AuthorizationTooLow",
      );
    });

    it("rejects issuance to the zero address", async function () {
      const { capTable } = await loadFixture(deployCapTableFixture);
      await capTable.createShareClass("Common", 100, "USD", true);

      await expect(capTable.issueShares(ethers.ZeroAddress, 1, 10, { start: 0, cliff: 0, end: 0 }, false)).to.be.revertedWithCustomError(
        capTable,
        "RecipientIsZeroAddress",
      );
    });

    it("prevents non-owners from issuing shares", async function () {
      const { capTable, alice, bob } = await loadFixture(deployCapTableFixture);
      await capTable.createShareClass("Common", 1_000, "USD", true);

      await expect(
        capTable.connect(alice).issueShares(bob.address, 1, 100, { start: 0, cliff: 0, end: 0 }, false),
      ).to.be.revertedWithCustomError(capTable, "OwnableUnauthorizedAccount");
    });
  });

  describe("Vesting updates", function () {
    it("updates vesting schedules for existing holders", async function () {
      const { capTable, alice } = await loadFixture(deployCapTableFixture);
      await capTable.createShareClass("Common", 1_000, "USD", true);
      await capTable.issueShares(alice.address, 1, 100, { start: 0, cliff: 0, end: 0 }, false);

      await expect(capTable.updateVesting(alice.address, 1, VESTING_SAMPLE, true))
        .to.emit(capTable, "VestingUpdated")
        .withArgs(
          alice.address,
          1,
          (vesting: { start: bigint; cliff: bigint; end: bigint }) => {
            expect(vesting.start).to.equal(BigInt(VESTING_SAMPLE.start));
            expect(vesting.cliff).to.equal(BigInt(VESTING_SAMPLE.cliff));
            expect(vesting.end).to.equal(BigInt(VESTING_SAMPLE.end));
            return true;
          },
          true,
        );

      const holding = await capTable.getHolding(alice.address, 1);
      expect(holding.hasVesting).to.equal(true);
      expect(holding.vesting.end).to.equal(VESTING_SAMPLE.end);
    });

    it("disallows vesting updates for missing holdings", async function () {
      const { capTable, alice } = await loadFixture(deployCapTableFixture);
      await capTable.createShareClass("Common", 1_000, "USD", true);

      await expect(capTable.updateVesting(alice.address, 1, VESTING_SAMPLE, true)).to.be.revertedWithCustomError(
        capTable,
        "HoldingNotFound",
      );
    });
  });

  describe("Transfers and burns", function () {
    it("allows holders to transfer when share class is transferrable", async function () {
      const { capTable, alice, bob } = await loadFixture(deployCapTableFixture);
      await capTable.createShareClass("Common", 1_000, "USD", true);
      await capTable.issueShares(alice.address, 1, 400, { start: 0, cliff: 0, end: 0 }, false);

      await expect(capTable.connect(alice).transferShares(alice.address, bob.address, 1, 150))
        .to.emit(capTable, "SharesTransferred")
        .withArgs(alice.address, bob.address, 1, 150);

      const aliceBalance = await capTable.balanceOf(alice.address, 1);
      const bobBalance = await capTable.balanceOf(bob.address, 1);
      expect(aliceBalance).to.equal(250);
      expect(bobBalance).to.equal(150);
    });

    it("blocks holder transfers when share class is non-transferrable", async function () {
      const { capTable, alice, bob } = await loadFixture(deployCapTableFixture);
      await capTable.createShareClass("Restricted", 1_000, "USD", false);
      await capTable.issueShares(alice.address, 1, 200, { start: 0, cliff: 0, end: 0 }, false);

      await expect(
        capTable.connect(alice).transferShares(alice.address, bob.address, 1, 50),
      ).to.be.revertedWithCustomError(capTable, "TransfersDisabled");
    });

    it("allows owner to move shares even if transfers are disabled", async function () {
      const { capTable, alice, bob } = await loadFixture(deployCapTableFixture);
      await capTable.createShareClass("Restricted", 1_000, "USD", false);
      await capTable.issueShares(alice.address, 1, 200, { start: 0, cliff: 0, end: 0 }, false);

      await expect(capTable.transferShares(alice.address, bob.address, 1, 40))
        .to.emit(capTable, "SharesTransferred")
        .withArgs(alice.address, bob.address, 1, 40);
    });

    it("burns shares and removes empty holders", async function () {
      const { capTable, alice } = await loadFixture(deployCapTableFixture);
      await capTable.createShareClass("Common", 1_000, "USD", true);
      await capTable.issueShares(alice.address, 1, 120, { start: 0, cliff: 0, end: 0 }, false);

      await expect(capTable.burnShares(alice.address, 1, 120))
        .to.emit(capTable, "SharesBurned")
        .withArgs(alice.address, 1, 120);

      const holders = await capTable.listHolders();
      expect(holders).to.not.include(alice.address);
    });
  });

  describe("Reporting", function () {
    it("returns complete positions for a holder", async function () {
      const { capTable, alice } = await loadFixture(deployCapTableFixture);
      await capTable.createShareClass("Common", 1_000, "USD", true);
      await capTable.createShareClass("Preferred", 500, "USD", true);

      await capTable.issueShares(alice.address, 1, 300, { start: 0, cliff: 0, end: 0 }, false);
      await capTable.issueShares(alice.address, 2, 200, VESTING_SAMPLE, true);

      const positions = await capTable.getHolderPositions(alice.address);
      expect(positions).to.have.length(2);
      expect(positions[0].total + positions[1].total).to.equal(500);
      expect(positions[1].hasVesting).to.equal(true);
    });
  });
});
