// Frontend catalog. Keep in sync with backend/lib/catalog.js.
export const equipmentLabels = {
    high_pull_up_bar: "高單槓",
    low_bar: "低單槓",
    parallel_bars: "雙槓",
    monkey_bars: "攀爬架",
    sit_up_bench: "仰臥板",
    others: "其他器材",
};

export const equipmentTypes = Object.keys(equipmentLabels);

export const districts = {
    central_western: { zh: "中西區", en: "Central and Western" },
    wan_chai: { zh: "灣仔區", en: "Wan Chai" },
    eastern: { zh: "東區", en: "Eastern" },
    southern: { zh: "南區", en: "Southern" },
    yau_tsim_mong: { zh: "油尖旺區", en: "Yau Tsim Mong" },
    sham_shui_po: { zh: "深水埗區", en: "Sham Shui Po" },
    kowloon_city: { zh: "九龍城區", en: "Kowloon City" },
    wong_tai_sin: { zh: "黃大仙區", en: "Wong Tai Sin" },
    kwun_tong: { zh: "觀塘區", en: "Kwun Tong" },
    kwai_tsing: { zh: "葵青區", en: "Kwai Tsing" },
    tsuen_wan: { zh: "荃灣區", en: "Tsuen Wan" },
    tuen_mun: { zh: "屯門區", en: "Tuen Mun" },
    yuen_long: { zh: "元朗區", en: "Yuen Long" },
    north: { zh: "北區", en: "North" },
    tai_po: { zh: "大埔區", en: "Tai Po" },
    sha_tin: { zh: "沙田區", en: "Sha Tin" },
    sai_kung: { zh: "西貢區", en: "Sai Kung" },
    islands: { zh: "離島區", en: "Islands" },
};
