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
  failure: ColorSet;
  success?: ColorSet;
  warning?: ColorSet;
  info?: ColorSet;
}

interface ColorOverrides {
  neutralHex?: string;
  successHex?: string;
  warningHex?: string;
  infoHex?: string;
  failureHex?: string;
}

// Add FontOverrides interface
interface FontOverrides {
  displayFont?: { family: string; style: string };
  headerFont?: { family: string; style: string };
  primaryFont?: { family: string; style: string };
  dataFont?: { family: string; style: string };
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

// Generate neutral palette from primary by reducing saturation to 2%
function generateNeutralFromPrimary(primaryHex: string, tones: number[]): { palette: ColorSet; baseHex: string } {
  // Get HSL from primary
  const hsl = hexToHsl(primaryHex);
  
  // Create a neutral color with same hue and lightness but 2% saturation
  const neutralRgb = hslToRgb(hsl.h, 2, hsl.l);
  const neutralHex = rgbToHex(neutralRgb.r, neutralRgb.g, neutralRgb.b);
  
  console.log(`Primary: ${primaryHex} -> HSL(${hsl.h}, ${hsl.s}, ${hsl.l})`);
  console.log(`Neutral: ${neutralHex} -> HSL(${hsl.h}, 2, ${hsl.l})`);
  
  // Generate tonal palette from this neutral base
  const palette = generateTonalPalette(neutralHex, tones);
  
  // Return both the palette and the exact base color we calculated
  return { palette, baseHex: neutralHex };
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

// Function to get available fonts from Figma
async function getAvailableFonts() {
  try {
    const fonts = await figma.listAvailableFontsAsync();
    
    // Group fonts by family
    const fontFamilies: { [family: string]: string[] } = {};
    
    fonts.forEach(font => {
      if (!fontFamilies[font.fontName.family]) {
        fontFamilies[font.fontName.family] = [];
      }
      fontFamilies[font.fontName.family].push(font.fontName.style);
    });
    
    // Sort families alphabetically and styles by weight/style
    const sortedFamilies: { [family: string]: string[] } = {};
    Object.keys(fontFamilies).sort().forEach(family => {
      // Sort styles: Regular first, then by weight, then italics
      sortedFamilies[family] = fontFamilies[family].sort((a, b) => {
        if (a === 'Regular') return -1;
        if (b === 'Regular') return 1;
        if (a.includes('Italic') && !b.includes('Italic')) return 1;
        if (!a.includes('Italic') && b.includes('Italic')) return -1;
        return a.localeCompare(b);
      });
    });
    
    return sortedFamilies;
  } catch (error) {
    console.error('Failed to get available fonts:', error);
    return {};
  }
}

// Update createBaseCollection to load fonts before creating typography variables
async function createBaseCollection(colors: DesignSystemColors, primaryHex: string, neutralBaseHex: string, overrides: ColorOverrides = {}, fontOverrides: FontOverrides = {}) {
  // Find or create Base collection
  let baseCollection = figma.variables.getLocalVariableCollections().find(c => c.name === "Base");
  if (!baseCollection) {
    baseCollection = figma.variables.createVariableCollection("Base");
  }
  const modeId = baseCollection.modes[0].modeId;
  // Ensure mode is named Caldera
  baseCollection.renameMode(modeId, "Caldera");
  
  // Helper to create or update a COLOR variable by name
  function createColorVariable(path: string, hex: string, alpha: number = 1): Variable {
    const existing = baseCollection!.variableIds
      .map(id => figma.variables.getVariableById(id))
      .find(v => v && v.name === path);
    const variable = existing || figma.variables.createVariable(path, baseCollection!, "COLOR");
    const color = hexToFigmaColor(hex, alpha);
    variable.setValueForMode(modeId, color);
    return variable;
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
  
  // Create neutral palette with extended tones
  console.log("Creating neutral palette...");
  const neutralTones = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 85, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99];
  for (const tone of neutralTones) {
    if (colors.neutral[tone]) {
      createColorVariable(`Colors/Neutral/${tone}`, colors.neutral[tone]);
    }
  }
  
  // Create neutral base color - use the exact calculated neutral base
  createColorVariable(`Colors/Neutral/Base`, neutralBaseHex);
  
  // Create neutral alpha variants (extended range) - use the exact calculated neutral base
  const neutralAlphaTones = [10, 20, 30, 40, 50, 60, 70, 80, 90];
  for (const tone of neutralAlphaTones) {
    createColorVariable(`Colors/Neutral/Alpha/${tone}`, neutralBaseHex, tone / 100);
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
      override: overrides.failureHex
    }
  };
  
  const statusTones = [5, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 95, 98, 99];
  
  for (const [statusName, config] of Object.entries(statusColors)) {
    console.log(`Creating ${statusName} palette...`);
    
    let statusPalette: ColorSet;
    let baseHex: string;
    
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
      if (statusPalette && statusPalette[tone]) {
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
  
  // Create/Update Corners variables
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
  } as Record<string, number>;
  for (const [name, value] of Object.entries(corners)) {
    const existing = baseCollection!.variableIds
      .map(id => figma.variables.getVariableById(id))
      .find(v => v && v.name === `Corners/${name}`);
    const cornerVar = existing || figma.variables.createVariable(`Corners/${name}`, baseCollection!, "FLOAT");
    cornerVar.setValueForMode(modeId, value);
    cornerVar.scopes = ['CORNER_RADIUS'];
  }
  
  // Create/Update Spacing variables (extended range)
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
  } as Record<string, number>;
  for (const [name, value] of Object.entries(spacing)) {
    const existing = baseCollection!.variableIds
      .map(id => figma.variables.getVariableById(id))
      .find(v => v && v.name === `Spacing/${name}`);
    const spacingVar = existing || figma.variables.createVariable(`Spacing/${name}`, baseCollection!, "FLOAT");
    spacingVar.setValueForMode(modeId, value);
    spacingVar.scopes = name.startsWith('-') ? ['ALL_SCOPES'] : ['WIDTH_HEIGHT', 'GAP'];
  }
  
  // Load fonts and create typography variables
  console.log("Loading fonts for typography variables...");
  
  const typographyTypes = ['Display', 'Header', 'Primary', 'Data'];
  const defaults = {
    'Display': { family: 'Inter', style: 'Bold' },
    'Header': { family: 'Inter', style: 'SemiBold' }, 
    'Primary': { family: 'Inter', style: 'Regular' },
    'Data': { family: 'Space Mono', style: 'Regular' }
  };
  
  // Track successfully loaded fonts
  const loadedFonts: { [key: string]: { family: string; style: string } } = {};
  
  // Load fonts and track what was successfully loaded
  for (const typeName of typographyTypes) {
    const fontOverride = fontOverrides[`${typeName.toLowerCase()}Font`];
    let targetFamily = fontOverride?.family || defaults[typeName].family;
    let targetStyle = fontOverride?.style || defaults[typeName].style;
    
    try {
      console.log(`Loading font: ${targetFamily} ${targetStyle}`);
      await figma.loadFontAsync({ family: targetFamily, style: targetStyle });
      // Success - use the requested font
      loadedFonts[typeName] = { family: targetFamily, style: targetStyle };
    } catch (error) {
      console.error(`Failed to load font ${targetFamily} ${targetStyle}:`, error);
      
      // Try fallback to default font for this type
      try {
        console.log(`Falling back to default: ${defaults[typeName].family} ${defaults[typeName].style}`);
        await figma.loadFontAsync({ family: defaults[typeName].family, style: defaults[typeName].style });
        loadedFonts[typeName] = { family: defaults[typeName].family, style: defaults[typeName].style };
      } catch (fallbackError) {
        console.error(`Failed to load fallback font:`, fallbackError);
        
        // Ultimate fallback to Inter Regular
        try {
          console.log(`Using ultimate fallback: Inter Regular`);
          await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
          loadedFonts[typeName] = { family: 'Inter', style: 'Regular' };
        } catch (ultimateError) {
          console.error(`Even Inter Regular failed to load:`, ultimateError);
          // Skip this typography variable if we can't load any font
          continue;
        }
      }
    }
  }
  
  // Create/Update Typography variables using successfully loaded fonts
  console.log("Creating typography variables...");
  for (const typeName of typographyTypes) {
    const loadedFont = loadedFonts[typeName];
    if (!loadedFont) {
      console.warn(`Skipping ${typeName} typography - no font could be loaded`);
      continue;
    }
    
    // Create Font variable (font family)
    const existingFont = baseCollection!.variableIds
      .map(id => figma.variables.getVariableById(id))
      .find(v => v && v.name === `Typography/${typeName}/Font`);
    const fontVar = existingFont || figma.variables.createVariable(`Typography/${typeName}/Font`, baseCollection!, "STRING");
    fontVar.setValueForMode(modeId, loadedFont.family);
    fontVar.scopes = ['TEXT_CONTENT', 'FONT_FAMILY'];
    
    // Create Style variable (font style/weight)
    const existingStyle = baseCollection!.variableIds
      .map(id => figma.variables.getVariableById(id))
      .find(v => v && v.name === `Typography/${typeName}/Style`);
    const styleVar = existingStyle || figma.variables.createVariable(`Typography/${typeName}/Style`, baseCollection!, "STRING");
    styleVar.setValueForMode(modeId, loadedFont.style);
    styleVar.scopes = ['FONT_STYLE'];
    
    console.log(`Created typography variables for ${typeName}: ${loadedFont.family} ${loadedFont.style}`);
  }
  
  return baseCollection;
}

// Create Theme collection with Light and Dark modes
async function createThemeCollection(baseCollection: VariableCollection, cornerRadiusLevel: number = 3, modalBackgroundEnabled: boolean = true) {
  // Find or create Theme collection (do NOT delete existing to preserve links)
  let themeCollection = figma.variables.getLocalVariableCollections().find(c => c.name === "Theme");
  if (!themeCollection) {
    themeCollection = figma.variables.createVariableCollection("Theme");
  }

  // Ensure Light and Dark modes exist
  const lightModeId = themeCollection.modes[0].modeId;
  themeCollection.renameMode(lightModeId, "Light");
  
  // Check if Dark mode exists, if not create it
  let darkModeId = themeCollection.modes.find(m => m.name === "Dark")?.modeId;
  if (!darkModeId) {
    darkModeId = themeCollection.addMode("Dark");
  }

  // Helper: find or create variable by name in Theme collection
  function upsertVariable(path: string, type: VariableResolvedDataType = "COLOR"): Variable {
    const existing = themeCollection!.variableIds
      .map(id => figma.variables.getVariableById(id))
      .find(v => v && v.name === path);
    return existing || figma.variables.createVariable(path, themeCollection!, type);
  }
  
  // Helper to create or update a variable with alias to Base collection
  function createAliasVariable(
    path: string,
    lightAlias: string,
    darkAlias: string,
    type: VariableResolvedDataType = "COLOR"
  ): Variable {
    const variable = upsertVariable(path, type);
    
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
    
    if (darkBaseVar && darkModeId) {
      variable.setValueForMode(darkModeId, {
        type: 'VARIABLE_ALIAS',
        id: darkBaseVar.id
      });
    }
    
    return variable;
  }
  
  // Create Background variables
  console.log("Creating theme Background variables...");
  createAliasVariable("Background/Main", "Colors/Neutral/90", "Colors/Neutral/15");
  createAliasVariable("Background/Layer 1", "Colors/Neutral/99", "Colors/Neutral/30");
  createAliasVariable("Background/Layer 2", "Colors/Neutral/96", "Colors/Neutral/25");
  createAliasVariable("Background/Layer 3", "Colors/Neutral/93", "Colors/Neutral/20");
  

  
  // Create Text variables
  console.log("Creating theme Text variables...");
  createAliasVariable("Text/Primary", "Colors/Neutral/10", "Colors/Neutral/98");
  createAliasVariable("Text/Secondary", "Colors/Neutral/40", "Colors/Neutral/90");
  createAliasVariable("Text/Disabled", "Colors/Neutral/Alpha/50", "Colors/White/100");
  
  // Create Interactive Primary variables
  console.log("Creating theme Interactive variables...");
  createAliasVariable("Interactive/Primary/Active", "Colors/Primary/60", "Colors/Primary/60");
  createAliasVariable("Interactive/Primary/Hover", "Colors/Primary/70", "Colors/Primary/40");
  createAliasVariable("Interactive/Primary/Inactive", "Colors/Primary/95", "Colors/Primary/95");
  createAliasVariable("Interactive/Primary/Disabled", "Colors/Neutral/Alpha/30", "Colors/Neutral/Alpha/30");
  createAliasVariable("Interactive/Primary/Contrast", "Colors/Primary/98", "Colors/Primary/5");
  
  // Create Interactive Secondary variables
  createAliasVariable("Interactive/Secondary/Active", "Colors/Primary/40", "Colors/Primary/70");
  createAliasVariable("Interactive/Secondary/Hover", "Colors/Primary/50", "Colors/Primary/50");
  createAliasVariable("Interactive/Secondary/Inactive", "Colors/Neutral/40", "Colors/Neutral/85");
  createAliasVariable("Interactive/Secondary/Disabled", "Colors/Neutral/Alpha/30", "Colors/Neutral/Alpha/30");
  createAliasVariable("Interactive/Secondary/Contrast", "Colors/Primary/98", "Colors/Primary/5");
  
  // Create Interactive Tertiary variables
  createAliasVariable("Interactive/Tertiary/Active", "Colors/Neutral/40", "Colors/Neutral/90");
  createAliasVariable("Interactive/Tertiary/Hover", "Colors/Neutral/95", "Colors/Neutral/80");
  createAliasVariable("Interactive/Tertiary/Inactive", "Colors/Neutral/85", "Colors/White/20");
  createAliasVariable("Interactive/Tertiary/Disabled", "Colors/Neutral/Alpha/30", "Colors/White/10");
  createAliasVariable("Interactive/Tertiary/Contrast", "Colors/Neutral/98", "Colors/Neutral/10");

  // Create Interactive Input variables
  createAliasVariable("Interactive/Input/Active", "Colors/Neutral/Alpha/10", "Colors/Neutral/Alpha/10");
  createAliasVariable("Interactive/Input/Inactive", "Colors/Neutral/Alpha/20", "Colors/Neutral/Alpha/20");
  
  // Create Status variables (now all are always available)
  console.log("Creating theme Status variables...");
  
  // Warning
    createAliasVariable("Status/Warning/Main", "Colors/Warning/80", "Colors/Warning/80");
    createAliasVariable("Status/Warning/Foreground", "Colors/Warning/5", "Colors/Warning/5");
  createAliasVariable("Status/Warning/Light", "Colors/Warning/95", "Colors/Warning/40");
  createAliasVariable("Status/Warning/Dark", "Colors/Warning/40", "Colors/Warning/95");
  
  // Info
    createAliasVariable("Status/Info/Main", "Colors/Info/50", "Colors/Info/50");
  createAliasVariable("Status/Info/Foreground", "Colors/Info/99", "Colors/Neutral/99");
  createAliasVariable("Status/Info/Light", "Colors/Info/90", "Colors/Info/20");
  createAliasVariable("Status/Info/Dark", "Colors/Info/20", "Colors/Info/90");
  
  // Failure (canonical name in example.json)
  createAliasVariable("Status/Failure/Main", "Colors/Failure/60", "Colors/Failure/60");
  createAliasVariable("Status/Failure/Foreground", "Colors/Failure/99", "Colors/Failure/99");
  createAliasVariable("Status/Failure/Light", "Colors/Failure/90", "Colors/Failure/20");
  createAliasVariable("Status/Failure/Dark", "Colors/Failure/20", "Colors/Failure/90");
  
  // Success
    createAliasVariable("Status/Success/Main", "Colors/Success/90", "Colors/Success/90");
    createAliasVariable("Status/Success/Foreground", "Colors/Success/5", "Colors/Success/5");
  createAliasVariable("Status/Success/Light", "Colors/Success/98", "Colors/Success/30");
  createAliasVariable("Status/Success/Dark", "Colors/Success/30", "Colors/Success/98");
  
  // Create Corner aliases based on selected level
  console.log("Creating theme Corner variables...");
  
  // Define corner radius mappings for each level
  const cornerMappings = [
    // Level 0: None - [0,0,0,0,0,0]
    { None: "Corners/None", XS: "Corners/None", SM: "Corners/None", Base: "Corners/None", LG: "Corners/None", XL: "Corners/None" },
    // Level 1: Minimal - [2,2,2,2,2,2] 
    { None: "Corners/2", XS: "Corners/2", SM: "Corners/2", Base: "Corners/2", LG: "Corners/2", XL: "Corners/2" },
    // Level 2: Soft - [0,2,4,8,12,16]
    { None: "Corners/None", XS: "Corners/2", SM: "Corners/4", Base: "Corners/8", LG: "Corners/12", XL: "Corners/16" },
    // Level 3: Default - [2,4,8,16,24,48]
    { None: "Corners/2", XS: "Corners/4", SM: "Corners/8", Base: "Corners/16", LG: "Corners/24", XL: "Corners/48" },
    // Level 4: Round - [2,8,16,24,48,96]
    { None: "Corners/2", XS: "Corners/8", SM: "Corners/16", Base: "Corners/24", LG: "Corners/48", XL: "Corners/96" }
  ];
  
  const mapping = cornerMappings[cornerRadiusLevel] || cornerMappings[3]; // Default to level 3
  
  console.log(`Corner radius level ${cornerRadiusLevel}: Using mapping:`, mapping);
  
  createAliasVariable("Corners/None", mapping.None, mapping.None, "FLOAT");
  createAliasVariable("Corners/XS", mapping.XS, mapping.XS, "FLOAT");
  createAliasVariable("Corners/SM", mapping.SM, mapping.SM, "FLOAT");
  createAliasVariable("Corners/Base", mapping.Base, mapping.Base, "FLOAT");
  createAliasVariable("Corners/LG", mapping.LG, mapping.LG, "FLOAT");
  createAliasVariable("Corners/XL", mapping.XL, mapping.XL, "FLOAT");
  createAliasVariable("Corners/Circle", "Corners/Circle", "Corners/Circle", "FLOAT");
  
  // Create Misc variables
  createAliasVariable("Misc/Divider", "Colors/Black/10", "Colors/White/10");
  createAliasVariable("Misc/Footer", "Colors/Black/50", "Colors/White/50");
  createAliasVariable("Misc/Skeleton", "Colors/Black/10", "Colors/White/10");
  
  // Create Brand variable
  createAliasVariable("Brand", "Colors/Primary/Base", "Colors/Primary/Base");
  
  return themeCollection;
}

// Create Bridge collection for product-specific variables (no modes needed)
async function createBridgeCollection(themeCollection: VariableCollection, modalBackgroundEnabled: boolean = true, modalPaddingSize: string = "2", headerIconsPairingEnabled: boolean = true, headerBackgroundEnabled: boolean = false) {
  // Find or create Bridge collection (do NOT delete existing to preserve links)
  let bridgeCollection = figma.variables.getLocalVariableCollections().find(c => c.name === "Bridge");
  if (!bridgeCollection) {
    bridgeCollection = figma.variables.createVariableCollection("Bridge");
  }

  // Bridge collection only needs the default mode (no Light/Dark modes)
  const defaultModeId = bridgeCollection.modes[0].modeId;
  bridgeCollection.renameMode(defaultModeId, "Default");

  // Helper: find or create variable by name in Bridge collection
  function upsertBridgeVariable(path: string, type: VariableResolvedDataType = "COLOR"): Variable {
    const existing = bridgeCollection!.variableIds
      .map(id => figma.variables.getVariableById(id))
      .find(v => v && v.name === path);
    return existing || figma.variables.createVariable(path, bridgeCollection!, type);
  }
  
  // Create Modal Background variable (functional color variable)
  console.log("Creating Bridge Modal Background variable...");
  const modalBgVariable = upsertBridgeVariable("Modal/Background", "COLOR");
  
  if (modalBackgroundEnabled) {
    // Use the theme background color (alias to Theme/Background/Main)
    const themeBgVar = themeCollection.variableIds
      .map(id => figma.variables.getVariableById(id))
      .find(v => v && v.name === "Background/Main");
      
    if (themeBgVar) {
      modalBgVariable.setValueForMode(defaultModeId, {
        type: 'VARIABLE_ALIAS',
        id: themeBgVar.id
      });
    }
  } else {
    // Set to transparent (rgba(0,0,0,0)) - functional for designs
    const transparentColor = { r: 0, g: 0, b: 0, a: 0 };
    modalBgVariable.setValueForMode(defaultModeId, transparentColor);
  }
  
  // Create Modal Padding variable (functional spacing variable)
  console.log("Creating Bridge Modal Padding variable...");
  const modalPaddingVariable = upsertBridgeVariable("Modal/Padding", "FLOAT");
  
  if (modalBackgroundEnabled) {
    // Use selected spacing from Base collection
    const baseCollection = figma.variables.getLocalVariableCollections().find(c => c.name === "Base");
    const selectedSpacingVar = baseCollection?.variableIds
      .map(id => figma.variables.getVariableById(id))
      .find(v => v && v.name === `Spacing/${modalPaddingSize}`);
      
    if (selectedSpacingVar) {
      modalPaddingVariable.setValueForMode(defaultModeId, {
        type: 'VARIABLE_ALIAS',
        id: selectedSpacingVar.id
      });
    } else {
      // Fallback to direct value if spacing variable not found
      const spacingValues: Record<string, number> = {
        '0': 0, '1': 8, '2': 16, '3': 24, '4': 32, '5': 40,
        '6': 48, '7': 56, '8': 64, '9': 72, '10': 80, '11': 88, '12': 96
      };
      modalPaddingVariable.setValueForMode(defaultModeId, spacingValues[modalPaddingSize] || 16);
    }
  } else {
    // No background = no padding needed
    modalPaddingVariable.setValueForMode(defaultModeId, 0);
  }
  
  // Create Header/Icons Pairing boolean variable
  console.log("Creating Bridge Header/Icons Pairing boolean...");
  const headerIconsPairingVariable = upsertBridgeVariable("Header/Icons Pairing", "BOOLEAN");
  
  // Set boolean value based on toggle
  headerIconsPairingVariable.setValueForMode(defaultModeId, headerIconsPairingEnabled);
  
  // Create Header Background variable (functional color variable)
  console.log("Creating Bridge Header Background variable...");
  const headerBgVariable = upsertBridgeVariable("Header/Background", "COLOR");
  
  if (headerBackgroundEnabled) {
    // Use the theme divider color (alias to Theme/Misc/Divider)
    const themeDividerVar = themeCollection.variableIds
      .map(id => figma.variables.getVariableById(id))
      .find(v => v && v.name === "Misc/Divider");
      
    if (themeDividerVar) {
      headerBgVariable.setValueForMode(defaultModeId, {
        type: 'VARIABLE_ALIAS',
        id: themeDividerVar.id
      });
    }
  } else {
    // Set to transparent (rgba(0,0,0,0)) - functional for designs
    const transparentColor = { r: 0, g: 0, b: 0, a: 0 };
    headerBgVariable.setValueForMode(defaultModeId, transparentColor);
  }
  
  return bridgeCollection;
}

// Main function to create all three collections
async function createFigmaVariables(colors: DesignSystemColors, primaryHex: string, neutralBaseHex: string, overrides: ColorOverrides = {}, cornerRadiusLevel: number = 3, fontOverrides: FontOverrides = {}, modalBackgroundEnabled: boolean = true, modalPaddingSize: string = "2", headerIconsPairingEnabled: boolean = true, headerBackgroundEnabled: boolean = false) {
  try {
    // Create Base collection first
    console.log("Creating Base collection...");
    const baseCollection = await createBaseCollection(colors, primaryHex, neutralBaseHex, overrides, fontOverrides);
    
    // Create Theme collection with references to Base
    console.log("Creating Theme collection...");
    const themeCollection = await createThemeCollection(baseCollection, cornerRadiusLevel);
    
    // Create Bridge collection with product-specific variables
    console.log("Creating Bridge collection...");
    await createBridgeCollection(themeCollection, modalBackgroundEnabled, modalPaddingSize, headerIconsPairingEnabled, headerBackgroundEnabled);
    
    figma.notify("✅ Base, Theme, and Bridge collections created successfully!");
    
    // Send success message back to UI
    figma.ui.postMessage({
      type: 'generation-complete'
    });
    
  } catch (error) {
    console.error("Error creating collections:", error);
    figma.notify("❌ Error creating collections. Check console for details.");
  }
}


// Export current theme as JSON in example.json format
async function exportThemeAsJson() {
  try {
    const collections = figma.variables.getLocalVariableCollections();
    const baseCollection = collections.find(c => c.name === 'Base');
    const themeCollection = collections.find(c => c.name === 'Theme');
    const bridgeCollection = collections.find(c => c.name === 'Bridge');
    
    if (!baseCollection) {
      figma.notify('No Base collection found. Please generate a theme first.', { error: true });
      return;
    }
    
    // Prepare export structure
    const exportData: any = {
      Base: {
        modes: {
          Caldera: {
            Colors: {},
            Typography: {},
            Spacing: {},
            Corners: {}
          }
        }
      }
    };
    
    const baseModeId = baseCollection.modes[0].modeId;
    const baseVariables = baseCollection.variableIds.map(id => figma.variables.getVariableById(id)).filter(Boolean) as Variable[];
    
    const toHex = (r: number, g: number, b: number) => `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
    const toRgbaString = (r: number, g: number, b: number, a: number) => `rgba(${r}, ${g}, ${b}, ${Number(a.toFixed(2))})`;
    
    // Process Base variables by category
    for (const variable of baseVariables) {
      const name = variable.name; // e.g., Typography/Display/Font or Typography/Display/Style
      const parts = name.split('/');
      const root = parts[0];
      const modeValue = (variable.valuesByMode as any)[baseModeId];

      if (root === 'Colors') {
        if (typeof modeValue === 'object' && 'r' in modeValue) {
          const r = Math.round(modeValue.r * 255);
          const g = Math.round(modeValue.g * 255);
          const b = Math.round(modeValue.b * 255);
          const a = 'a' in modeValue ? (modeValue as RGBA).a : 1;
          const valueStr = a < 1 ? toRgbaString(r,g,b,a) : toHex(r,g,b);
          
          let current = exportData.Base.modes.Caldera.Colors;
          for (let i = 1; i < parts.length - 1; i++) {
            const p = parts[i];
            if (!current[p]) current[p] = {};
            current = current[p];
          }
          const key = parts[parts.length - 1];
          current[key] = { $scopes: ["ALL_SCOPES"], $type: "color", $value: valueStr };
        }
      } else if (root === 'Typography') {
        // Handle Typography/Display/Font and Typography/Display/Style format
        if (parts.length === 3) {
          const typeName = parts[1]; // Display, Header, Primary, Data
          const varType = parts[2]; // Font or Style
          
          if (!exportData.Base.modes.Caldera.Typography[typeName]) {
            exportData.Base.modes.Caldera.Typography[typeName] = {};
          }
          
          const scopes = varType === 'Font' 
            ? ["TEXT_CONTENT", "FONT_FAMILY"] 
            : ["FONT_STYLE"];
          
          exportData.Base.modes.Caldera.Typography[typeName][varType] = {
            $scopes: scopes,
            $type: "string",
            $value: modeValue
          };
        }
      } else if (root === 'Spacing') {
        exportData.Base.modes.Caldera.Spacing[parts[1]] = {
          $scopes: parts[1].startsWith('-') ? ["ALL_SCOPES"] : ["WIDTH_HEIGHT", "GAP"],
          $type: "number",
          $value: modeValue
        };
      } else if (root === 'Corners') {
        exportData.Base.modes.Caldera.Corners[parts[1]] = {
          $scopes: ["ALL_SCOPES"],
          $type: "number",
          $value: modeValue
        };
      }
    }
    
    // Export Theme modes as references to Base
    if (themeCollection) {
      exportData.Theme = { modes: {} };
      for (const mode of themeCollection.modes) {
        const themeVars = themeCollection.variableIds.map(id => figma.variables.getVariableById(id)).filter(Boolean) as Variable[];
        const themeModeId = mode.modeId;
        const modeBucket: any = {};
        
        for (const tv of themeVars) {
          const val = (tv.valuesByMode as any)[themeModeId];
          if (!(val && typeof val === 'object' && 'type' in val && (val as any).type === 'VARIABLE_ALIAS')) continue;
          const refId = (val as any).id;
          const refVar = figma.variables.getVariableById(refId);
          if (!refVar) continue;
          const refPath = `{${refVar.name.replace(/\//g, '.')}}`;
          
          const tParts = tv.name.split('/');
          let current = modeBucket;
          for (let i = 0; i < tParts.length - 1; i++) {
            const p = tParts[i];
            if (!current[p]) current[p] = {};
            current = current[p];
          }
          const key = tParts[tParts.length - 1];
          current[key] = { $libraryName: "", $collectionName: "Base", $value: refPath };
        }
        exportData.Theme.modes[mode.name] = modeBucket;
      }
    }
    
    // Export Bridge collection (product-specific boolean toggles - no modes)
    if (bridgeCollection) {
      const bridgeVars = bridgeCollection.variableIds.map(id => figma.variables.getVariableById(id)).filter(Boolean) as Variable[];
      const defaultModeId = bridgeCollection.modes[0].modeId;
      const bridgeBucket: any = {};
      
      for (const bv of bridgeVars) {
        const val = (bv.valuesByMode as any)[defaultModeId];
        if (val === undefined || val === null) continue;
        
        // Bridge variables have different export types based on their purpose
        let exportValue: any;
        let exportType: string;
        let exportScopes: string[];
        
        // Determine export format based on variable name
        if (bv.name.includes('/Padding')) {
          // Padding variables export as references to Base spacing or direct numbers
          if (typeof val === 'number') {
            // Direct number value (like 0)
            exportValue = val;
            exportType = "number";
            exportScopes = ["WIDTH_HEIGHT", "GAP"];
          } else if (typeof val === 'object' && 'type' in val && (val as any).type === 'VARIABLE_ALIAS') {
            // Export as reference to Base spacing variable (like Theme variables)
            const refId = (val as any).id;
            const refVar = figma.variables.getVariableById(refId);
            if (refVar) {
              const refPath = `{${refVar.name.replace(/\//g, '.')}}`;
              exportValue = refPath;
              exportType = "number";
              exportScopes = ["WIDTH_HEIGHT", "GAP"];
            } else {
              exportValue = 0;
              exportType = "number";
              exportScopes = ["WIDTH_HEIGHT", "GAP"];
            }
          } else {
            exportValue = 0;
            exportType = "number";
            exportScopes = ["WIDTH_HEIGHT", "GAP"];
          }
        } else {
          // Background and other variables export as booleans
          if (typeof val === 'boolean') {
            exportValue = val;
          } else if (typeof val === 'number') {
            exportValue = val > 0;
          } else if (typeof val === 'object' && 'type' in val && (val as any).type === 'VARIABLE_ALIAS') {
            exportValue = true;
          } else if (typeof val === 'object' && 'r' in val) {
            const a = 'a' in val ? (val as RGBA).a : 1;
            exportValue = a > 0;
          } else {
            exportValue = true;
          }
          exportType = "boolean";
          exportScopes = ["ALL_SCOPES"];
        }
        
        // Create nested structure for the export value
        const bParts = bv.name.split('/');
        let current = bridgeBucket;
        for (let i = 0; i < bParts.length - 1; i++) {
          const p = bParts[i];
          if (!current[p]) current[p] = {};
          current = current[p];
        }
        const key = bParts[bParts.length - 1];
        
        // Use reference structure for aliases, direct structure for values
        if (bv.name.includes('/Padding') && typeof val === 'object' && 'type' in val && (val as any).type === 'VARIABLE_ALIAS') {
          // Padding reference to Base spacing
          current[key] = {
            $libraryName: "",
            $collectionName: "Base",
            $value: exportValue  // This is the {Base.Spacing.X} reference
          };
        } else {
          // Direct values (booleans, direct numbers)
          current[key] = {
            $scopes: exportScopes,
            $type: exportType,
            $value: exportValue
          };
        }
      }
      exportData.Bridge = bridgeBucket;
    }
    
    const jsonString = JSON.stringify([exportData], null, 2);
    figma.ui.postMessage({ type: 'export-data', jsonData: jsonString, filename: 'theme-export.json' });
  } catch (e) {
    console.error('Failed to export theme:', e);
    figma.notify('Failed to export theme. Please try again.', { error: true });
  }
}

// Show UI with larger dimensions to accommodate new inputs
figma.showUI(__html__, { width: 420, height: 900 });

// Handle messages from UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'load-fonts') {
    // Send available fonts to UI
    const fonts = await getAvailableFonts();
    figma.ui.postMessage({
      type: 'fonts-loaded',
      fonts: fonts
    });
    return;
  }
  
  if (msg.type === 'generate-theme') {
    const { hex, neutralHex, successHex, warningHex, infoHex, failureHex, cornerRadiusLevel, fontOverrides } = msg;
    
    console.log("Generating theme from primary color:", hex);
    console.log("Corner radius level:", cornerRadiusLevel !== undefined ? cornerRadiusLevel : 3);
    console.log("Font overrides:", fontOverrides);
    
    // Remove font loading from here - it's now handled in createBaseCollection
    
    // Define tones for each palette type
    const fullTones = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 85, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99];
    
    // Generate core palettes
    let neutralBase = hex; // Default to primary hex
    const colors: DesignSystemColors = {
      primary: generateTonalPalette(hex, fullTones),
      neutral: {},
      failure: {} // Will be generated in createBaseCollection
    };
    
    if (neutralHex) {
      colors.neutral = generateTonalPalette(neutralHex, fullTones);
      neutralBase = neutralHex;
    } else {
      const neutralResult = generateNeutralFromPrimary(hex, fullTones);
      colors.neutral = neutralResult.palette;
      neutralBase = neutralResult.baseHex;
    }
    
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
    
    // Create Figma variables with font overrides
    await createFigmaVariables(colors, hex, neutralBase, { neutralHex, successHex, warningHex, infoHex, failureHex }, cornerRadiusLevel !== undefined ? cornerRadiusLevel : 3, fontOverrides || {}, msg.modalBackgroundEnabled, msg.modalPaddingSize, msg.headerIconsPairingEnabled, msg.headerBackgroundEnabled);
    
    // Send success message back to UI
    figma.ui.postMessage({ 
      type: 'generation-complete'
    });
  }
  
  if (msg.type === 'export-json') {
    await exportThemeAsJson();
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
};