const fs = require('fs');
const { MerkleTree } = require('merkletreejs')
const keccak256 = require('keccak256')

async function main() {

    const slotsPackage = 3;
    const defaultSlots = 20;
    const refferalQuota = 0;
    const salesStatus = false;
    const mintStatus = false;

    const [deployer] = await ethers.getSigners();
    const chainId = await deployer.getChainId();
    console.log(`Chain Id: ${chainId}`);

    console.log(`Deploying contracts with the account: ${deployer.address} `);
    const balance = await deployer.getBalance();
    console.log(`Account balance: ${balance.toString()}`);

    const prices = {
        // 31337: ethers.BigNumber.from('4000000000000000'),
        // 1: ethers.BigNumber.from('4000000000000000'),
        // 3: ethers.BigNumber.from('4000000000000000'),
        56: ethers.BigNumber.from('30000000000000000'),
        97: ethers.BigNumber.from('30000000000000000'),
        // 137: ethers.BigNumber.from('8000000000000000000'),
        // 80001: ethers.BigNumber.from('8000000000000000000'),
    }

    let addresses = [
        '0x205e68646864167Eb744614048d6C43935CcA8B1',
        '0x26Efd827f012C4D156DC7D97b30f09338a0A8F31',
        '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        '0x31786101b8B76AcF82067256f485Deb60422EAd1',
        '0x75ef9f58f9e7f4ED773214F4af58C4C9afbDA52D',
        '0xEE4Fd383d650b1839F97a79fD954137Dc8D75E3F',
    ];
    const nodes = addresses.map(addr => keccak256(addr));
    let tree = new MerkleTree(nodes, keccak256, { sortPairs: true });
    let root = tree.getHexRoot();

    const price = prices[chainId];
    const Uni2fa = await ethers.getContractFactory('Uni2fa');
    const paramiters = [price, slotsPackage, refferalQuota, defaultSlots, salesStatus, mintStatus, root];
    console.log(paramiters)
    const uni2fa = await upgrades.deployProxy(Uni2fa, paramiters, { initializer: 'initialize' });
    await uni2fa.deployed();
    console.log(`Uni2fa proxy address: ${uni2fa.address}`);

    const data = {
        address: uni2fa.address,
        abi: JSON.parse(uni2fa.interface.format('json'))
    };
    fs.writeFileSync('frontend/src/abis/Uni2fa_' + chainId + '.json', JSON.stringify(data));
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });