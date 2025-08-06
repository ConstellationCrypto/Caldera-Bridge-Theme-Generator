import {
  argbFromHex,
  hexFromArgb,
  rgbaFromArgb,
  TonalPalette,
  Hct
} from '@material/material-color-utilities';

// Type definitions for your design system
interface ColorSet {
  [tone: number]: string;
}

interface DesignSystemColors {
  neutral: ColorSet;
  primary: ColorSet;
  secondary?: ColorSet;
  tertiary?: ColorSet;
}

interface DesignSystemVariables {
  background: {
    main: string;
    layer1: string;
    layer2: string;
    layer3: string;
  };
  text: {
    primary: string;
    secondary: string;
    disabled: {
      color: string;
      alpha: number;
    };
  };
  interactive: {
    active: string;
    hover: string;
    inactive: string;
    disabled: {
      color: string;
      alpha: number;
    };
    contrast: string;
  };
}

// Generate tonal palette using HCT from material-color-utilities
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

// Alternative: Generate palette from specific hue and chroma
function generateCustomTonalPalette(hue: number, chroma: number, tones: number[]): ColorSet {
  const tonalPalette = TonalPalette.fromHueAndChroma(hue, chroma);
  
  const palette: ColorSet = {};
  for (const tone of tones) {
    const toneArgb = tonalPalette.tone(tone);
    palette[tone] = hexFromArgb(toneArgb);
  }
  
  return palette;
}

// Generate your specific variable structure
function generateDesignSystemVariables(colors: DesignSystemColors): DesignSystemVariables {
  return {
    background: {
      main: colors.neutral[90] || '#FFFFFF',
      layer1: colors.neutral[99] || '#FFFFFF',
      layer2: colors.neutral[96] || '#FFFFFF',
      layer3: colors.neutral[93] || '#FFFFFF'
    },
    text: {
      primary: colors.neutral[10] || '#000000',
      secondary: colors.neutral[40] || '#666666',
      disabled: { 
        color: colors.neutral[50] || '#808080',
        alpha: 0.5
      }
    },
    interactive: {
      active: colors.primary[60] || '#0066CC',
      hover: colors.primary[70] || '#0052A3',
      inactive: colors.primary[95] || '#E6F0FF',
      disabled: { 
        color: colors.neutral[30] || '#4D4D4D',
        alpha: 0.3
      },
      contrast: colors.primary[98] || '#F5F9FF'
    }
  };
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

// Create Figma variables with proper structure
async function createFigmaVariables(variables: DesignSystemVariables, colors: DesignSystemColors) {
  try {
    // Check if collection exists and delete it
    const existingCollections = figma.variables.getLocalVariableCollections();
    for (const collection of existingCollections) {
      if (collection.name === "HCT Design System") {
        collection.remove();
      }
    }
    
    // Create new collection
    const collection = figma.variables.createVariableCollection("HCT Design System");
    const modeId = collection.modes[0].modeId;
    
    // Helper to create a color variable
    function createColorVariable(path: string, hex: string, alpha: number = 1): Variable {
      const variable = figma.variables.createVariable(
        path,
        collection,
        "COLOR"
      );
      
      const color = hexToFigmaColor(hex, alpha);
      variable.setValueForMode(modeId, color);
      
      return variable;
    }
    
    // Create base palette variables (Colors/...)
    console.log("Creating neutral palette variables...");
    const neutralTones = [10, 30, 40, 50, 90, 93, 96, 99];
    for (const tone of neutralTones) {
      if (colors.neutral[tone]) {
        createColorVariable(`Colors/Neutral/${tone}`, colors.neutral[tone]);
      }
    }
    
    // Special handling for alpha variants
    if (colors.neutral[50]) {
      createColorVariable(`Colors/Neutral/Alpha/50`, colors.neutral[50], 0.5);
    }
    if (colors.neutral[30]) {
      createColorVariable(`Colors/Neutral/Alpha/30`, colors.neutral[30], 0.3);
    }
    
    console.log("Creating primary palette variables...");
    const primaryTones = [60, 70, 95, 98];
    for (const tone of primaryTones) {
      if (colors.primary[tone]) {
        createColorVariable(`Colors/Primary/${tone}`, colors.primary[tone]);
      }
    }
    
    // Create secondary palette if provided
    if (colors.secondary) {
      console.log("Creating secondary palette variables...");
      for (const tone of primaryTones) {
        if (colors.secondary[tone]) {
          createColorVariable(`Colors/Secondary/${tone}`, colors.secondary[tone]);
        }
      }
    }
    
    // Create semantic variables - Background
    console.log("Creating background variables...");
    createColorVariable("Background/Main", variables.background.main);
    createColorVariable("Background/Layer 1", variables.background.layer1);
    createColorVariable("Background/Layer 2", variables.background.layer2);
    createColorVariable("Background/Layer 3", variables.background.layer3);
    
    // Create semantic variables - Text
    console.log("Creating text variables...");
    createColorVariable("Text/Primary", variables.text.primary);
    createColorVariable("Text/Secondary", variables.text.secondary);
    createColorVariable("Text/Disabled", variables.text.disabled.color, variables.text.disabled.alpha);
    
    // Create semantic variables - Interactive
    console.log("Creating interactive variables...");
    createColorVariable("Interactive/Primary/Active", variables.interactive.active);
    createColorVariable("Interactive/Primary/Hover", variables.interactive.hover);
    createColorVariable("Interactive/Primary/Inactive", variables.interactive.inactive);
    createColorVariable("Interactive/Primary/Disabled", variables.interactive.disabled.color, variables.interactive.disabled.alpha);
    createColorVariable("Interactive/Primary/Contrast", variables.interactive.contrast);
    
    figma.notify("✅ HCT Design System variables created successfully!");
    
  } catch (error) {
    console.error("Error creating variables:", error);
    figma.notify("❌ Error creating variables. Check console for details.");
  }
}

// Show UI
figma.showUI(__html__, { width: 400, height: 650 });

// Handle messages from UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'generate-colors') {
    const { primaryHex, neutralHex, secondaryHex } = msg;
    
    console.log("Generating colors with:", { primaryHex, neutralHex, secondaryHex });
    
    // Define which tones we need
    const neutralTones = [10, 30, 40, 50, 90, 93, 96, 99];
    const primaryTones = [60, 70, 95, 98];
    
    // Generate tonal palettes
    const colors: DesignSystemColors = {
      neutral: generateTonalPalette(neutralHex, neutralTones),
      primary: generateTonalPalette(primaryHex, primaryTones)
    };
    
    if (secondaryHex && secondaryHex !== '') {
      colors.secondary = generateTonalPalette(secondaryHex, primaryTones);
    }
    
    // Log generated colors for debugging
    console.log("Generated color palettes:", colors);
    
    // Generate variable structure
    const variables = generateDesignSystemVariables(colors);
    console.log("Generated variables:", variables);
    
    // Create Figma variables
    await createFigmaVariables(variables, colors);
    
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
