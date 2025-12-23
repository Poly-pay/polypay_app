module.exports = {
  "packages/shared/**/*.{ts,tsx}": [
    () => "yarn format:shared",
    () => "yarn build:shared",
  ],
  "packages/backend/**/*.{ts,tsx}": [
    () => "yarn format:backend",
    () => "yarn build:backend",
  ],
  "packages/nextjs/**/*.{ts,tsx}": [
    () => "yarn format:frontend",
    () => "yarn build:frontend",
  ],
};
