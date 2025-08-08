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

// Create Base collection with tonal palettes (update in place to preserve links)
async function createBaseCollection(colors: DesignSystemColors, primaryHex: string, neutralBaseHex: string, overrides: ColorOverrides = {}) {
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
  
  // Create/Update Typography variables (keep existing names to preserve links)
  const typography = {
    'Display': 'Inter',
    'Header': 'Inter',
    'Primary': 'Inter',
    'Data': 'Space Mono'
  } as Record<string, string>;
  for (const [name, value] of Object.entries(typography)) {
    const existing = baseCollection!.variableIds
      .map(id => figma.variables.getVariableById(id))
      .find(v => v && v.name === `Typography/${name}`);
    const typographyVar = existing || figma.variables.createVariable(`Typography/${name}`, baseCollection!, "STRING");
    typographyVar.setValueForMode(modeId, value);
    typographyVar.scopes = ['TEXT_CONTENT', 'FONT_FAMILY'];
  }
  
  return baseCollection;
}

// Create Theme collection with Light and Dark modes
async function createThemeCollection(baseCollection: VariableCollection) {
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
  createAliasVariable("Status/Failure/Dark", "Colors/Failure/20", "Colors/Primary/90");
  
  // Error (backward compatibility - update to match Failure)
  createAliasVariable("Status/Error/Main", "Colors/Failure/60", "Colors/Failure/60");
  createAliasVariable("Status/Error/Foreground", "Colors/Failure/99", "Colors/Failure/99");
  createAliasVariable("Status/Error/Light", "Colors/Failure/90", "Colors/Failure/20");
  createAliasVariable("Status/Error/Dark", "Colors/Failure/20", "Colors/Primary/90");
  
  // Success
  createAliasVariable("Status/Success/Main", "Colors/Success/90", "Colors/Success/90");
  createAliasVariable("Status/Success/Foreground", "Colors/Success/5", "Colors/Success/5");
  createAliasVariable("Status/Success/Light", "Colors/Success/98", "Colors/Success/30");
  createAliasVariable("Status/Success/Dark", "Colors/Success/30", "Colors/Success/98");
  
  // Create Corner aliases
  console.log("Creating theme Corner variables...");
  createAliasVariable("Corners/None", "Corners/2", "Corners/None", "FLOAT");
  createAliasVariable("Corners/XS", "Corners/8", "Corners/8", "FLOAT");
  createAliasVariable("Corners/SM", "Corners/16", "Corners/16", "FLOAT");
  createAliasVariable("Corners/Base", "Corners/24", "Corners/24", "FLOAT");
  createAliasVariable("Corners/LG", "Corners/48", "Corners/48", "FLOAT");
  createAliasVariable("Corners/XL", "Corners/96", "Corners/96", "FLOAT");
  // Keep MD for backward compatibility
  createAliasVariable("Corners/MD", "Corners/48", "Corners/48", "FLOAT");
  createAliasVariable("Corners/Circle", "Corners/Circle", "Corners/Circle", "FLOAT");
  
  // Create Misc variables
  createAliasVariable("Misc/Divider", "Colors/Black/10", "Colors/White/10");
  createAliasVariable("Misc/Footer", "Colors/Black/50", "Colors/White/50");
  createAliasVariable("Misc/Skeleton", "Colors/Black/10", "Colors/White/10");
  
  // Create Brand variable
  createAliasVariable("Brand", "Colors/Primary/Base", "Colors/Primary/Base");
  
  return themeCollection;
}

// Main function to create both collections
async function createFigmaVariables(colors: DesignSystemColors, primaryHex: string, neutralBaseHex: string, overrides: ColorOverrides = {}) {
  try {
    // Create Base collection first
    console.log("Creating Base collection...");
    const baseCollection = await createBaseCollection(colors, primaryHex, neutralBaseHex, overrides);
    
    // Create Theme collection with references to Base
    console.log("Creating Theme collection...");
    await createThemeCollection(baseCollection);
    
    figma.notify("✅ Base and Theme collections created successfully!");
    
  } catch (error) {
    console.error("Error creating collections:", error);
    figma.notify("❌ Error creating collections. Check console for details.");
  }
}

// Export current theme as JSON in example.json format
function exportThemeAsJson() {
  try {
    const collections = figma.variables.getLocalVariableCollections();
    const baseCollection = collections.find(c => c.name === 'Base');
    const themeCollection = collections.find(c => c.name === 'Theme');
    
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
    
    // Export Base: Colors, Typography, Spacing, Corners
    for (const v of baseVariables) {
      const parts = v.name.split('/');
      const root = parts[0];
      const modeValue = (v.valuesByMode as any)[baseModeId];
      if (!modeValue && modeValue !== 0) continue;
      
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
        exportData.Base.modes.Caldera.Typography[parts[1]] = {
          $scopes: ["TEXT_CONTENT", "FONT_FAMILY"],
          $type: "string",
          $value: modeValue
        };
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
    
    const jsonString = JSON.stringify([exportData], null, 2);
    figma.ui.postMessage({ type: 'export-data', jsonData: jsonString, filename: 'theme-export.json' });
  } catch (e) {
    console.error('Failed to export theme:', e);
    figma.notify('Failed to export theme. Please try again.', { error: true });
  }
}

// Show UI with larger dimensions to accommodate new inputs
figma.showUI(__html__, { width: 420, height: 650 });

// Handle messages from UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'generate-theme') {
    const { hex, neutralHex, successHex, warningHex, infoHex, errorHex } = msg;
    
    console.log("Generating theme from primary color:", hex);
    
    // Define tones for each palette type
    const fullTones = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 35, 40, 50, 60, 70, 80, 85, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99];
    
    // Generate core palettes
    let neutralBase = hex; // Default to primary hex
    const colors: DesignSystemColors = {
      primary: generateTonalPalette(hex, fullTones),
      neutral: {},
      error: {} // Will be generated in createBaseCollection
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
    
    // Create Figma variables - pass all override colors and neutral base
    await createFigmaVariables(colors, hex, neutralBase, { neutralHex, successHex, warningHex, infoHex, errorHex });
    
    // Send success message back to UI
    figma.ui.postMessage({ 
      type: 'generation-complete',
      colors: colors 
    });
  }
  
  if (msg.type === 'export-json') {
    exportThemeAsJson();
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