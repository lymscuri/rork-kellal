import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Modal } from 'react-native';
import { Text } from 'react-native-paper';
import { MedicalColors } from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import { useMedicalStore } from '@/store/medicalStore';
import { ClipboardList, X, Maximize2 } from 'lucide-react-native';
import type { ConsultationRecord, PrescriptionItem } from '@/types/medical';

export default function PrescriptionsScreen() {
  const { user } = useAuthStore();
  const { getMyPrescriptions } = useMedicalStore();
  const [fullscreenPresc, setFullscreenPresc] = useState<{ consultation: ConsultationRecord; prescriptions: PrescriptionItem[] } | null>(null);

  const allPatients = useMedicalStore((s) => s.patients);

  const prescriptions = useMemo(() => {
    if (!user) return [];
    return getMyPrescriptions(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, allPatients, getMyPrescriptions]);

  const renderItem = ({ item }: { item: { consultation: ConsultationRecord; prescriptions: PrescriptionItem[] } }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardDate}>{new Date(item.consultation.date).toLocaleDateString('fr-FR')}</Text>
          <Text style={styles.cardDoctor}>Dr. {item.consultation.doctorName}</Text>
        </View>
        <TouchableOpacity onPress={() => setFullscreenPresc(item)} style={styles.expandBtn}>
          <Maximize2 size={18} color={MedicalColors.medical} />
        </TouchableOpacity>
      </View>
      <Text style={styles.diagnosis}>{item.consultation.mainDiagnosis}</Text>
      {item.prescriptions.map((p, i) => (
        <View key={p.id} style={styles.medItem}>
          <Text style={styles.medName}>{i + 1}. {p.nameDCI} {p.nameCommercial ? `(${p.nameCommercial})` : ''}</Text>
          <Text style={styles.medDetail}>{p.dose} — {p.frequency.join(', ')} — {p.duration} — voie {p.route}</Text>
          {p.instructions && <Text style={styles.medInstructions}>{p.instructions}</Text>}
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      {prescriptions.length === 0 ? (
        <View style={styles.empty}>
          <ClipboardList size={48} color={MedicalColors.border} />
          <Text style={styles.emptyText}>Aucune ordonnance</Text>
          <Text style={styles.emptySubtext}>Vos ordonnances apparaîtront ici après une consultation</Text>
        </View>
      ) : (
        <FlatList
          data={prescriptions}
          keyExtractor={(_, i) => i.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Modal visible={!!fullscreenPresc} animationType="slide" onRequestClose={() => setFullscreenPresc(null)}>
        <View style={styles.fullscreen}>
          <View style={styles.fullscreenHeader}>
            <Text style={styles.fullscreenTitle}>Ordonnance</Text>
            <TouchableOpacity onPress={() => setFullscreenPresc(null)}>
              <X size={24} color={MedicalColors.text} />
            </TouchableOpacity>
          </View>
          {fullscreenPresc && (
            <View style={styles.fullscreenContent}>
              <Text style={styles.fullscreenDate}>{new Date(fullscreenPresc.consultation.date).toLocaleDateString('fr-FR')}</Text>
              <Text style={styles.fullscreenDoctor}>Dr. {fullscreenPresc.consultation.doctorName}</Text>
              <Text style={styles.fullscreenDiag}>{fullscreenPresc.consultation.mainDiagnosis}</Text>
              <View style={styles.fullscreenDivider} />
              {fullscreenPresc.prescriptions.map((p, i) => (
                <View key={p.id} style={styles.fullscreenMed}>
                  <Text style={styles.fullscreenMedName}>{i + 1}. {p.nameDCI}</Text>
                  <Text style={styles.fullscreenMedDetail}>{p.dose} — {p.frequency.join(', ')}</Text>
                  <Text style={styles.fullscreenMedDetail}>Durée : {p.duration} — Voie : {p.route}</Text>
                  {p.instructions && <Text style={styles.fullscreenMedInstr}>{p.instructions}</Text>}
                </View>
              ))}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: MedicalColors.background },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, fontWeight: '600' as const, color: MedicalColors.text, marginTop: 16 },
  emptySubtext: { fontSize: 13, color: MedicalColors.textSecondary, marginTop: 4, textAlign: 'center' },
  listContent: { padding: 16 },
  card: { backgroundColor: MedicalColors.white, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: MedicalColors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardDate: { fontSize: 14, fontWeight: '600' as const, color: MedicalColors.medical },
  cardDoctor: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 2 },
  expandBtn: { padding: 6 },
  diagnosis: { fontSize: 15, fontWeight: '600' as const, color: MedicalColors.text, marginBottom: 10 },
  medItem: { backgroundColor: MedicalColors.background, borderRadius: 8, padding: 10, marginBottom: 6 },
  medName: { fontSize: 14, fontWeight: '600' as const, color: MedicalColors.text },
  medDetail: { fontSize: 12, color: MedicalColors.textSecondary, marginTop: 2 },
  medInstructions: { fontSize: 12, color: MedicalColors.life, marginTop: 2, fontStyle: 'italic' },
  fullscreen: { flex: 1, backgroundColor: MedicalColors.white },
  fullscreenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: MedicalColors.border },
  fullscreenTitle: { fontSize: 20, fontWeight: '700' as const, color: MedicalColors.text },
  fullscreenContent: { padding: 24 },
  fullscreenDate: { fontSize: 16, fontWeight: '600' as const, color: MedicalColors.medical },
  fullscreenDoctor: { fontSize: 14, color: MedicalColors.textSecondary, marginTop: 4 },
  fullscreenDiag: { fontSize: 18, fontWeight: '700' as const, color: MedicalColors.text, marginTop: 12 },
  fullscreenDivider: { height: 1, backgroundColor: MedicalColors.border, marginVertical: 20 },
  fullscreenMed: { marginBottom: 16 },
  fullscreenMedName: { fontSize: 16, fontWeight: '600' as const, color: MedicalColors.text },
  fullscreenMedDetail: { fontSize: 14, color: MedicalColors.textSecondary, marginTop: 4 },
  fullscreenMedInstr: { fontSize: 13, color: MedicalColors.life, marginTop: 4, fontStyle: 'italic' },
});
