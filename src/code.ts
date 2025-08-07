import {
  argbFromHex,
  hexFromArgb,
  rgbaFromArgb,
  TonalPalette,
  Hct
} from '@material/material-color-utilities';

// Type definitions
interface ColorSet {
  [tone: number]: string;
}

interface DesignSystemColors {
  neutral: ColorSet;
  primary: ColorSet;
  error: ColorSet;
  success?: ColorSet;
  warning?: ColorSet;
  info?: ColorSet;
}

interface ColorOverrides {
  neutralHex?: string;
  successHex?: string;
  warningHex?: string;
  infoHex?: string;
  errorHex?: string;
}

// Convert hex to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const argb = argbFromHex(hex);
  const rgba = rgbaFromArgb(argb);
  
  const r = rgba.r / 255;
  const g = rgba.g / 255;
  const b = rgba.b / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  
  let h = 0;
  let s = 0;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

// Generate tonal palette from hex
function generateTonalPalette(hexColor: string, tones: number[]): ColorSet {
  const argb = argbFromHex(hexColor);
  const hct = Hct.fromInt(argb);
  const tonalPalette = TonalPalette.fromHct(hct);
  
  const palette: ColorSet = {};
  for (const tone of tones) {
    const toneArgb = tonalPalette.tone(tone);
    palette[tone] = hexFromArgb(toneArgb);
  }
  
  return palette;
}

// Convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = h / 360;
  s = s / 100;
  l = l / 100;
  
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

// Convert RGB to hex
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// Generate neutral palette from primary using HCT color space for accuracy
function generateNeutralFromPrimary(primaryHex: string, tones: number[]): ColorSet {
  // Get HCT values from primary color
  const argb = argbFromHex(primaryHex);
  const hct = Hct.fromInt(argb);
  
  // Create neutral using same hue but very low chroma (around 4 works well)
  // Tone 50 gives us the middle lightness
  const neutralHct = Hct.from(hct.hue, 4, 50);
  const neutralArgb = neutralHct.toInt();
  const neutralHex = hexFromArgb(neutralArgb);
  
  console.log(`Primary: ${primaryHex} -> HCT(${Math.round(hct.hue)}, ${Math.round(hct.chroma)}, ${Math.round(hct.tone)})`);
  console.log(`Neutral: ${neutralHex} -> HCT(${Math.round(hct.hue)}, 4, 50)`);
  
  // Generate tonal palette from this neutral base
  return generateTonalPalette(neutralHex, tones);
}

// Convert hex to Figma RGB/RGBA format
function hexToFigmaColor(hex: string, alpha: number = 1): RGBA | RGB {
  const argb = argbFromHex(hex);
  const rgba = rgbaFromArgb(argb);
  
  if (alpha < 1) {
    return {
      r: rgba.r / 255,
      g: rgba.g / 255,
      b: rgba.b / 255,
      a: alpha
    };
  }
  
  return {
    r: rgba.r / 255,
    g: rgba.g / 255,
    b: rgba.b / 255
  };
}

// Create Base collection with tonal palettes
async function createBaseCollection(colors: DesignSystemColors, primaryHex: string, overrides: ColorOverrides = {}) {
  // Check if collection exists and delete it
  const existingCollections = figma.variables.getLocalVariableCollections();
  for (const collection of existingCollections) {
    if (collection.name === "Base") {
      collection.remove();
    }
  }
  
  // Create Base collection with single mode
  const baseCollection = figma.variables.createVariableCollection("Base");
  const modeId = baseCollection.modes[0].modeId;
  
  // Rename the default mode to "Caldera"
  baseCollection.renameMode(modeId, "Caldera");
  
  // Helper to create a color variable
  function createColorVariable(path: string, hex: string, alpha: number = 1): Variable {
    const variable = figma.variables.createVariable(
      path,
      baseCollection,
      "COLOR"
    );
    
    const color = hexToFigmaColor(hex, alpha);
    variable.setValueForMode(modeId, color);
    
    return variable;
  }
  
  // Create neutral palette with extended tones
  console.log("Creating neutral palette...");
  const neutralTones = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 85, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99];
  for (const tone of neutralTones) {
    if (colors.neutral[tone]) {
      createColorVariable(`Colors/Neutral/${tone}`, colors.neutral[tone]);
    }
  }
  
  // Create neutral base color (tone 50)
  if (colors.neutral[50]) {
    createColorVariable(`Colors/Neutral/Base`, colors.neutral[50]);
  }
  
  // Create neutral alpha variants (extended range)
  const neutralAlphaTones = [10, 20, 30, 40, 50, 60, 70, 80, 90];
  for (const tone of neutralAlphaTones) {
    if (colors.neutral[50]) { // Use tone 50 as base for alpha variants
      createColorVariable(`Colors/Neutral/Alpha/${tone}`, colors.neutral[50], tone / 100);
    }
  }
  
  // Create primary palette
  console.log("Creating primary palette...");
  const primaryTones = [5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 95, 98, 99];
  for (const tone of primaryTones) {
    if (colors.primary[tone]) {
      createColorVariable(`Colors/Primary/${tone}`, colors.primary[tone]);
    }
  }
  
  // Create primary base color - use the original input hex, not tone 50
  createColorVariable(`Colors/Primary/Base`, primaryHex);
  
  // Create primary alpha variants (extended range) - use the original input hex
  const primaryAlphaTones = [10, 20, 30, 40, 50, 60, 70, 80, 90];
  for (const tone of primaryAlphaTones) {
    createColorVariable(`Colors/Primary/Alpha/${tone}`, primaryHex, tone / 100);
  }
  
  // Create status color palettes - use overrides if provided, otherwise use defaults
  console.log("Creating status color palettes...");
  const statusColors = {
    'Success': { 
      hue: 150, 
      chroma: 66,
      override: overrides.successHex
    },
    'Warning': { 
      hue: 40, 
      chroma: 70,
      override: overrides.warningHex
    }, 
    'Info': { 
      hue: 260, 
      chroma: 84,
      override: overrides.infoHex
    },
    'Failure': { 
      hue: 25, 
      chroma: 84,
      override: overrides.errorHex
    }
  };
  
  const statusTones = [5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 95, 98, 99];
  
  for (const [statusName, config] of Object.entries(statusColors)) {
    console.log(`Creating ${statusName} palette...`);
    
    let statusPalette;
    let baseHex;
    
    if (config.override) {
      // Use the override color to generate the palette
      statusPalette = generateTonalPalette(config.override, statusTones);
      baseHex = config.override;
    } else {
      // Use the default Material Design palette
      const materialPalette = TonalPalette.fromHueAndChroma(config.hue, config.chroma);
      statusPalette = {};
      for (const tone of statusTones) {
        const toneArgb = materialPalette.tone(tone);
        statusPalette[tone] = hexFromArgb(toneArgb);
      }
      const baseArgb = materialPalette.tone(50);
      baseHex = hexFromArgb(baseArgb);
    }
    
    // Create tone variables
    for (const tone of statusTones) {
      if (statusPalette[tone]) {
        createColorVariable(`Colors/${statusName}/${tone}`, statusPalette[tone]);
      }
    }
    
    // Create base color
    createColorVariable(`Colors/${statusName}/Base`, baseHex);
  }
  
  // Create white and black colors with full alpha range
  const alphaRange = [10, 20, 30, 40, 50, 60, 70, 80, 90];
  
  // White variants
  createColorVariable(`Colors/White/100`, '#FFFFFF');
  for (const alpha of alphaRange) {
    createColorVariable(`Colors/White/${alpha}`, '#FFFFFF', alpha / 100);
  }
  
  // Black variants
  createColorVariable(`Colors/Black/100`, '#000000');
  for (const alpha of alphaRange) {
    createColorVariable(`Colors/Black/${alpha}`, '#000000', alpha / 100);
  }
  
  // Create Corners variables (updated values)
  const corners = {
    '2': 2,
    '4': 4,
    '8': 8,
    '12': 12,
    '16': 16,
    '24': 24,
    '48': 48,
    '96': 96,
    'None': 0,
    'Circle': 9999
  };
  
  for (const [name, value] of Object.entries(corners)) {
    const cornerVar = figma.variables.createVariable(
      `Corners/${name}`,
      baseCollection,
      "FLOAT"
    );
    cornerVar.setValueForMode(modeId, value);
    cornerVar.scopes = ['CORNER_RADIUS'];
  }
  
  // Create Spacing variables (extended range)
  const spacing = {
    '0': 0,
    '1': 8,
    '2': 16,
    '3': 24,
    '4': 32,
    '5': 40,
    '6': 48,
    '7': 56,
    '8': 64,
    '9': 72,
    '10': 80,
    '11': 88,
    '12': 96,
    '-1': -8,
    '-1-2': -4,
    '-1-4': -2,
    '1-4': 2,
    '1-2': 4
  };
  
  for (const [name, value] of Object.entries(spacing)) {
    const spacingVar = figma.variables.createVariable(
      `Spacing/${name}`,
      baseCollection,
      "FLOAT"
    );
    spacingVar.setValueForMode(modeId, value);
    spacingVar.scopes = name.startsWith('-') ? ['ALL_SCOPES'] : ['WIDTH_HEIGHT', 'GAP'];
  }
  
  // Create Typography variables
  const typography = {
    'Display': 'PP Neue Corp',
    'Header': 'KMR Apparat',
    'Primary': 'KMR Apparat',
    'Data': 'Martian Mono'
  };
  
  for (const [name, value] of Object.entries(typography)) {
    const typographyVar = figma.variables.createVariable(
      `Typography/${name}`,
      baseCollection,
      "STRING"
    );
    typographyVar.setValueForMode(modeId, value);
    typographyVar.scopes = ['TEXT_CONTENT', 'FONT_FAMILY'];
  }
  
  return baseCollection;
}

// Create Theme collection with Light and Dark modes
async function createThemeCollection(baseCollection: VariableCollection) {
  // Check if collection exists and delete it
  const existingCollections = figma.variables.getLocalVariableCollections();
  for (const collection of existingCollections) {
    if (collection.name === "Theme") {
      collection.remove();
    }
  }
  
  // Create Theme collection
  const themeCollection = figma.variables.createVariableCollection("Theme");
  
  // Get the default mode and rename it to "Light"
  const lightModeId = themeCollection.modes[0].modeId;
  themeCollection.renameMode(lightModeId, "Light");
  
  // Add Dark mode
  const darkModeId = themeCollection.addMode("Dark");
  
  // Helper to create a variable with alias to Base collection
  function createAliasVariable(
    path: string,
    lightAlias: string,
    darkAlias: string,
    type: VariableType = "COLOR"
  ): Variable {
    const variable = figma.variables.createVariable(path, themeCollection, type);
    
    // Get base variables for aliasing
    const lightBaseVar = baseCollection.variableIds
      .map(id => figma.variables.getVariableById(id))
      .find(v => v && v.name === lightAlias);
    
    const darkBaseVar = baseCollection.variableIds
      .map(id => figma.variables.getVariableById(id))
      .find(v => v && v.name === darkAlias);
    
    if (lightBaseVar) {
      variable.setValueForMode(lightModeId, {
        type: 'VARIABLE_ALIAS',
        id: lightBaseVar.id
      });
    }
    
    if (darkBaseVar) {
      variable.setValueForMode(darkModeId, {
        type: 'VARIABLE_ALIAS',
        id: darkBaseVar.id
      });
    }
    
    return variable;
  }
  
  // Create Background variables
  console.log("Creating theme Background variables...");
  createAliasVariable("Background/Main", "Colors/Neutral/90", "Colors/Neutral/10");
  createAliasVariable("Background/Layer 1", "Colors/Neutral/99", "Colors/Neutral/15");
  createAliasVariable("Background/Layer 2", "Colors/Neutral/96", "Colors/Neutral/20");
  createAliasVariable("Background/Layer 3", "Colors/Neutral/93", "Colors/Neutral/25");
  
  // Create Text variables
  console.log("Creating theme Text variables...");
  createAliasVariable("Text/Primary", "Colors/Neutral/10", "Colors/Neutral/90");
  createAliasVariable("Text/Secondary", "Colors/Neutral/40", "Colors/Neutral/60");
  createAliasVariable("Text/Disabled", "Colors/Neutral/Alpha/50", "Colors/Neutral/Alpha/50");
  
  // Create Interactive Primary variables
  console.log("Creating theme Interactive variables...");
  createAliasVariable("Interactive/Primary/Active", "Colors/Primary/60", "Colors/Primary/40");
  createAliasVariable("Interactive/Primary/Hover", "Colors/Primary/70", "Colors/Primary/30");
  createAliasVariable("Interactive/Primary/Inactive", "Colors/Primary/95", "Colors/Primary/20");
  createAliasVariable("Interactive/Primary/Disabled", "Colors/Neutral/Alpha/30", "Colors/Neutral/Alpha/30");
  createAliasVariable("Interactive/Primary/Contrast", "Colors/Primary/98", "Colors/Primary/10");
  
  // Create Interactive Secondary variables (using Primary with different tones)
  createAliasVariable("Interactive/Secondary/Active", "Colors/Primary/10", "Colors/Primary/90");
  createAliasVariable("Interactive/Secondary/Hover", "Colors/Primary/Alpha/10", "Colors/Primary/Alpha/10");
  createAliasVariable("Interactive/Secondary/Inactive", "Colors/Primary/98", "Colors/Primary/10");
  createAliasVariable("Interactive/Secondary/Disabled", "Colors/Neutral/Alpha/20", "Colors/Neutral/Alpha/20");
  createAliasVariable("Interactive/Secondary/Contrast", "Colors/Primary/60", "Colors/Primary/40");
  
  // Create Interactive Tertiary variables (using Neutral)
  createAliasVariable("Interactive/Tertiary/Active", "Colors/Neutral/60", "Colors/Neutral/Alpha/70");
  createAliasVariable("Interactive/Tertiary/Hover", "Colors/Primary/Alpha/10", "Colors/Primary/Alpha/10");
  createAliasVariable("Interactive/Tertiary/Inactive", "Colors/Neutral/Alpha/10", "Colors/Neutral/Alpha/10");
  createAliasVariable("Interactive/Tertiary/Disabled", "Colors/Neutral/Alpha/10", "Colors/Neutral/Alpha/10");
  createAliasVariable("Interactive/Tertiary/Contrast", "Colors/Neutral/99", "Colors/Neutral/98");
  
  // Create Status variables (now all are always available)
  console.log("Creating theme Status variables...");
  
  // Warning
  createAliasVariable("Status/Warning/Main", "Colors/Warning/80", "Colors/Warning/80");
  createAliasVariable("Status/Warning/Foreground", "Colors/Warning/5", "Colors/Warning/5");
  createAliasVariable("Status/Warning/Light", "Colors/Warning/40", "Colors/Warning/95");
  createAliasVariable("Status/Warning/Dark", "Colors/Warning/95", "Colors/Warning/40");
  
  // Info
  createAliasVariable("Status/Info/Main", "Colors/Info/50", "Colors/Info/50");
  createAliasVariable("Status/Info/Foreground", "Colors/Neutral/99", "Colors/Info/99");
  createAliasVariable("Status/Info/Light", "Colors/Info/20", "Colors/Info/90");
  createAliasVariable("Status/Info/Dark", "Colors/Info/90", "Colors/Info/20");
  
  // Failure/Error
  createAliasVariable("Status/Error/Main", "Colors/Failure/60", "Colors/Failure/60");
  createAliasVariable("Status/Error/Foreground", "Colors/Failure/99", "Colors/Failure/99");
  createAliasVariable("Status/Error/Light", "Colors/Failure/20", "Colors/Failure/90");
  createAliasVariable("Status/Error/Dark", "Colors/Failure/90", "Colors/Failure/20");
  
  // Success
  createAliasVariable("Status/Success/Main", "Colors/Success/90", "Colors/Success/90");
  createAliasVariable("Status/Success/Foreground", "Colors/Success/5", "Colors/Success/5");
  createAliasVariable("Status/Success/Light", "Colors/Success/30", "Colors/Success/98");
  createAliasVariable("Status/Success/Dark", "Colors/Success/98", "Colors/Success/30");
  
  // Create Corner aliases
  console.log("Creating theme Corner variables...");
  createAliasVariable("Corners/None", "Corners/2", "Corners/2", "FLOAT");
  createAliasVariable("Corners/XS", "Corners/8", "Corners/8", "FLOAT");
  createAliasVariable("Corners/SM", "Corners/16", "Corners/16", "FLOAT");
  createAliasVariable("Corners/Base", "Corners/24", "Corners/24", "FLOAT");
  createAliasVariable("Corners/MD", "Corners/48", "Corners/48", "FLOAT");
  createAliasVariable("Corners/LG", "Corners/96", "Corners/96", "FLOAT");
  createAliasVariable("Corners/Circle", "Corners/Circle", "Corners/Circle", "FLOAT");
  
  // Create Misc variables
  createAliasVariable("Misc/Divider", "Colors/Neutral/Alpha/10", "Colors/White/10");
  createAliasVariable("Misc/Footer", "Colors/Neutral/50", "Colors/White/50");
  createAliasVariable("Misc/Skeleton", "Colors/Neutral/Alpha/10", "Colors/White/10");
  
  // Create Brand variable
  createAliasVariable("Brand", "Colors/Primary/Base", "Colors/Primary/Base");
  
  return themeCollection;
}

// Main function to create both collections
async function createFigmaVariables(colors: DesignSystemColors, primaryHex: string, overrides: ColorOverrides = {}) {
  try {
    // Create Base collection first
    console.log("Creating Base collection...");
    const baseCollection = await createBaseCollection(colors, primaryHex, overrides);
    
    // Create Theme collection with references to Base
    console.log("Creating Theme collection...");
    await createThemeCollection(baseCollection);
    
    figma.notify("✅ Base and Theme collections created successfully!");
    
  } catch (error) {
    console.error("Error creating collections:", error);
    figma.notify("❌ Error creating collections. Check console for details.");
  }
}

// Show UI with larger dimensions to accommodate new inputs
figma.showUI(__html__, { width: 420, height: 650 });

// Handle messages from UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'generate-colors') {
    const { primaryHex, neutralHex, successHex, warningHex, infoHex, errorHex } = msg;
    
    console.log("Generating theme from primary color:", primaryHex);
    
    // Define tones for each palette type
    const fullTones = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 85, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99];
    
    // Generate core palettes
    const colors: DesignSystemColors = {
      primary: generateTonalPalette(primaryHex, fullTones),
      neutral: neutralHex 
        ? generateTonalPalette(neutralHex, fullTones)
        : generateNeutralFromPrimary(primaryHex, fullTones),
      error: {} // Will be generated in createBaseCollection
    };
    
    // Add optional semantic palettes if provided
    if (successHex) {
      colors.success = generateTonalPalette(successHex, fullTones);
    }
    if (warningHex) {
      colors.warning = generateTonalPalette(warningHex, fullTones);
    }
    if (infoHex) {
      colors.info = generateTonalPalette(infoHex, fullTones);
    }
    
    // Log generated colors for debugging
    console.log("Generated color palettes:", colors);
    
    // Create Figma variables - pass all override colors
    await createFigmaVariables(colors, primaryHex, { neutralHex, successHex, warningHex, infoHex, errorHex });
    
    // Send success message back to UI
    figma.ui.postMessage({ 
      type: 'generation-complete',
      colors: colors 
    });
  }
  
  if (msg.type === 'get-hct-info') {
    // Analyze a color and return HCT values
    const { hex } = msg;
    const argb = argbFromHex(hex);
    const hct = Hct.fromInt(argb);
    
    figma.ui.postMessage({
      type: 'hct-info',
      hex: hex,
      hct: {
        hue: Math.round(hct.hue),
        chroma: Math.round(hct.chroma),
        tone: Math.round(hct.tone)
      }
    });
  }
  
  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};