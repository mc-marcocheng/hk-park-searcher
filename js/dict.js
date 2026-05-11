const equipmentDict = {
    high_pull_up_bar: "高單槓",
    low_bar: "低單槓",
    parallel_bars: "雙槓",
    monkey_bars: "攀爬架",
    sit_up_bench: "仰臥板",
    others: "其他",
    // "push_up_bars": "掌上壓撐架",
    // "gymnastic_rings": "吊環",
    // "climbing_wall": "攀岩牆",
    // "balance_beam": "平衡木",
    // "step_platform": "階梯台",
    // "twister": "扭腰器"
};

// Fallback utility to safely get translation
function getEquipmentName(type) {
    return equipmentDict[type] || type.replace(/_/g, " ");
}
