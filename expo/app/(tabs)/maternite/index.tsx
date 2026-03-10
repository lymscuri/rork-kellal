import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Card, Chip, List, ProgressBar, Surface, Text, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { MedicalColors } from "@/constants/colors";
import { useMedicalStore } from "@/store/medicalStore";
import { Baby, Check, Heart } from "lucide-react-native";

export default function MaternityScreen() {
  const { maternityData, setPregnancy, addWeeklyCheckup, markConsultationDone, addChild, markVaccineDone } = useMedicalStore();
  const [activeTab, setActiveTab] = useState<"pregnancy" | "pediatric">("pregnancy");
  
  // États pour formulaires
  const [lastPeriodDate, setLastPeriodDate] = useState("");
  const [weight, setWeight] = useState("");
  const [systolicBP, setSystolicBP] = useState("");
  const [diastolicBP, setDiastolicBP] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [childName, setChildName] = useState("");
  const [childBirthDate, setChildBirthDate] = useState("");

  const pregnancy = maternityData.pregnancy;
  const progress = useMemo(() => pregnancy ? pregnancy.currentWeek / 40 : 0, [pregnancy]);

  const handleSetPregnancy = useCallback(() => {
    if (!lastPeriodDate) return;
    const date = new Date(lastPeriodDate);
    const dueDate = new Date(date);
    dueDate.setDate(dueDate.getDate() + 280);
    
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const currentWeek = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    
    setPregnancy({
      id: Date.now().toString(),
      lastPeriodDate,
      dueDate: dueDate.toISOString().split("T")[0],
      currentWeek: Math.min(currentWeek, 42),
      isActive: true,
    });
    setLastPeriodDate("");
  }, [lastPeriodDate, setPregnancy]);

  const handleAddCheckup = useCallback(() => {
    if (!weight && !systolicBP && !diastolicBP && symptoms.length === 0) return;
    
    addWeeklyCheckup({
      date: new Date().toISOString().split("T")[0],
      weight: weight ? parseFloat(weight) : undefined,
      systolicBP: systolicBP ? parseInt(systolicBP) : undefined,
      diastolicBP: diastolicBP ? parseInt(diastolicBP) : undefined,
      symptoms,
    });
    
    setWeight("");
    setSystolicBP("");
    setDiastolicBP("");
    setSymptoms([]);
  }, [weight, systolicBP, diastolicBP, symptoms, addWeeklyCheckup]);

  const handleAddChild = useCallback(() => {
    if (!childName) return;
    addChild({
      firstName: childName,
      birthDate: childBirthDate || undefined,
    });
    setChildName("");
    setChildBirthDate("");
  }, [childName, childBirthDate, addChild]);

  const toggleSymptom = useCallback((symptom: string) => {
    setSymptoms(prev => 
      prev.includes(symptom) 
        ? prev.filter(s => s !== symptom)
        : [...prev, symptom]
    );
  }, []);

  const getConsultationStatusColor = useCallback((status: string) => {
    switch (status) {
      case "effectuee":
        return MedicalColors.life;
      case "en_retard":
        return MedicalColors.urgency;
      default:
        return MedicalColors.textSecondary;
    }
  }, []);

  const getVaccineStatusColor = useCallback((status: string) => {
    switch (status) {
      case "fait":
        return MedicalColors.life;
      case "en_retard":
        return MedicalColors.urgency;
      default:
        return MedicalColors.textSecondary;
    }
  }, []);

  const bpAlert = useMemo(() => {
    if (systolicBP && parseInt(systolicBP) > 140) return true;
    if (diastolicBP && parseInt(diastolicBP) > 90) return true;
    return false;
  }, [systolicBP, diastolicBP]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Surface style={styles.header}>
        <Text style={styles.headerTitle}>Santé Maternelle</Text>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "pregnancy" && styles.tabActive]}
            onPress={() => setActiveTab("pregnancy")}
          >
            <Heart size={18} color={activeTab === "pregnancy" ? MedicalColors.maternity : MedicalColors.textSecondary} />
            <Text style={[styles.tabText, activeTab === "pregnancy" && styles.tabTextActive]}>Grossesse</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "pediatric" && styles.tabActive]}
            onPress={() => setActiveTab("pediatric")}
          >
            <Baby size={18} color={activeTab === "pediatric" ? MedicalColors.maternity : MedicalColors.textSecondary} />
            <Text style={[styles.tabText, activeTab === "pediatric" && styles.tabTextActive]}>Pédiatrie</Text>
          </TouchableOpacity>
        </View>
      </Surface>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === "pregnancy" ? (
          <>
            {!pregnancy ? (
              <Card style={styles.card}>
                <Card.Content>
                  <Text style={styles.cardTitle}>Nouvelle grossesse</Text>
                  <Text style={styles.cardDescription}>
                    Entrez la date de votre dernier cycle pour commencer le suivi.
                  </Text>
                  <TextInput
                    label="Date du dernier cycle (YYYY-MM-DD)"
                    value={lastPeriodDate}
                    onChangeText={setLastPeriodDate}
                    mode="outlined"
                    outlineColor={MedicalColors.border}
                    activeOutlineColor={MedicalColors.maternity}
                    style={styles.input}
                    placeholder="2024-01-15"
                  />
                  <Button
                    mode="contained"
                    onPress={handleSetPregnancy}
                    style={styles.button}
                    buttonColor={MedicalColors.maternity}
                    disabled={!lastPeriodDate}
                  >
                    Commencer le suivi
                  </Button>
                </Card.Content>
              </Card>
            ) : (
              <>
                {/* Progression de la grossesse */}
                <Card style={styles.card}>
                  <Card.Content>
                    <View style={styles.pregnancyHeader}>
                      <Text style={styles.weekNumber}>Semaine {pregnancy.currentWeek}</Text>
                      <Chip style={styles.weekChip} textStyle={styles.weekChipText}>
                        {pregnancy.currentWeek <= 12 ? "1er trimestre" : pregnancy.currentWeek <= 27 ? "2ème trimestre" : "3ème trimestre"}
                      </Chip>
                    </View>
                    <ProgressBar progress={progress} color={MedicalColors.maternity} style={styles.progressBar} />
                    <View style={styles.pregnancyInfo}>
                      <Text style={styles.pregnancyInfoText}>
                        Date prévue d'accouchement: {pregnancy.dueDate}
                      </Text>
                      <Text style={styles.pregnancyInfoText}>
                        Dernier cycle: {pregnancy.lastPeriodDate}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>

                {/* Saisie hebdomadaire */}
                <Card style={styles.card}>
                  <Card.Content>
                    <Text style={styles.cardTitle}>Suivi hebdomadaire</Text>
                    
                    <View style={styles.inputRow}>
                      <View style={styles.inputHalf}>
                        <TextInput
                          label="Poids (kg)"
                          value={weight}
                          onChangeText={setWeight}
                          mode="outlined"
                          keyboardType="numeric"
                          outlineColor={MedicalColors.border}
                          activeOutlineColor={MedicalColors.maternity}
                        />
                      </View>
                    </View>

                    <View style={styles.inputRow}>
                      <View style={styles.inputHalf}>
                        <TextInput
                          label="Tension (sys)"
                          value={systolicBP}
                          onChangeText={setSystolicBP}
                          mode="outlined"
                          keyboardType="numeric"
                          outlineColor={MedicalColors.border}
                          activeOutlineColor={bpAlert ? MedicalColors.urgency : MedicalColors.maternity}
                          error={bpAlert}
                        />
                      </View>
                      <View style={styles.inputHalf}>
                        <TextInput
                          label="Tension (dia)"
                          value={diastolicBP}
                          onChangeText={setDiastolicBP}
                          mode="outlined"
                          keyboardType="numeric"
                          outlineColor={MedicalColors.border}
                          activeOutlineColor={bpAlert ? MedicalColors.urgency : MedicalColors.maternity}
                          error={bpAlert}
                        />
                      </View>
                    </View>

                    {bpAlert && (
                      <Surface style={styles.alertBox}>
                        <Text style={styles.alertText}>
                          Attention: Tension élevée! Consultez votre médecin.
                        </Text>
                      </Surface>
                    )}

                    <Text style={styles.symptomsLabel}>Symptômes:</Text>
                    <View style={styles.symptomsContainer}>
                      {["Nausées", "Fatigue", "Douleurs", "Saignements", "Migraines"].map((symptom) => (
                        <Chip
                          key={symptom}
                          selected={symptoms.includes(symptom)}
                          onPress={() => toggleSymptom(symptom)}
                          style={[styles.symptomChip, symptoms.includes(symptom) && styles.symptomChipSelected]}
                          textStyle={symptoms.includes(symptom) ? styles.symptomChipTextSelected : undefined}
                        >
                          {symptom}
                        </Chip>
                      ))}
                    </View>

                    <Button
                      mode="contained"
                      onPress={handleAddCheckup}
                      style={styles.button}
                      buttonColor={MedicalColors.maternity}
                    >
                      Enregistrer
                    </Button>
                  </Card.Content>
                </Card>

                {/* Calendrier des consultations */}
                <Card style={styles.card}>
                  <Card.Content>
                    <Text style={styles.cardTitle}>Calendrier des consultations</Text>
                    {maternityData.consultations.map((consultation) => (
                      <List.Item
                        key={consultation.id}
                        title={consultation.title}
                        description={consultation.date ? `Effectuée le ${consultation.date}` : `Semaine ${consultation.week}`}
                        left={(props) => (
                          <List.Icon {...props} icon="calendar-check" color={getConsultationStatusColor(consultation.status)} />
                        )}
                        right={() => (
                          consultation.status === "a_venir" ? (
                            <Button
                              mode="outlined"
                              onPress={() => markConsultationDone(consultation.id, new Date().toISOString().split("T")[0])}
                              compact
                              textColor={MedicalColors.maternity}
                            >
                              Marquer fait
                            </Button>
                          ) : consultation.status === "effectuee" ? (
                            <Check size={20} color={MedicalColors.life} />
                          ) : null
                        )}
                        style={styles.consultationItem}
                      />
                    ))}
                  </Card.Content>
                </Card>
              </>
            )}
          </>
        ) : (
          <>
            {/* Section pédiatrique */}
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.cardTitle}>Ajouter un enfant</Text>
                <TextInput
                  label="Prénom"
                  value={childName}
                  onChangeText={setChildName}
                  mode="outlined"
                  outlineColor={MedicalColors.border}
                  activeOutlineColor={MedicalColors.maternity}
                  style={styles.input}
                />
                <TextInput
                  label="Date de naissance (YYYY-MM-DD)"
                  value={childBirthDate}
                  onChangeText={setChildBirthDate}
                  mode="outlined"
                  outlineColor={MedicalColors.border}
                  activeOutlineColor={MedicalColors.maternity}
                  style={styles.input}
                  placeholder="2024-06-15"
                />
                <Button
                  mode="contained"
                  onPress={handleAddChild}
                  style={styles.button}
                  buttonColor={MedicalColors.maternity}
                  disabled={!childName}
                >
                  Ajouter l'enfant
                </Button>
              </Card.Content>
            </Card>

            {/* Liste des enfants */}
            {maternityData.children.length > 0 && (
              <Card style={styles.card}>
                <Card.Content>
                  <Text style={styles.cardTitle}>Mes enfants</Text>
                  {maternityData.children.map((child) => (
                    <Surface key={child.id} style={styles.childCard}>
                      <Baby size={24} color={MedicalColors.maternity} />
                      <View style={styles.childInfo}>
                        <Text style={styles.childName}>{child.firstName}</Text>
                        {child.birthDate && (
                          <Text style={styles.childBirthDate}>Né(e) le {child.birthDate}</Text>
                        )}
                      </View>
                    </Surface>
                  ))}
                </Card.Content>
              </Card>
            )}

            {/* Calendrier de vaccination */}
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.cardTitle}>Calendrier de vaccination PEV</Text>
                {maternityData.vaccines.map((vaccine) => (
                  <List.Item
                    key={vaccine.id}
                    title={vaccine.name}
                    description={`${vaccine.age}${vaccine.doneDate ? ` - Fait le ${vaccine.doneDate}` : ""}`}
                    left={(props) => (
                      <List.Icon {...props} icon="needle" color={getVaccineStatusColor(vaccine.status)} />
                    )}
                    right={() => (
                      vaccine.status === "a_faire" ? (
                        <Button
                          mode="outlined"
                          onPress={() => markVaccineDone(vaccine.id, new Date().toISOString().split("T")[0])}
                          compact
                          textColor={MedicalColors.maternity}
                        >
                          Marquer fait
                        </Button>
                      ) : vaccine.status === "fait" ? (
                        <Check size={20} color={MedicalColors.life} />
                      ) : null
                    )}
                    style={styles.vaccineItem}
                  />
                ))}
              </Card.Content>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MedicalColors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: MedicalColors.white,
    borderBottomColor: MedicalColors.border,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: MedicalColors.maternity,
    marginBottom: 16,
  },
  tabContainer: {
    flexDirection: "row",
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: MedicalColors.background,
    gap: 6,
  },
  tabActive: {
    backgroundColor: MedicalColors.maternityLight,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: MedicalColors.textSecondary,
  },
  tabTextActive: {
    color: MedicalColors.maternity,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    backgroundColor: MedicalColors.white,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: MedicalColors.text,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: MedicalColors.textSecondary,
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: MedicalColors.background,
  },
  button: {
    marginTop: 8,
  },
  pregnancyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  weekNumber: {
    fontSize: 32,
    fontWeight: "bold",
    color: MedicalColors.maternity,
  },
  weekChip: {
    backgroundColor: MedicalColors.maternityLight,
  },
  weekChipText: {
    color: MedicalColors.maternity,
    fontWeight: "600",
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: MedicalColors.border,
  },
  pregnancyInfo: {
    marginTop: 12,
    gap: 4,
  },
  pregnancyInfoText: {
    fontSize: 14,
    color: MedicalColors.textSecondary,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  inputHalf: {
    flex: 1,
  },
  alertBox: {
    backgroundColor: MedicalColors.urgencyLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  alertText: {
    color: MedicalColors.urgencyDark,
    fontWeight: "600",
    fontSize: 14,
  },
  symptomsLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: MedicalColors.text,
    marginBottom: 8,
  },
  symptomsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  symptomChip: {
    backgroundColor: MedicalColors.background,
  },
  symptomChipSelected: {
    backgroundColor: MedicalColors.maternity,
  },
  symptomChipTextSelected: {
    color: MedicalColors.white,
  },
  consultationItem: {
    paddingVertical: 4,
  },
  vaccineItem: {
    paddingVertical: 4,
  },
  childCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: MedicalColors.background,
    marginBottom: 8,
  },
  childInfo: {
    marginLeft: 12,
  },
  childName: {
    fontSize: 16,
    fontWeight: "600",
    color: MedicalColors.text,
  },
  childBirthDate: {
    fontSize: 12,
    color: MedicalColors.textSecondary,
    marginTop: 2,
  },
});
