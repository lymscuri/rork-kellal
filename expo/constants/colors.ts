// Couleurs médicales Keneya
export const MedicalColors = {
  // Couleurs principales
  urgency: '#DC3545',      // Rouge urgence
  maternity: '#9B59B6',    // Violet maternité
  medical: '#0D6EFD',      // Bleu dossier
  life: '#4CAF50',         // Vert vie
  
  // Variantes
  urgencyLight: '#F8D7DA',
  urgencyDark: '#A71D2A',
  maternityLight: '#E8DAEF',
  maternityDark: '#7D3C98',
  medicalLight: '#D6EAF8',
  medicalDark: '#0B5ED7',
  lifeLight: '#D4EDDA',
  lifeDark: '#155724',
  
  // Neutres
  white: '#FFFFFF',
  background: '#F8F9FA',
  card: '#FFFFFF',
  text: '#212529',
  textSecondary: '#6C757D',
  border: '#DEE2E6',
  warning: '#FFC107',
  warningLight: '#FFF3CD',
  dark: '#343A40',
};

// Pour compatibilité avec le template existant
const tintColorLight = MedicalColors.urgency;

export default {
  light: {
    text: MedicalColors.text,
    background: MedicalColors.background,
    tint: tintColorLight,
    tabIconDefault: MedicalColors.textSecondary,
    tabIconSelected: tintColorLight,
  },
  medical: MedicalColors,
};
