const { ethers } = require("ethers");
const { sumTokensExport } = require("../helper/unwrapLPs");

// TODO: Currently using my wallet address as we have yet to deploy to a supported chain
const EOA_ADDRESS = "0xf97752a24D83478acA43B04EF7b28789e1D7EEda";

const OSE_ADDRESS = "0x46c8F67675A3C95cA4D21c282A207D87829C56AA";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const TOKENS_BY_CHAIN = {
  ["goerli"]: {
    WETH: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
    DAI: "0xdc31Ee1784292379Fbb2964b3B9C4124D8F89C60",
    UNI: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
  },
  ["ethereum"]: {
    ETH: ZERO_ADDRESS,
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    MKR: "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2",
    COMP: "0xc00e94Cb662C3520282E6f5717214004A7f26888",
    UNI: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
  },
  ["arbitrum"]: {
    ETH: ZERO_ADDRESS,
    WETH: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    USDC: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    COMP: "0x354A6dA3fcde098F8389cad84b0182725c6C91dE",
    UNI: "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0",
  },
};

module.exports = {
  methodology:
    "TVL counts all of the tokens locked in the Option Settlement Engine for Option/Claim positions.",
  // goerli: {
  //   tvl,
  // },
  ethereum: {
    tvl: sumTokensExport({
      chain: "ethereum",
      owner: EOA_ADDRESS, // TODO: OSE
      tokens: [...Object.values(TOKENS_BY_CHAIN["ethereum"])],
    }),
  },
  arbitrum: {
    tvl: sumTokensExport({
      chain: "arbitrum",
      owner: EOA_ADDRESS, // TODO: OSE
      tokens: [...Object.values(TOKENS_BY_CHAIN["arbitrum"])],
    }),
  },
  hallmarks: [
    // [blockNumber, "eventName, ex: Mainnet Launch"]
  ],
};

// used to mock response for goerli, will remove and replace with sumTokensExport
async function tvl(_unixTimestamp, ethBlock, _chainBlocks, { chain }) {
  const provider = new ethers.providers.JsonRpcProvider(
    "https://rpc.ankr.com/eth_goerli",
    5
  );

  const ethBalance = (
    await provider.getBalance(
      chain === "goerli" ? OSE_ADDRESS : EOA_ADDRESS,
      ethBlock
    )
  ).toString();

  const tokens = TOKENS_BY_CHAIN[chain];
  const promises = Object.entries(tokens).map(
    async ([_symbol, tokenAddress]) => {
      const balance = await getERC20Balance(
        provider,
        tokenAddress,
        ethBlock,
        chain
      );
      return { tokenAddress, balance };
    }
  );

  let erc20Balances = {};

  await Promise.allSettled(promises).then((results) =>
    results.forEach((res) => {
      try {
        const { tokenAddress, balance } = res.value;
        erc20Balances[`${chain}:${tokenAddress}`] = balance;
      } catch (error) {
        //
      }
    })
  );

  const balances = {
    [`${chain}:${ZERO_ADDRESS}`]: ethBalance,
    ...erc20Balances,
  };

  console.log({ balances });

  return balances;
}

async function getERC20Balance(provider, tokenAddress, _ethBlock, chain) {
  const contract = new ethers.Contract(
    tokenAddress,
    [
      "function balanceOf(address owner) view returns (uint256)",
      "function decimals() view returns (uint8)",
    ],
    provider
  );

  const decimals = (await contract.decimals()).toString();
  const balance = await contract.balanceOf(
    chain === "goerli" ? OSE_ADDRESS : EOA_ADDRESS
    // { blockTag: _ethBlock }
  );

  const formattedBalance = ethers.utils.formatUnits(balance, decimals);
  // console.log({ decimals, balance, formattedBalance });

  return formattedBalance;
}
