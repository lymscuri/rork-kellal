// Langue unique de l'interface.
// Pas d'i18n dans le projet pour l'instant : l'UI est en français.
// Toute la logique « langue » dérive de cette constante. Le jour où un i18n
// est branché, il suffira de rendre UI_LANG dynamique (ex. depuis les locales
// du device ou un store de préférences) sans toucher au reste du module.
export type UiLang = 'fr' | 'en';

export const UI_LANG: UiLang = 'fr';
