$(function() {
    consoleInit();
    start(main);
});

async function main() {

    const App = await init_ethers();

    _print(`Initialized ${App.YOUR_ADDRESS}`);
    _print("Reading smart contracts...");

    const YFL_POOL2 = new ethers.Contract(YFL_POOL_2_ADDR, YGOV_BPT_STAKING_POOL_ABI, App.provider);
    const YFL_YCRV_BALANCER_POOL = new ethers.Contract(YFL_YCRV_BPT_TOKEN_ADDR, BALANCER_POOL_ABI, App.provider);
    const YFL_YCRV_BPT_TOKEN_CONTRACT = new ethers.Contract(YFL_YCRV_BPT_TOKEN_ADDR, ERC20_ABI, App.provider);

    const CURVE_Y_POOL = new ethers.Contract(CURVE_Y_POOL_ADDR, CURVE_Y_POOL_ABI, App.provider);
    const Y_TOKEN = new ethers.Contract(Y_TOKEN_ADDR, ERC20_ABI, App.provider);

    const stakedBPTAmount = await YFL_POOL2.balanceOf(App.YOUR_ADDRESS) / 1e18;
    const earnedYFL = await YFL_POOL2.earned(App.YOUR_ADDRESS) / 1e18;
    const totalBPTAmount = await YFL_YCRV_BALANCER_POOL.totalSupply() / 1e18;
    const totalStakedBPTAmount = await YFL_YCRV_BPT_TOKEN_CONTRACT.balanceOf(YFL_POOL_2_ADDR) / 1e18;
    const totalYFLAmount = await YFL_YCRV_BALANCER_POOL.getBalance(YFL_TOKEN_ADDR) / 1e18;
    const totalYCRVAmount = await YFL_YCRV_BALANCER_POOL.getBalance(Y_TOKEN_ADDR) / 1e18;

    const YFLPerBPT = totalYFLAmount / totalBPTAmount;
    const YCRVPerBPT = totalYCRVAmount / totalBPTAmount;

    // Find out reward rate
    const weeklyReward = await get_synth_weekly_rewards(YFL_POOL2);
    const nextHalving = await getPeriodFinishForReward(YFL_POOL2);
    const rewardPerToken = weeklyReward / totalStakedBPTAmount;

    _print("Finished reading smart contracts... Looking up prices... \n")

    // Look up prices
    const YVirtualPrice = await CURVE_Y_POOL.get_virtual_price() / 1e18;
    const YFLPrice = (await YFL_YCRV_BALANCER_POOL.getSpotPrice(Y_TOKEN_ADDR,YFL_TOKEN_ADDR) / 1e18) * YVirtualPrice;

    const BPTPrice = YFLPerBPT * YFLPrice + YCRVPerBPT * YVirtualPrice;

    // Finished. Start printing

    _print("========== PRICES ==========")
    _print(`1 YFL   = $${YFLPrice}`);
    _print(`1 YCRV  = $${YVirtualPrice}\n`);
    _print(`1 BPT   = [${YFLPerBPT} YFL, ${YCRVPerBPT} YCRV]`);
    _print(`        = ${toDollar(YFLPerBPT * YFLPrice + YCRVPerBPT * YVirtualPrice)}\n`);

    _print("========== STAKING =========")
    _print(`There are total   : ${totalBPTAmount} BPT issued by YFL YCRV Balancer Pool.`);
    _print(`There are total   : ${totalStakedBPTAmount} BPT staked in YFL's BPT staking pool.`);
    _print(`                  = ${toDollar(totalStakedBPTAmount * BPTPrice)}\n`);
    _print(`You are staking   : ${stakedBPTAmount} BPT (${toFixed(stakedBPTAmount * 100 / totalStakedBPTAmount, 3)}% of the pool)`);
    _print(`                  = [${YFLPerBPT * stakedBPTAmount} YFL, ${YCRVPerBPT * stakedBPTAmount} YCRV]`);
    _print(`                  = ${toDollar(YFLPerBPT * stakedBPTAmount * YFLPrice + YCRVPerBPT * stakedBPTAmount * YVirtualPrice)}\n`);

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

    _print(`Next halving      : in ${forHumans(timeTilHalving)} \n`)
    hideLoading();

}