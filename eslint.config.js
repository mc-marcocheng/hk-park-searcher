const eslint = require("eslint");

module.exports = [
    {
        files: ["js/**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
        },
        rules: {
            "no-unused-vars": "off",
            "no-console": "warn",
            "prefer-const": "error",
            "no-var": "error",
        },
    },
];
