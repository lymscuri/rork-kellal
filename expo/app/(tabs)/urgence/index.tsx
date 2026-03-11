import { router } from "expo-router";
import { AlertCircle, MapPin, Phone, Bot, Hospital } from "lucide-react-native";
import React, { useCallback } from "react";
import { Alert, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Card, Chip, Surface, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MedicalColors } from "@/constants/colors";


export default function EmergencyHomeScreen() {
  const criticalAllergies: { name: string }[] = [];
  const medicalProfile = { bloodGroup: '' };
  const isPregnant = false;

  const handleEmergencyCall = useCallback(async (number: string) => {
    const url = `tel:${number}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Erreur", "Impossible d'effectuer l'appel");
    }
  }, []);

  const handleChatPress = useCallback(() => {
    router.push("/(tabs)/urgence/chat");
  }, []);

  const handleMapPress = useCallback(() => {
    router.push("/(tabs)/urgence/map");
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Bandeau informations médicales */}
      {(medicalProfile.bloodGroup || criticalAllergies.length > 0 || isPregnant) && (
        <View style={styles.medicalBanner}>
          {medicalProfile.bloodGroup && (
            <Chip style={styles.chip} textStyle={styles.chipText}>
              Groupe: {medicalProfile.bloodGroup}
            </Chip>
          )}
          {isPregnant && (
            <Chip style={[styles.chip, styles.pregnancyChip]} textStyle={styles.chipText}>
              Grossesse en cours
            </Chip>
          )}
        </View>
      )}
      
      {criticalAllergies.length > 0 && (
        <Surface style={styles.allergyAlert}>
          <AlertCircle color={MedicalColors.urgency} size={20} />
          <Text style={styles.allergyText}>
            Allergie critique: {criticalAllergies.map(a => a.name).join(", ")}
          </Text>
        </Surface>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bouton Assistant IA principal */}
        <View style={styles.emergencyButtonContainer}>
          <TouchableOpacity 
            style={styles.emergencyButton}
            onPress={handleChatPress}
            activeOpacity={0.8}
          >
            <Bot color={MedicalColors.white} size={48} />
            <Text style={styles.emergencyButtonText}>ASSISTANT IA</Text>
            <Text style={styles.emergencyButtonSubtext}>Premiers secours</Text>
          </TouchableOpacity>
        </View>

        {/* Hôpitaux de Guinée */}
        <Text style={styles.sectionTitle}>Hôpitaux de Guinée</Text>
        <View style={styles.hospitalsContainer}>
          <TouchableOpacity 
            style={styles.hospitalCard}
            onPress={() => handleEmergencyCall("+224628684242")}
          >
            <View style={styles.hospitalIconContainer}>
              <Hospital color={MedicalColors.urgency} size={22} />
            </View>
            <View style={styles.hospitalInfo}>
              <Text style={styles.hospitalName}>CHU Donka</Text>
              <Text style={styles.hospitalLocation}>Conakry</Text>
            </View>
            <View style={styles.phoneIconContainer}>
              <Phone color={MedicalColors.white} size={16} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.hospitalCard}
            onPress={() => handleEmergencyCall("+224628261010")}
          >
            <View style={styles.hospitalIconContainer}>
              <Hospital color={MedicalColors.urgency} size={22} />
            </View>
            <View style={styles.hospitalInfo}>
              <Text style={styles.hospitalName}>Hôpital Ignace Deen</Text>
              <Text style={styles.hospitalLocation}>Conakry</Text>
            </View>
            <View style={styles.phoneIconContainer}>
              <Phone color={MedicalColors.white} size={16} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.hospitalCard}
            onPress={() => handleEmergencyCall("+224622353535")}
          >
            <View style={styles.hospitalIconContainer}>
              <Hospital color={MedicalColors.urgency} size={22} />
            </View>
            <View style={styles.hospitalInfo}>
              <Text style={styles.hospitalName}>Hôpital Sino-Guinéen</Text>
              <Text style={styles.hospitalLocation}>Kipé, Conakry</Text>
            </View>
            <View style={styles.phoneIconContainer}>
              <Phone color={MedicalColors.white} size={16} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.hospitalCard}
            onPress={() => handleEmergencyCall("+224664202020")}
          >
            <View style={styles.hospitalIconContainer}>
              <Hospital color={MedicalColors.urgency} size={22} />
            </View>
            <View style={styles.hospitalInfo}>
              <Text style={styles.hospitalName}>Clinique Pasteur</Text>
              <Text style={styles.hospitalLocation}>Conakry</Text>
            </View>
            <View style={styles.phoneIconContainer}>
              <Phone color={MedicalColors.white} size={16} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.hospitalCard}
            onPress={() => handleEmergencyCall("+224625353535")}
          >
            <View style={styles.hospitalIconContainer}>
              <Hospital color={MedicalColors.urgency} size={22} />
            </View>
            <View style={styles.hospitalInfo}>
              <Text style={styles.hospitalName}>Hôpital Régional de Kankan</Text>
              <Text style={styles.hospitalLocation}>Kankan</Text>
            </View>
            <View style={styles.phoneIconContainer}>
              <Phone color={MedicalColors.white} size={16} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.hospitalCard}
            onPress={() => handleEmergencyCall("+224628505050")}
          >
            <View style={styles.hospitalIconContainer}>
              <Hospital color={MedicalColors.urgency} size={22} />
            </View>
            <View style={styles.hospitalInfo}>
              <Text style={styles.hospitalName}>Hôpital Régional de N'Zérékoré</Text>
              <Text style={styles.hospitalLocation}>N'Zérékoré</Text>
            </View>
            <View style={styles.phoneIconContainer}>
              <Phone color={MedicalColors.white} size={16} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Accès rapide carte */}
        <TouchableOpacity style={styles.mapAccessCard} onPress={handleMapPress}>
          <MapPin color={MedicalColors.medical} size={24} />
          <View style={{ flex: 1 }}>
            <Text style={styles.mapAccessTitle}>Carte des secours</Text>
            <Text style={styles.mapAccessDesc}>Trouver hôpitaux et pharmacies proches</Text>
          </View>
        </TouchableOpacity>

        {/* Conseils de premiers secours */}
        <Card style={styles.tipsCard}>
          <Card.Content>
            <Text style={styles.tipsTitle}>Conseils d'urgence</Text>
            <View style={styles.tipItem}>
              <Text style={styles.tipNumber}>1</Text>
              <Text style={styles.tipText}>Restez calme et évaluez la situation</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipNumber}>2</Text>
              <Text style={styles.tipText}>Appelez les secours si nécessaire</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipNumber}>3</Text>
              <Text style={styles.tipText}>Ne déplacez pas la personne blessée</Text>
            </View>
            <View style={styles.tipItem}>
              <Text style={styles.tipNumber}>4</Text>
              <Text style={styles.tipText}>Utilisez l'assistant IA pour des conseils</Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MedicalColors.background,
  },
  medicalBanner: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: MedicalColors.medicalLight,
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    backgroundColor: MedicalColors.white,
    height: 32,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: MedicalColors.medical,
  },
  pregnancyChip: {
    backgroundColor: MedicalColors.maternityLight,
  },
  allergyAlert: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: MedicalColors.urgencyLight,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    gap: 8,
  },
  allergyText: {
    color: MedicalColors.urgencyDark,
    fontWeight: "600",
    fontSize: 14,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  emergencyButtonContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emergencyButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: MedicalColors.urgency,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: MedicalColors.urgency,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  emergencyButtonText: {
    color: MedicalColors.white,
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 8,
  },
  emergencyButtonSubtext: {
    color: MedicalColors.white,
    fontSize: 14,
    opacity: 0.9,
  },
  hospitalsContainer: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 24,
  },
  hospitalCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MedicalColors.white,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  hospitalIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: MedicalColors.urgencyLight,
    justifyContent: "center",
    alignItems: "center",
  },
  hospitalInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  hospitalLocation: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    marginTop: 2,
  },
  phoneIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: MedicalColors.urgency,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: MedicalColors.text,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  mapAccessCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MedicalColors.white,
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  mapAccessTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: MedicalColors.text,
  },
  mapAccessDesc: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    marginTop: 2,
  },
  tipsCard: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: MedicalColors.white,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: MedicalColors.text,
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  tipNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: MedicalColors.medical,
    color: MedicalColors.white,
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "bold",
    fontSize: 12,
  },
  tipText: {
    fontSize: 14,
    color: MedicalColors.text,
    flex: 1,
  },
});
