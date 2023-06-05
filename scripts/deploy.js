const fs = require('fs');

async function main() {
    const slotsPackage = 1;
    const defaultSlots = 3;
    const salesStatus = true;
    const mintStatus = true;

    const [deployer] = await ethers.getSigners();
    const chainId = await deployer.getChainId();
    console.log(`Chain Id: ${chainId}`);

    console.log(`Deploying contracts with the account: ${deployer.address} `);
    const balance = await deployer.getBalance();
    console.log(`Account balance: ${balance.toString()}`);

    const prices = {
        31337: ethers.BigNumber.from('100000000000000000'), // 100000000000000000 = 0.1 ETH
        56: ethers.BigNumber.from('100000000000000000'), // 100000000000000000 = 0.1 BNB
        97: ethers.BigNumber.from('100000000000000000'), // 100000000000000000 = 0.1 tBNB
    }

    const price = prices[chainId];
    const Uni2fa = await ethers.getContractFactory('Uni2fa');
    const paramiters = [price, slotsPackage, defaultSlots, salesStatus, mintStatus];
    console.log(paramiters)
    const uni2fa = await upgrades.deployProxy(Uni2fa, paramiters, { initializer: 'initialize' });
    await uni2fa.deployed();
    console.log(`Uni2fa proxy address: ${uni2fa.address}`);

    const data = {
        address: uni2fa.address,
        abi: JSON.parse(uni2fa.interface.format('json'))
    };

    fs.unlinkSync('frontend/src/abis/Uni2fa_' + chainId + '.json');
    fs.writeFileSync('frontend/src/abis/Uni2fa_' + chainId + '.json', JSON.stringify(data));
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });