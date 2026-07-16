export const districts = {
    WC: { zh: "中西區", en: "Central and Western" },
    EHC: { zh: "東區", en: "Eastern" },
    SSP: { zh: "南區", en: "Southern" },
    WCH: { zh: "灣仔區", en: "Wan Chai" },
    KT: { zh: "觀塘區", en: "Kwun Tong" },
    KOW: { zh: "九龍城區", en: "Kowloon City" },
    SSP2: { zh: "深水埗區", en: "Sham Shui Po" },
    WTS: { zh: "黃大仙區", en: "Wong Tai Sin" },
    YTM: { zh: "油尖旺區", en: "Yau Tsim Mong" },
    ISL: { zh: "離島區", en: "Islands" },
    KW: { zh: "葵青區", en: "Kwai Tsing" },
    N: { zh: "北區", en: "North" },
    SK: { zh: "西貢區", en: "Sai Kung" },
    ST: { zh: "沙田區", en: "Sha Tin" },
    TP: { zh: "大埔區", en: "Tai Po" },
    TW: { zh: "荃灣區", en: "Tsuen Wan" },
    TC: { zh: "屯門區", en: "Tuen Mun" },
    YL: { zh: "元朗區", en: "Yuen Long" },
};

export const equipmentTypes = [
    "健身器材",
    "兒童遊樂設施",
    "乒乓球檯",
    "籃球場",
    "足球場",
    "門球場",
];

export const districtCodes = new Set(Object.keys(districts));
export const equipmentTypeSet = new Set(equipmentTypes);
