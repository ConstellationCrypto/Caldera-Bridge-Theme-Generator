# Caldera-Bridge-Theme-Generator
A Figma plugin to generate themes for the Caldera Bridge using Google's HCT color system.


HCT is a color space that Google has produced to help them build dynamically changing UI. Katmai Design System uses this color space to make sure that what ever color a user provides we can automatically generate a UI that has visual clarity, contrast, and hits accessibility standards.

## Features
- Generate a color palatte from a single primary color or a image
- Define Fonts
- Define Corner Radius
- Toggle features such as backgrounds.
- Devive color roles from HCT Palatte
- Export color roles and palatte to a json file.

```
npm run build
```

## Color Palette

![Color Palette](palette.png)
### Primary Palette

When building a color palate we need at the very least a Brand/Primary color, which we can derive from a img or just a hex code. From there we can break down the the color in a palette.

With the Primary base color we then break down the palette using HCT tones. From there can take convert the HCT values to something useable like RGBA or HEX.

### Neutral Palette

We derive the neutral color by taking the HSL of the selected brand color and lowering the saturation (The "S" in HSL) to 5%.  From there we apply the same techinqie to get the shades has we did you the primary color palette. Difference is here that we need a few more shade options between. 91-94, 96-99 so we get more shades 

Neutral shades are broken down just by its light value in the HSL 


## Color Roles
Color roles are defined in the Katmai Design System and is used on the Bridge along with the rest of Caldera Products. Will provide more insight later. 


