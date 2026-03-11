import { router } from "expo-router";
import { AlertCircle, MapPin, MessageCircle, Phone, Siren } from "lucide-react-native";
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
        {/* Bouton Urgence principal */}
        <View style={styles.emergencyButtonContainer}>
          <TouchableOpacity 
            style={styles.emergencyButton}
            onPress={() => handleEmergencyCall("15")}
            activeOpacity={0.8}
          >
            <Siren color={MedicalColors.white} size={48} />
            <Text style={styles.emergencyButtonText}>URGENCE</Text>
            <Text style={styles.emergencyButtonSubtext}>Appeler le 15</Text>
          </TouchableOpacity>
        </View>

        {/* Boutons d'appel rapide */}
        <View style={styles.quickCallsContainer}>
          <TouchableOpacity 
            style={[styles.callButton, styles.samuButton]}
            onPress={() => handleEmergencyCall("15")}
          >
            <Phone color={MedicalColors.white} size={24} />
            <Text style={styles.callButtonText}>SAMU 15</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.callButton, styles.policeButton]}
            onPress={() => handleEmergencyCall("17")}
          >
            <Phone color={MedicalColors.white} size={24} />
            <Text style={styles.callButtonText}>Police 17</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.callButton, styles.pompiersButton]}
            onPress={() => handleEmergencyCall("18")}
          >
            <Phone color={MedicalColors.white} size={24} />
            <Text style={styles.callButtonText}>Pompiers 18</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.callButton, styles.europeanButton]}
            onPress={() => handleEmergencyCall("112")}
          >
            <Phone color={MedicalColors.white} size={24} />
            <Text style={styles.callButtonText}>Urgence 112</Text>
          </TouchableOpacity>
        </View>

        {/* Accès rapides */}
        <Text style={styles.sectionTitle}>Accès rapides</Text>
        
        <View style={styles.quickAccessContainer}>
          <TouchableOpacity style={styles.quickAccessCard} onPress={handleChatPress}>
            <Surface style={styles.quickAccessSurface}>
              <MessageCircle color={MedicalColors.urgency} size={32} />
              <Text style={styles.quickAccessTitle}>Assistant IA</Text>
              <Text style={styles.quickAccessDesc}>Conseils de premiers secours</Text>
            </Surface>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAccessCard} onPress={handleMapPress}>
            <Surface style={styles.quickAccessSurface}>
              <MapPin color={MedicalColors.medical} size={32} />
              <Text style={styles.quickAccessTitle}>Carte</Text>
              <Text style={styles.quickAccessDesc}>Hôpitaux et pharmacies</Text>
            </Surface>
          </TouchableOpacity>
        </View>

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
  quickCallsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  callButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    minWidth: 140,
    justifyContent: "center",
  },
  callButtonText: {
    color: MedicalColors.white,
    fontWeight: "600",
    fontSize: 14,
  },
  samuButton: {
    backgroundColor: MedicalColors.urgency,
  },
  policeButton: {
    backgroundColor: MedicalColors.dark,
  },
  pompiersButton: {
    backgroundColor: "#FF6600",
  },
  europeanButton: {
    backgroundColor: MedicalColors.medical,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: MedicalColors.text,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  quickAccessContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  quickAccessCard: {
    flex: 1,
  },
  quickAccessSurface: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: MedicalColors.white,
  },
  quickAccessTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: MedicalColors.text,
    marginTop: 8,
  },
  quickAccessDesc: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    textAlign: "center",
    marginTop: 4,
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
