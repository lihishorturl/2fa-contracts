const { expect } = require('chai');
const { MerkleTree } = require('merkletreejs')
const keccak256 = require('keccak256')

const slotsPackage = 1;
const defaultSlots = 3;
const salesStatus = true;
const mintStatus = true;

describe('Uni2fa contract', () => {
    let Uni2fa, uni2fa, owner, addr1, addr2, tree;
    const price = 1000000000000000;
    const quantity = 1;

    beforeEach(async () => {
        [owner, addr1, addr2, _] = await ethers.getSigners();
        let addresses = [
            addr1.address,
            owner.address
        ];
        const nodes = addresses.map(addr => keccak256(addr));
        tree = new MerkleTree(nodes, keccak256, { sortPairs: true });
        root = tree.getHexRoot();

        Uni2fa = await ethers.getContractFactory('Uni2fa');
        uni2fa = await upgrades.deployProxy(Uni2fa, [price, slotsPackage, defaultSlots, salesStatus, mintStatus, root], { initializer: 'initialize' });
        await uni2fa.deployed();
    })

    describe('Deployment', () => {
        it('Should set the right owner', async () => {
            expect(await uni2fa.owner()).to.equal(owner.address);
        });

        it('Should get balance by right owner', async () => {
            expect(await uni2fa.connect(owner.address).balance()).to.equal(0);
        });

        it('Should fail get balance by not owner', async () => {
            await expect(
                uni2fa.connect(addr1).balance()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it('Should fail toggleSaleStatus by not owner', async () => {
            await expect(
                uni2fa.connect(addr1).toggleSaleStatus()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it('Should success toggleSaleStatus by owner', async () => {
            expect(
                await uni2fa.connect(owner).getStatus()
            ).to.be.equal(true);
            await uni2fa.connect(owner).toggleSaleStatus();
            expect(
                await uni2fa.connect(owner).getStatus()
            ).to.be.equal(false);
        });

        it('Should fail setPrice by not owner', async () => {
            await expect(
                uni2fa.connect(addr1).setPrice(2000000000000000)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it('Should success setQuantity by owner', async () => {
            expect(
                await uni2fa.connect(owner).getDefaultSlots()
            ).to.be.equal(defaultSlots);
            uni2fa.connect(owner).setDefaultSlots(5)
            expect(
                await uni2fa.connect(owner).getDefaultSlots()
            ).to.be.equal(5);
        });

        it('Should fail setQuantity with zero number', async () => {
            await expect(
                uni2fa.connect(owner).setQuantity(0)
            ).to.be.revertedWith("invalid number");
        });

        it('Should success setPrice by owner', async () => {
            expect(
                await uni2fa.connect(owner).getPrice()
            ).to.be.equal(price);
            let newPrice = 2000000000000000;
            await uni2fa.connect(owner).setPrice(newPrice);
            expect(
                await uni2fa.connect(owner).getPrice()
            ).to.be.equal(newPrice);
        });

        it('Should success setRoot by owner', async () => {
            let addresses = [
                addr1.address,
                addr2.address
            ];
            const nodes = addresses.map(addr => keccak256(addr));
            tree = new MerkleTree(nodes, keccak256, { sortPairs: true });
            let root = tree.getHexRoot();
            await uni2fa.connect(owner).setRoot(root);
            expect(
              await uni2fa.connect(owner).getRoot()
            ).to.be.equal(root);
        });

        it('Should success get index by owner', async () => {
            let note1 = ethers.utils.formatBytes32String('note1')
            await uni2fa.connect(addr1).mint('test1', note1);
            expect(
                await uni2fa.connect(addr1).getMintedNumber()
            ).to.be.equal(1);

            expect(
                await uni2fa.connect(owner).getIndex()
            ).to.be.equal(1);
        });

        it('Should success get address data by owner', async () => {
            let note1 = ethers.utils.formatBytes32String('note1')
            await uni2fa.connect(addr1).mint('test1', note1);
            expect(
                await uni2fa.connect(addr1).getMintedNumber()
            ).to.be.equal(1);

            const data = await uni2fa.connect(owner).getData(addr1.address)
            expect(
                data[0]
            ).to.be.equal(defaultSlots); // 初始贈送 3 個
            expect(
                data[1]
            ).to.be.equal(1);
        });

        it('Should success get ownership by owner', async () => {
            let test1 = ethers.utils.formatBytes32String('test1')
            let note1 = ethers.utils.formatBytes32String('note1')
            await uni2fa.connect(addr1).mint(test1, note1);
            expect(
                await uni2fa.connect(addr1).getMintedNumber()
            ).to.be.equal(1);

            const data = await uni2fa.connect(owner).getOwnerships(0)

            expect(data[0]).to.be.equal(addr1.address);
        });
    });

    describe('Everyone Can', () => {
        it('Should can get Status', async () => {
            expect(
                await uni2fa.connect(addr1).getStatus()
            ).to.be.equal(true);
        });

        it('Should can get price', async () => {
            expect(
                await uni2fa.connect(addr1).getPrice()
            ).to.be.equal(price);
        });

        it('Should can get slot package or get quantity', async () => {
            expect(
                await uni2fa.connect(addr1).getQuantity()
            ).to.be.equal(quantity);
        });

        it('Should can get white list check success', async () => {
            const leaf = keccak256(addr1.address);
            const buf2hex = x => '0x' + x.toString('hex')
            const hexproof = tree.getProof(leaf).map(x => buf2hex(x.data))
            let result = await uni2fa.connect(addr1).getProof(hexproof);

            expect(result).to.be.equal(true);
        });

        it('Should can get white list check fail', async () => {
            const leaf = keccak256(addr2.address);
            const buf2hex = x => '0x' + x.toString('hex')
            const hexproof = tree.getProof(leaf).map(x => buf2hex(x.data))

            await expect(
              uni2fa.connect(addr2).getProof(hexproof)
            ).to.be.revertedWith("Invalid proof");
        });

        it('Should cannot mint with disabled mint status', async () => {
            uni2fa.connect(owner).toggleMintStatus();
            let test1 = ethers.utils.formatBytes32String('test1');
            let note1 = ethers.utils.formatBytes32String('note1');
            await expect(
                uni2fa.connect(addr1).mint(test1, note1)
            ).to.be.revertedWith("Currently unavailable for minting.");
            expect(
                await uni2fa.connect(addr1).getMintedNumber()
            ).to.be.equal(0);
        });

        it('Should can mint with secret', async () => {
            let note1 = ethers.utils.formatBytes32String('note1')
            await uni2fa.connect(addr1).mint('test1', note1);
            expect(
                await uni2fa.connect(addr1).getMintedNumber()
            ).to.be.equal(1);
            expect(
                await uni2fa.connect(addr1).getSlotNumber()
            ).to.be.equal(defaultSlots);
            expect(
                await uni2fa.connect(addr1).getSecret(0)
            ).to.be.equal('test1');
            let note2 = ethers.utils.formatBytes32String('note2')
            await uni2fa.connect(addr1).mint('test2', note2);
            expect(
                await uni2fa.connect(addr1).getMintedNumber()
            ).to.be.equal(2);
            expect(
                await uni2fa.connect(addr1).getSlotNumber()
            ).to.be.equal(defaultSlots);
            expect(
                await uni2fa.connect(addr1).getSecret(1)
            ).to.be.equal('test2');

            const ids = await uni2fa.connect(addr1).getTokenIds();
            expect(ids[0]).to.be.equal(0);
            expect(ids[1]).to.be.equal(1);
        });

        it('Should can update with secret', async () => {
            let note1 = ethers.utils.formatBytes32String('note1')
            await uni2fa.connect(addr1).mint('test1', note1);
            expect(
                await uni2fa.connect(addr1).getMintedNumber()
            ).to.be.equal(1);
            expect(
                await uni2fa.connect(addr1).getSlotNumber()
            ).to.be.equal(defaultSlots);
            expect(
                await uni2fa.connect(addr1).getSecret(0)
            ).to.be.equal('test1');
            expect(
                await uni2fa.connect(addr1).getNote(0)
            ).to.be.equal(note1);
            let note2 = ethers.utils.formatBytes32String('note2')
            await uni2fa.connect(addr1).update(0, 'test2', note2);
            expect(
                await uni2fa.connect(addr1).getMintedNumber()
            ).to.be.equal(1);
            expect(
                await uni2fa.connect(addr1).getSlotNumber()
            ).to.be.equal(defaultSlots);
            expect(
                await uni2fa.connect(addr1).getSecret(0)
            ).to.be.equal('test2');
            expect(
                await uni2fa.connect(addr1).getNote(0)
            ).to.be.equal(note2);

            const ids = await uni2fa.connect(addr1).getTokenIds();
            expect(ids[0]).to.be.equal(0);
            expect(ids.length).to.be.equal(1);
        });

        it('Should fail update by not owner', async () => {
            let note1 = ethers.utils.formatBytes32String('note1')

            await uni2fa.connect(addr1).mint('test1', note1);
            expect(
                await uni2fa.connect(addr1).getMintedNumber()
            ).to.be.equal(1);
            expect(
                await uni2fa.connect(addr1).getSlotNumber()
            ).to.be.equal(defaultSlots);
            expect(
                await uni2fa.connect(addr1).getSecret(0)
            ).to.be.equal('test1');

            let note2 = ethers.utils.formatBytes32String('note2')
            await expect(
                uni2fa.connect(addr2).update(0, 'test2', note2)
            ).to.be.revertedWith("Only owner can update");
            expect(
                await uni2fa.connect(addr1).getMintedNumber()
            ).to.be.equal(1);
            expect(
                await uni2fa.connect(addr1).getSlotNumber()
            ).to.be.equal(defaultSlots);
            expect(
                await uni2fa.connect(addr1).getSecret(0)
            ).to.be.equal('test1');
        });

        it('Should fail mint without slots', async () => {

            let note1 = ethers.utils.formatBytes32String('note1')
            let test1 = ethers.utils.formatBytes32String('test1')

            for (let i = 0; i < 3; i++) {
                await uni2fa.connect(addr1).mint(test1, note1);
            }

            let note3 = ethers.utils.formatBytes32String('note3')
            await expect(
                uni2fa.connect(addr1).mint('test3', note3)
            ).to.be.revertedWith("Need more slots");
        });

        it('Should fail get secret by others', async () => {
            let note1 = ethers.utils.formatBytes32String('note1')

            await uni2fa.connect(addr1).mint('test1', note1);
            await expect(
                uni2fa.connect(addr2).getSecret(0)
            ).to.be.revertedWith("Only creator can get secret");
        });

        it('Should success mint times', async () => {
            const overrides = {
                value: ethers.utils.parseEther("0.003"),
            }
            for (let i = 0; i < 252; i++) {
                await uni2fa.connect(addr1).punch(overrides);
            }
            let note1 = ethers.utils.formatBytes32String('note1')
            let test1 = ethers.utils.formatBytes32String('test1')

            for (let i = 0; i < 255; i++) {
                await uni2fa.connect(addr1).mint(test1, note1);
            }
            expect(
                await uni2fa.connect(addr1).getMintedNumber()
            ).to.be.equal(255);

            await expect(
                uni2fa.connect(addr1).mint('test24', note1)
            ).to.be.revertedWith("Need more slots");
        });

        it('Should success punch', async () => {
            const overrides = {
                value: ethers.utils.parseEther("0.001"),
            }
            await uni2fa.connect(addr1).punch(overrides);
            expect(
                await uni2fa.connect(addr1).getSlotNumber()
            ).to.be.equal(defaultSlots + slotsPackage);
        });

        it('Should success use list punch', async () => {
            const overrides = {
                value: ethers.utils.parseEther("0.0005"),
            }
            const leaf = keccak256(addr1.address);
            const buf2hex = x => '0x' + x.toString('hex')
            const hexproof = tree.getProof(leaf).map(x => buf2hex(x.data))

            await uni2fa.connect(addr1).listPunch(hexproof, overrides);

            expect(
              await uni2fa.connect(addr1).getSlotNumber()
            ).to.be.equal(defaultSlots + slotsPackage);
        });

        it('Should fail use list punch with wrong bid', async () => {
            const overrides = {
                value: ethers.utils.parseEther("0.00001"),
            }
            const leaf = keccak256(addr1.address);
            const buf2hex = x => '0x' + x.toString('hex')
            const hexproof = tree.getProof(leaf).map(x => buf2hex(x.data))

            await expect(
              uni2fa.connect(addr1).listPunch(hexproof, overrides)
            ).to.be.revertedWith("Bidding Insufficient");
        });

        it('Should success punch times', async () => {
            const overrides = {
                value: ethers.utils.parseEther("0.003"),
            }
            for (var i = 0; i < 252; i++) {
                await uni2fa.connect(addr1).punch(overrides);
            }
            expect(
                await uni2fa.connect(addr1).getSlotNumber()
            ).to.be.equal(255);

            await expect(
                uni2fa.connect(addr1).punch(overrides)
            ).to.be.revertedWith("Reach the limit of slot number");
        });

        it('Should fail punch without price', async () => {
            await expect(
                uni2fa.connect(addr1).punch()
            ).to.be.revertedWith("Bidding Insufficient");

            const lowerPrice = "0.0003";
            const overrides = {
                value: ethers.utils.parseEther(lowerPrice),
            }
            await expect(
                uni2fa.connect(addr1).punch(overrides)
            ).to.be.revertedWith("Bidding Insufficient");
        });

        it('Should can withdraw', async () => {
            const balance1 = await owner.getBalance();
            const lowerPrice = "0.003";
            const overrides = {
                value: ethers.utils.parseEther(lowerPrice),
            }
            await uni2fa.connect(addr1).punch(overrides);
            await uni2fa.connect(owner).withdraw();
            const balance2 = await owner.getBalance();
            const result = balance2.sub(balance1);
            await expect(
                result.toNumber()
            ).to.be.greaterThan(2962100000000000);
        });

        it('Should cannot get balance if not owner', async () => {
            await expect(
                uni2fa.connect(addr1).balance()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it('Should cannot withdraw if not owner', async () => {
            const balance1 = await owner.getBalance();
            const lowerPrice = "0.003";
            const overrides = {
                value: ethers.utils.parseEther(lowerPrice),
            }
            await uni2fa.connect(addr1).punch(overrides);
            await expect(
                uni2fa.connect(addr1).withdraw()
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Test upgrade proxy", async function() {
            const address = uni2fa.address;
            await uni2fa.connect(owner).setPrice('5000000000000000');

            const Uni2faV2 = await ethers.getContractFactory("Uni2fa");
            const upgraded = await upgrades.upgradeProxy(uni2fa.address, Uni2faV2);

            // Address should not change,
            expect(upgraded.address).to.equal(address);

            // Data should still be available.
            expect(await upgraded.getPrice()).to.equal('5000000000000000');
        })
    });
});