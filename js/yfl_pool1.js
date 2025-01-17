$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    const YFL_POOL1 = new ethers.Contract(YFL_POOL_1_ADDR, YGOV_BPT_STAKING_POOL_ABI, App.provider);
    const YFL_LINK_BALANCER_POOL = new ethers.Contract(YFL_LINK_BPT_TOKEN_ADDR, BALANCER_POOL_ABI, App.provider);
    const YFL_LINK_BPT_TOKEN_CONTRACT = new ethers.Contract(YFL_LINK_BPT_TOKEN_ADDR, ERC20_ABI, App.provider);

    const stakedBPTAmount = await YFL_POOL1.balanceOf(App.YOUR_ADDRESS) / 1e18;
    const earnedYFL = await YFL_POOL1.earned(App.YOUR_ADDRESS) / 1e18;
    const totalBPTAmount = await YFL_LINK_BALANCER_POOL.totalSupply() / 1e18;
    const totalStakedBPTAmount = await YFL_LINK_BPT_TOKEN_CONTRACT.balanceOf(YFL_POOL_1_ADDR) / 1e18;
    const totalYFLAmount = await YFL_LINK_BALANCER_POOL.getBalance(YFL_TOKEN_ADDR) / 1e18;
    const totalLINKAmount = await YFL_LINK_BALANCER_POOL.getBalance(LINK_TOKEN_ADDR) / 1e18;

    const YFLPerBPT = totalYFLAmount / totalBPTAmount;
    const LINKPerBPT = totalLINKAmount / totalBPTAmount;

    // Find out reward rate
    const weeklyReward = await get_synth_weekly_rewards(YFL_POOL1);
    const nextHalving = await getPeriodFinishForReward(YFL_POOL1);
    const rewardPerToken = weeklyReward / totalStakedBPTAmount;

    _print("Finished reading smart contracts... Looking up prices... \n")

    // Look up prices
    const prices = await lookUpPrices(["chainlink"]);
    const LINKPrice = prices["chainlink"].usd;
    const YFLPrice = (await YFL_LINK_BALANCER_POOL.getSpotPrice(LINK_TOKEN_ADDR,YFL_TOKEN_ADDR) / 1e18) * LINKPrice;

    const BPTPrice = YFLPerBPT * YFLPrice + LINKPerBPT * LINKPrice;

    // Finished. Start printing

    _print("========== PRICES ==========")
    _print(`1 YFL   = $${YFLPrice}`);
    _print(`1 LINK  = $${LINKPrice}\n`);
    _print(`1 BPT   = [${YFLPerBPT} YFL, ${LINKPerBPT} LINK]`);
    _print(`        = ${toDollar(YFLPerBPT * YFLPrice + LINKPerBPT * LINKPrice)}\n`);

    _print("========== STAKING =========")
    _print(`There are total   : ${totalBPTAmount} BPT issued by YFL LINK Balancer Pool.`);
    _print(`There are total   : ${totalStakedBPTAmount} BPT staked in YFL's BPT staking pool.`);
    _print(`                  = ${toDollar(totalStakedBPTAmount * BPTPrice)}\n`);
    _print(`You are staking   : ${stakedBPTAmount} BPT (${toFixed(stakedBPTAmount * 100 / totalStakedBPTAmount, 3)}% of the pool)`);
    _print(`                  = [${YFLPerBPT * stakedBPTAmount} YFL, ${LINKPerBPT * stakedBPTAmount} LINK]`);
    _print(`                  = ${toDollar(YFLPerBPT * stakedBPTAmount * YFLPrice + LINKPerBPT * stakedBPTAmount * LINKPrice)}\n`);

    // REWARDS
    _print("======== YFL REWARDS ========")
    _print(`Claimable Rewards : ${toFixed(earnedYFL, 4)} YFL = ${toDollar(earnedYFL * YFLPrice)}`);
    const YFLWeeklyEstimate = rewardPerToken * stakedBPTAmount;

    _print(`Hourly estimate   : ${toFixed(YFLWeeklyEstimate / (7 * 24), 4)} YFL = ${toDollar((YFLWeeklyEstimate / (7 * 24)) * YFLPrice)} (out of total ${toFixed(weeklyReward / (7 * 24), 2)} YFL)`)
    _print(`Daily estimate    : ${toFixed(YFLWeeklyEstimate / 7, 4)} YFL = ${toDollar((YFLWeeklyEstimate / 7) * YFLPrice)} (out of total  ${toFixed(weeklyReward / 7, 2)} YFL)`)
    _print(`Weekly estimate   : ${toFixed(YFLWeeklyEstimate, 4)} YFL = ${toDollar(YFLWeeklyEstimate * YFLPrice)} (out of total ${weeklyReward} YFL)`)
    const WeeklyROI = (rewardPerToken * YFLPrice) * 100 / (BPTPrice);

    _print(`\nHourly ROI in USD : ${toFixed((WeeklyROI / 7) / 24, 4)}%`);
    _print(`Daily ROI in USD  : ${toFixed(WeeklyROI / 7, 4)}%`);
    _print(`Weekly ROI in USD : ${toFixed(WeeklyROI, 4)}%`);
    _print(`APY (unstable)    : ${toFixed(WeeklyROI * 52, 4)}% \n`);

    const timeTilHalving = nextHalving - (Date.now() / 1000);

    _print(`Minting ceases    : in ${forHumans(timeTilHalving)} \n`)
    hideLoading();
}