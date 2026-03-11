import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { MedicalColors } from '@/constants/colors';
import { useMedicalStore } from '@/store/medicalStore';
import { Baby, Syringe, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react-native';
import type { PEVVaccine } from '@/types/medical';

export default function ChildTrackingScreen() {
  const { maternityPatients, markChildVaccineDone } = useMedicalStore();
  const myData = useMemo(() => maternityPatients[0] || null, [maternityPatients]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);

  const children = useMemo(() => myData?.children || [], [myData]);
  const activeChild = useMemo(() => {
    if (selectedChild) return children.find(c => c.id === selectedChild);
    return children[0] || null;
  }, [children, selectedChild]);

  const childVaccines = useMemo(() => {
    if (!activeChild || !myData) return [];
    return myData.childVaccines.filter(v => v.childId === activeChild.id);
  }, [activeChild, myData]);

  const growthRecords = useMemo(() => {
    if (!activeChild || !myData) return [];
    return myData.childGrowth.filter(g => g.childId === activeChild.id);
  }, [activeChild, myData]);

  const childAge = useMemo(() => {
    if (!activeChild) return '';
    const birth = new Date(activeChild.birthDate);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (months < 1) {
      const days = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
      return `${days} jours`;
    }
    if (months < 12) return `${months} mois`;
    const years = Math.floor(months / 12);
    const remainMonths = months % 12;
    return `${years} an${years > 1 ? 's' : ''}${remainMonths > 0 ? ` ${remainMonths} mois` : ''}`;
  }, [activeChild]);

  const handleMarkVaccine = useCallback((vaccine: PEVVaccine) => {
    Alert.alert('Vaccin administré', `Marquer "${vaccine.name}" comme fait ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', onPress: () => markChildVaccineDone(vaccine.id, new Date().toISOString()) },
    ]);
  }, [markChildVaccineDone]);

  const vaccineDone = childVaccines.filter(v => v.status === 'fait').length;
  const vaccineTotal = childVaccines.length;

  if (children.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Baby size={48} color={MedicalColors.border} />
        <Text style={styles.emptyTitle}>Aucun enfant enregistré</Text>
        <Text style={styles.emptySubtext}>Les enfants seront ajoutés par votre sage-femme après la naissance</Text>
      </View>
    );
  }

  const nextVaccine = childVaccines.find(v => v.status === 'a_faire');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {children.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childSelector}>
          {children.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.childChip, (selectedChild === c.id || (!selectedChild && c.id === children[0]?.id)) && styles.childChipActive]}
              onPress={() => setSelectedChild(c.id)}
            >
              <Text style={[styles.childChipText, (selectedChild === c.id || (!selectedChild && c.id === children[0]?.id)) && styles.childChipTextActive]}>
                {c.firstName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {activeChild && (
        <>
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Baby size={28} color={MedicalColors.maternity} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{activeChild.firstName}</Text>
              <Text style={styles.profileAge}>{childAge}</Text>
              <Text style={styles.profileBirth}>Né(e) le {new Date(activeChild.birthDate).toLocaleDateString('fr-FR')}</Text>
            </View>
          </View>

          <View style={styles.birthStats}>
            {activeChild.birthWeight && (
              <View style={styles.birthStat}>
                <Text style={styles.birthStatValue}>{activeChild.birthWeight} g</Text>
                <Text style={styles.birthStatLabel}>Poids naissance</Text>
              </View>
            )}
            {activeChild.birthHeight && (
              <View style={styles.birthStat}>
                <Text style={styles.birthStatValue}>{activeChild.birthHeight} cm</Text>
                <Text style={styles.birthStatLabel}>Taille naissance</Text>
              </View>
            )}
            {activeChild.headCircumference && (
              <View style={styles.birthStat}>
                <Text style={styles.birthStatValue}>{activeChild.headCircumference} cm</Text>
                <Text style={styles.birthStatLabel}>PC naissance</Text>
              </View>
            )}
          </View>

          {nextVaccine && (
            <View style={styles.nextVaccineCard}>
              <Syringe size={20} color={MedicalColors.maternity} />
              <View style={styles.nextVaccineInfo}>
                <Text style={styles.nextVaccineLabel}>Prochain vaccin</Text>
                <Text style={styles.nextVaccineName}>{nextVaccine.name} — {nextVaccine.targetAge}</Text>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Syringe size={18} color={MedicalColors.maternity} />
              <Text style={styles.sectionTitle}>Calendrier PEV guinéen</Text>
            </View>
            <View style={styles.vaccineProgress}>
              <Text style={styles.vaccineProgressText}>{vaccineDone} / {vaccineTotal} vaccins</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${vaccineTotal > 0 ? (vaccineDone / vaccineTotal) * 100 : 0}%` }]} />
              </View>
            </View>

            {childVaccines.map(v => (
              <View key={v.id} style={styles.vaccineCard}>
                <View style={[styles.vaccineIndicator, v.status === 'fait' ? styles.indicatorDone : v.status === 'en_retard' ? styles.indicatorLate : styles.indicatorPending]} />
                <View style={styles.vaccineInfo}>
                  <Text style={styles.vaccineName}>{v.name}</Text>
                  <Text style={styles.vaccineAge}>{v.targetAge}</Text>
                  {v.note && <Text style={styles.vaccineNote}>{v.note}</Text>}
                  {v.doneDate && <Text style={styles.vaccineDoneDate}>Fait le {new Date(v.doneDate).toLocaleDateString('fr-FR')}</Text>}
                </View>
                {v.status === 'fait' ? (
                  <CheckCircle size={20} color={MedicalColors.life} />
                ) : v.status === 'en_retard' ? (
                  <AlertTriangle size={20} color={MedicalColors.urgency} />
                ) : (
                  <TouchableOpacity onPress={() => handleMarkVaccine(v)} style={styles.markVaccineBtn}>
                    <Clock size={16} color={MedicalColors.maternity} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {growthRecords.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <TrendingUp size={18} color={MedicalColors.life} />
                <Text style={styles.sectionTitle}>Courbe de croissance</Text>
              </View>
              {growthRecords.map(r => (
                <View key={r.id} style={styles.growthRow}>
                  <Text style={styles.growthDate}>{new Date(r.date).toLocaleDateString('fr-FR')}</Text>
                  {r.weight && <Text style={styles.growthValue}>{r.weight} kg</Text>}
                  {r.height && <Text style={styles.growthValue}>{r.height} cm</Text>}
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MedicalColors.background },
  content: { padding: 16, paddingBottom: 40 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600' as const, color: MedicalColors.text, marginTop: 16 },
  emptySubtext: { fontSize: 13, color: MedicalColors.textSecondary, textAlign: 'center', marginTop: 8 },
  childSelector: { marginBottom: 16 },
  childChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: MedicalColors.white, marginRight: 8, borderWidth: 1, borderColor: MedicalColors.border },
  childChipActive: { backgroundColor: MedicalColors.maternity, borderColor: MedicalColors.maternity },
  childChipText: { fontSize: 14, fontWeight: '600' as const, color: MedicalColors.text },
  childChipTextActive: { color: MedicalColors.white },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: MedicalColors.white, borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: MedicalColors.border },
  profileAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: MedicalColors.maternityLight, justifyContent: 'center', alignItems: 'center' },
  profileInfo: { marginLeft: 16 },
  profileName: { fontSize: 20, fontWeight: '700' as const, color: MedicalColors.text },
  profileAge: { fontSize: 14, color: MedicalColors.maternity, fontWeight: '600' as const, marginTop: 2 },
  profileBirth: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 2 },
  birthStats: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  birthStat: { flex: 1, backgroundColor: MedicalColors.white, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: MedicalColors.border },
  birthStatValue: { fontSize: 16, fontWeight: '700' as const, color: MedicalColors.text },
  birthStatLabel: { fontSize: 10, color: MedicalColors.textSecondary, marginTop: 2, textAlign: 'center' },
  nextVaccineCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: MedicalColors.maternityLight, borderRadius: 12, padding: 14, marginBottom: 16 },
  nextVaccineInfo: { flex: 1 },
  nextVaccineLabel: { fontSize: 11, color: MedicalColors.textSecondary },
  nextVaccineName: { fontSize: 14, fontWeight: '600' as const, color: MedicalColors.maternity },
  section: { backgroundColor: MedicalColors.white, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: MedicalColors.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' as const, color: MedicalColors.text },
  vaccineProgress: { marginBottom: 14 },
  vaccineProgressText: { fontSize: 13, fontWeight: '600' as const, color: MedicalColors.text, marginBottom: 6 },
  progressBar: { height: 6, backgroundColor: MedicalColors.background, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: MedicalColors.maternity, borderRadius: 3 },
  vaccineCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: MedicalColors.background },
  vaccineIndicator: { width: 6, height: 36, borderRadius: 3, marginRight: 12 },
  indicatorDone: { backgroundColor: MedicalColors.life },
  indicatorLate: { backgroundColor: MedicalColors.urgency },
  indicatorPending: { backgroundColor: MedicalColors.warning },
  vaccineInfo: { flex: 1 },
  vaccineName: { fontSize: 14, fontWeight: '600' as const, color: MedicalColors.text },
  vaccineAge: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 1 },
  vaccineNote: { fontSize: 11, color: MedicalColors.urgency, marginTop: 2, fontWeight: '600' as const },
  vaccineDoneDate: { fontSize: 11, color: MedicalColors.life, marginTop: 2 },
  markVaccineBtn: { padding: 8, backgroundColor: MedicalColors.maternityLight, borderRadius: 16 },
  growthRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: MedicalColors.background },
  growthDate: { fontSize: 13, color: MedicalColors.textSecondary },
  growthValue: { fontSize: 13, fontWeight: '600' as const, color: MedicalColors.text },
});
