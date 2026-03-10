import { MD3LightTheme } from "react-native-paper";
import { MedicalColors } from "./colors";

export const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: MedicalColors.urgency,
    secondary: MedicalColors.maternity,
    tertiary: MedicalColors.medical,
    background: MedicalColors.background,
    surface: MedicalColors.white,
    error: MedicalColors.urgency,
    onSurface: MedicalColors.text,
    onSurfaceVariant: MedicalColors.textSecondary,
    outline: MedicalColors.border,
    surfaceVariant: MedicalColors.background,
  },
  roundness: 12,
  fonts: {
    ...MD3LightTheme.fonts,
  },
};
