#!/usr/bin/env tsx
import { colorTokens } from "./tokens";
import fs from "fs";
import path from "path";

const generateCSSVars = () => {
  const lines: string[] = [];

  Object.entries(colorTokens).forEach(([group, colors]) => {
    Object.entries(colors).forEach(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      lines.push(`  --color-${group}-${cssKey}: ${value.toLowerCase()};`);
    });
    lines.push("");
  });

  return lines.join("\n").trim();
};

const generateTailwindColors = () => {
  const colorGroups: Record<string, Record<string, string>> = {};

  Object.entries(colorTokens).forEach(([group, colors]) => {
    colorGroups[group] = {};
    Object.entries(colors).forEach(([key, _value]) => {
      const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      colorGroups[group][key] = `var(--color-${group}-${cssKey})`;
    });
  });

  return colorGroups;
};

const updateGlobalCSS = () => {
  const globalsPath = path.join(__dirname, "globals.css");
  let content = fs.readFileSync(globalsPath, "utf-8");

  const colorVars = generateCSSVars();

  const themeStart = "@theme {";
  const themeEnd = '\n}\n\n@plugin "daisyui"';

  const startIndex = content.indexOf(themeStart);
  const endIndex = content.indexOf(themeEnd, startIndex);

  if (startIndex === -1 || endIndex === -1) {
    console.error("❌ Could not find @theme block in globals.css");
    return false;
  }

  const before = content.substring(0, startIndex + themeStart.length);
  const after = content.substring(endIndex);

  const newContent = `${before}
  --shadow-center: 0 0 12px -2px rgb(0 0 0 / 0.05);
  --animate-pulse-fast: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  --font-family-repetition: var(--font-repetition), sans-serif;
  --font-family-barlow: var(--font-barlow), sans-serif;

${colorVars}
${after}`;

  fs.writeFileSync(globalsPath, newContent, "utf-8");
  console.log("✅ Synced colors from tokens.ts to globals.css");
  return true;
};

const updateTailwindConfig = () => {
  const tailwindConfigPath = path.join(__dirname, "..", "tailwind.config.ts");
  let content = fs.readFileSync(tailwindConfigPath, "utf-8");

  const colorGroups = generateTailwindColors();

  const colorsStart = "colors: {";
  const colorsEnd = "},\n      boxShadow:";

  const startIndex = content.indexOf(colorsStart);
  const endIndex = content.indexOf(colorsEnd, startIndex);

  if (startIndex === -1 || endIndex === -1) {
    console.error("❌ Could not find colors block in tailwind.config.ts");
    return false;
  }

  const before = content.substring(0, startIndex + colorsStart.length);
  const after = content.substring(endIndex);

  const generateColorObject = (obj: Record<string, string>, indent = "          ") => {
    return Object.entries(obj)
      .map(([key, value]) => {
        const displayKey = key.match(/^\d+$/) ? key : `"${key.replace(/([A-Z])/g, "-$1").toLowerCase()}"`;
        return `${indent}${displayKey}: "${value}",`;
      })
      .join("\n");
  };

  const colorLines = Object.entries(colorGroups)
    .map(([group, colors]) => {
      return `        ${group}: {\n${generateColorObject(colors)}\n        },`;
    })
    .join("\n");

  const newContent = `${before}\n${colorLines}\n      ${after}`;

  fs.writeFileSync(tailwindConfigPath, newContent, "utf-8");
  console.log("✅ Synced colors from tokens.ts to tailwind.config.ts");
  return true;
};

const success1 = updateGlobalCSS();
const success2 = updateTailwindConfig();

if (success1 && success2) {
  console.log("\n🎉 All files synced successfully!");
} else {
  console.error("\n❌ Some files failed to sync");
  process.exit(1);
}
