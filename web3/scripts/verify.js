const { run } = require("hardhat");

async function main() {
  const contracts = [
    {
      name: "BlumeToken",
      address: "0x3787831C45898677A07426b51EA3053c8DB32Dd4",
      args: ["0xd8bfF039909Ab3b82D364439c01Fa0A48F52Da73"] // Initial holder (deployer)
    },
    {
      name: "WETH",
      address: "0x2f9aAd71531651432deCB6f34f0d124F7136227A",
      args: [] // Typically no constructor args
    },
    {
      name: "BlumeSwapFactory",
      address: "0xD4F55d0Ad19c3BE0A7D5EE7e0512a00129Cd73c9",
      args: ["0xd8bfF039909Ab3b82D364439c01Fa0A48F52Da73"] // Fee recipient
    },
    {
      name: "BlumeSwapRouter",
      address: "0x56E525384313947106bd3BF0555d15510C6E0326",
      args: [
        "0xD4F55d0Ad19c3BE0A7D5EE7e0512a00129Cd73c9", // Factory address
        "0x2f9aAd71531651432deCB6f34f0d124F7136227A"  // WETH address
      ]
    },
    {
      name: "PriceOracle",
      address: "0xb185335531Fd45Ca58E693a9ADebE0c00c074f72",
      args: [] // May need args if custom config
    },
    {
      name: "BlumeStaking",
      address: "0xD4F9Aa9F4Efe75c63877223EC43039F7958499bE",
      args: [
        "0x3787831C45898677A07426b51EA3053c8DB32Dd4", // BLX token
        "0x18926Bc1d53f6C756c18a46Da5F4860784F2B650", // sBLX token
        Math.floor(Date.now() / 1000) + 86400 // Start time (adjust as needed)
      ]
    },
    {
      name: "BlumeStakingHub",
      address: "0x5308b68C9c64C8D1d055Ee8F538156C8038C34c0",
      args: [
        "0xD4F9Aa9F4Efe75c63877223EC43039F7958499bE", // BlumeStaking
        "0x3787831C45898677A07426b51EA3053c8DB32Dd4"  // BLX token
      ]
    },
    {
      name: "StakedBlumeToken",
      address: "0x18926Bc1d53f6C756c18a46Da5F4860784F2B650",
      args: ["0xD4F9Aa9F4Efe75c63877223EC43039F7958499bE"] // Staking contract
    },
    {
      name: "BlumeStakingHubFactory",
      address: "0x2230f83DB74a0C91405ea559b44e3E94d535045a",
      args: [] // May need implementation address
    },
    {
      name: "BlumeVault",
      address: "0x1435870A6152825Bc9043829C376fc2EEBcA770A",
      args: [
        "0x3787831C45898677A07426b51EA3053c8DB32Dd4", // BLX token
        "0x5676F52bE459B58F42ff80D9e13D3Bbe48094605"  // YieldFarmer
      ]
    },
    {
      name: "BlumeVaultController",
      address: "0xe998Dd9154a68CCB171A7b247f84c642640EFBa6",
      args: ["0x1435870A6152825Bc9043829C376fc2EEBcA770A"] // Vault address
    },
    {
      name: "BLX_WETH_Pair",
      address: "0x7aB182A1a90bcDb426BD3284bCF45641a254590e",
      args: [] // Usually created by factory
    },
    {
      name: "BlumeStakingDeFiIntegration",
      address: "0xc06697954F5eC884045A7B68C0c025FE456fd21B",
      args: [
        "0xD4F9Aa9F4Efe75c63877223EC43039F7958499bE", // Staking
        "0x3787831C45898677A07426b51EA3053c8DB32Dd4"  // BLX token
      ]
    },
    {
      name: "BlumeYieldFarmer",
      address: "0x5676F52bE459B58F42ff80D9e13D3Bbe48094605",
      args: [
        "0x3787831C45898677A07426b51EA3053c8DB32Dd4", // BLX token
        "0x7aB182A1a90bcDb426BD3284bCF45641a254590e", // BLX-WETH Pair
        "0xd8bfF039909Ab3b82D364439c01Fa0A48F52Da73"  // Treasury
      ]
    }
  ];

  for (const contract of contracts) {
    console.log(`Verifying ${contract.name} at ${contract.address}...`);
    
    try {
      await run("verify:verify", {
        address: contract.address,
        constructorArguments: contract.args,
        network: "hoodi"
      });
      console.log(`${contract.name} verified successfully!`);
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log(`${contract.name} already verified`);
      } else {
        console.error(`Error verifying ${contract.name}:`, error.message);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });