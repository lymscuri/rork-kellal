import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput as RNTextInput } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { MedicalColors } from '@/constants/colors';
import { useAuthStore } from '@/store/authStore';
import { useMedicalStore } from '@/store/medicalStore';
import {
  User, Mail, Phone, Users, FileText, Baby,
  Edit2, Save, LogOut, QrCode
} from 'lucide-react-native';

export default function ProfilScreen() {
  const { user, logout } = useAuthStore();
  const { patients, maternityPatients } = useMedicalStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user?.firstName || '');
  const [editedLastName, setEditedLastName] = useState(user?.lastName || '');
  const [editedPhone, setEditedPhone] = useState(user?.phone || '');

  // Statistiques pour médecin
  const stats = useMemo(() => {
    if (user?.role !== 'medecin') return null;

    const myPatients = patients.filter(p => p.doctorId === user.id);
    const totalConsultations = myPatients.reduce((sum, p) => sum + p.consultations.length, 0);
    const myMaternityPatients = maternityPatients.filter(p => !p.soignantId || p.soignantId === user.id);

    return {
      totalPatients: myPatients.length,
      totalConsultations,
      maternityPatients: myMaternityPatients.length,
    };
  }, [user, patients, maternityPatients]);

  // Données médicales pour le QR Code (patients uniquement)
  const myRecord = useMemo(() => {
    if (!user) return null;
    return patients.find(p => p.userId === user.id);
  }, [user, patients]);

  const myMaternity = useMemo(() => {
    if (!user) return null;
    return maternityPatients.find(p => p.userId === user.id);
  }, [user, maternityPatients]);

  const qrData = useMemo(() => {
    if (!user || user.role !== 'patient') return '';

    const medicalData = {
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      phone: user.phone || '',
      dossier: {
        bloodType: myRecord?.criticalInfo?.bloodGroup || '',
        drugAllergies: myRecord?.criticalInfo?.drugAllergies || [],
        chronicDiseases: myRecord?.criticalInfo?.chronicDiseases || [],
        permanentTreatments: myRecord?.criticalInfo?.permanentTreatments || [],
      },
      maternity: myMaternity ? {
        isPregnant: myMaternity.pregnancy?.isActive || false,
        currentWeek: myMaternity.pregnancy?.currentWeek || 0,
        dueDate: myMaternity.pregnancy?.dueDate || '',
      } : null,
    };

    // Encoder en base64 (sans URL, juste le base64)
    const jsonString = JSON.stringify(medicalData);
    const base64Data = btoa(unescape(encodeURIComponent(jsonString)));

    return base64Data;
  }, [user, myRecord, myMaternity]);

  const getInitials = () => {
    if (!user) return '??';
    const firstInitial = user.firstName?.charAt(0) || '';
    const lastInitial = user.lastName?.charAt(0) || '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
  };

  const getAvatarColor = () => {
    return user?.role === 'medecin' ? '#0D6EFD' : '#28A745';
  };

  const getRoleDisplay = () => {
    if (user?.role === 'medecin') return 'Médecin';
    return 'Patient';
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      // TODO: Appeler authAPI.updateProfile() quand disponible
      // await authAPI.updateProfile({
      //   firstName: editedName,
      //   lastName: editedLastName,
      //   phone: editedPhone
      // });

      Alert.alert('Succès', 'Profil mis à jour avec succès');
      setIsEditing(false);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le profil');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Se déconnecter',
          style: 'destructive',
          onPress: () => logout()
        },
      ]
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucun utilisateur connecté</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header avec avatar */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Mon Profil</Text>
        </View>

        {/* Avatar avec initiales */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: getAvatarColor() }]}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          <Text style={styles.userName}>
            {user.firstName} {user.lastName}
          </Text>
          <Text style={styles.userRole}>{getRoleDisplay()}</Text>
        </View>

        {/* Section Mes informations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={20} color={MedicalColors.medical} />
            <Text style={styles.sectionTitle}>Mes informations</Text>
            {!isEditing && (
              <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
                <Edit2 size={18} color={MedicalColors.medical} />
                <Text style={styles.editButtonText}>Modifier</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.infoCard}>
            {/* Prénom */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Prénom</Text>
              {isEditing ? (
                <RNTextInput
                  style={styles.input}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Prénom"
                  placeholderTextColor={MedicalColors.textSecondary}
                />
              ) : (
                <Text style={styles.infoValue}>{user.firstName}</Text>
              )}
            </View>

            {/* Nom */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nom</Text>
              {isEditing ? (
                <RNTextInput
                  style={styles.input}
                  value={editedLastName}
                  onChangeText={setEditedLastName}
                  placeholder="Nom"
                  placeholderTextColor={MedicalColors.textSecondary}
                />
              ) : (
                <Text style={styles.infoValue}>{user.lastName}</Text>
              )}
            </View>

            {/* Email (read-only) */}
            <View style={styles.infoRow}>
              <Mail size={16} color={MedicalColors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={[styles.infoValue, styles.readOnly]}>{user.email}</Text>
              </View>
            </View>

            {/* Téléphone */}
            <View style={styles.infoRow}>
              <Phone size={16} color={MedicalColors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Téléphone</Text>
                {isEditing ? (
                  <RNTextInput
                    style={styles.input}
                    value={editedPhone}
                    onChangeText={setEditedPhone}
                    placeholder="Téléphone"
                    placeholderTextColor={MedicalColors.textSecondary}
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text style={styles.infoValue}>{user.phone || 'Non renseigné'}</Text>
                )}
              </View>
            </View>

            {isEditing && (
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                activeOpacity={0.7}
              >
                <Save size={18} color={MedicalColors.white} />
                <Text style={styles.saveButtonText}>Enregistrer</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Section Statistiques (médecin uniquement) */}
        {user.role === 'medecin' && stats && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <FileText size={20} color={MedicalColors.medical} />
              <Text style={styles.sectionTitle}>Statistiques</Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
                <View style={[styles.statIconBg, { backgroundColor: MedicalColors.medical }]}>
                  <Users size={24} color={MedicalColors.white} />
                </View>
                <Text style={styles.statValue}>{stats.totalPatients}</Text>
                <Text style={styles.statLabel}>Patients</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: '#E8F5E9' }]}>
                <View style={[styles.statIconBg, { backgroundColor: MedicalColors.life }]}>
                  <FileText size={24} color={MedicalColors.white} />
                </View>
                <Text style={styles.statValue}>{stats.totalConsultations}</Text>
                <Text style={styles.statLabel}>Consultations</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: '#FCE4EC' }]}>
                <View style={[styles.statIconBg, { backgroundColor: MedicalColors.maternity }]}>
                  <Baby size={24} color={MedicalColors.white} />
                </View>
                <Text style={styles.statValue}>{stats.maternityPatients}</Text>
                <Text style={styles.statLabel}>Patientes maternité</Text>
              </View>
            </View>
          </View>
        )}

        {/* Section QR Code Médical (patients uniquement) */}
        {user.role === 'patient' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <QrCode size={20} color={MedicalColors.medical} />
              <Text style={styles.sectionTitle}>Mon QR Code Médical</Text>
            </View>

            <View style={styles.qrCodeCard}>
              <Text style={styles.qrCodeSubtitle}>
                Montrez ce code à votre médecin pour partager votre dossier
              </Text>
              <View style={styles.qrCodeContainer}>
                <QRCode
                  value={qrData}
                  size={200}
                  backgroundColor="white"
                  color="black"
                />
              </View>
              <Text style={styles.qrCodeWarning}>
                ⚠️ Ne partagez ce code qu'avec des professionnels de santé de confiance
              </Text>
            </View>
          </View>
        )}

        {/* Bouton Se déconnecter */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <LogOut size={20} color={MedicalColors.white} />
            <Text style={styles.logoutButtonText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: MedicalColors.textSecondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: MedicalColors.white,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: MedicalColors.white,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: MedicalColors.white,
    marginBottom: 4,
  },
  userRole: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: MedicalColors.white,
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(13,110,253,0.15)',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: MedicalColors.medical,
  },
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: MedicalColors.white,
  },
  infoContent: {
    flex: 1,
  },
  readOnly: {
    color: 'rgba(255,255,255,0.8)',
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: MedicalColors.white,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: MedicalColors.medical,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: MedicalColors.life,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: MedicalColors.white,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: MedicalColors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: MedicalColors.textSecondary,
    textAlign: 'center',
  },
  qrCodeCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  qrCodeSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  qrCodeContainer: {
    backgroundColor: MedicalColors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  qrCodeText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  qrCodeWarning: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFA500',
    textAlign: 'center',
    paddingHorizontal: 12,
    lineHeight: 18,
  },
  logoutSection: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#DC3545',
    borderRadius: 12,
    paddingVertical: 16,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: MedicalColors.white,
  },
  bottomSpacer: {
    height: 20,
  },
});
