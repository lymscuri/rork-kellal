import * as z from "zod";
import { createTRPCRouter, protectedProcedure } from "../create-context";
import { getDb, genId } from "../db";
import type { PatientRecord } from "@/types/medical";

const allergySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["medicament", "alimentaire", "autre"]),
  severity: z.enum(["legere", "severe", "anaphylaxie"]),
});

const treatmentSchema = z.object({
  id: z.string(),
  medication: z.string(),
  dosage: z.string(),
  frequency: z.string(),
});

const surgerySchema = z.object({
  id: z.string(),
  name: z.string(),
  date: z.string(),
  hospital: z.string().optional(),
});

const hospitalizationSchema = z.object({
  id: z.string(),
  reason: z.string(),
  date: z.string(),
  duration: z.string().optional(),
  hospital: z.string().optional(),
});

const emergencyContactSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  relationship: z.string(),
  phoneNumber: z.string(),
});

const vitalSignsSchema = z.object({
  weight: z.number().optional(),
  height: z.number().optional(),
  bmi: z.number().optional(),
  temperature: z.number().optional(),
  systolicBP: z.number().optional(),
  diastolicBP: z.number().optional(),
  heartRate: z.number().optional(),
  spo2: z.number().optional(),
  respiratoryRate: z.number().optional(),
});

const clinicalExamSchema = z.object({
  system: z.string(),
  checked: z.boolean(),
  observation: z.string().optional(),
});

const prescriptionSchema = z.object({
  id: z.string(),
  nameDCI: z.string(),
  nameCommercial: z.string().optional(),
  dose: z.string(),
  unit: z.string(),
  frequency: z.array(z.string()),
  duration: z.string(),
  route: z.enum(["oral", "injectable", "topique"]),
  instructions: z.string().optional(),
  allergyAlert: z.boolean().optional(),
});

export const patientsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        identity: z.object({
          firstName: z.string(),
          lastName: z.string(),
          dossierNumber: z.string().optional(),
          birthDate: z.string().optional(),
          sex: z.enum(["M", "F"]).optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
          commune: z.string().optional(),
          prefecture: z.string().optional(),
          emergencyContacts: z.array(emergencyContactSchema).optional(),
          photo: z.string().optional(),
        }),
        userId: z.string().optional(),
        linkedEmail: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      const db = getDb();
      const id = genId();
      const dossierNumber =
        input.identity.dossierNumber ||
        `KNY-${new Date().getFullYear()}-${Math.floor(Math.random() * 99999).toString().padStart(5, "0")}`;

      const newPatient: PatientRecord = {
        id,
        userId: input.userId,
        linkedEmail: input.linkedEmail?.toLowerCase(),
        identity: {
          firstName: input.identity.firstName,
          lastName: input.identity.lastName,
          dossierNumber,
          emergencyContacts: input.identity.emergencyContacts || [],
          photo: input.identity.photo,
          birthDate: input.identity.birthDate,
          sex: input.identity.sex,
          phone: input.identity.phone,
          address: input.identity.address,
          commune: input.identity.commune,
          prefecture: input.identity.prefecture,
        },
        criticalInfo: {
          drugAllergies: [],
          foodAllergies: [],
          chronicDiseases: [],
          permanentTreatments: [],
        },
        personalHistory: {
          surgeries: [],
          hospitalizations: [],
          bloodTransfusion: false,
        },
        familyHistory: {
          diabetes: false,
          hypertension: false,
          cancer: false,
          sickleCell: false,
          hereditary: false,
        },
        lifeHabits: {
          tobacco: false,
          alcohol: false,
          physicalActivity: "moderee",
        },
        consultations: [],
        labResults: [],
        vaccines: [],
        doctorIds: [ctx.user.id],
        doctorId: ctx.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.patients.push(newPatient);
      console.log("[Patients] Created:", id, dossierNumber);
      return newPatient;
    }),

  listByDoctor: protectedProcedure.query(({ ctx }) => {
    const db = getDb();
    return db.patients.filter(
      (p) =>
        p.doctorId === ctx.user.id ||
        (p.doctorIds && p.doctorIds.includes(ctx.user.id))
    );
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const db = getDb();
      return db.patients.find((p) => p.id === input.id) ?? null;
    }),

  getByDossierNumber: protectedProcedure
    .input(z.object({ dossierNumber: z.string() }))
    .query(({ input }) => {
      const db = getDb();
      return (
        db.patients.find(
          (p) => p.identity.dossierNumber === input.dossierNumber
        ) ?? null
      );
    }),

  getByUserId: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => {
      const db = getDb();
      return db.patients.find((p) => p.userId === input.userId) ?? null;
    }),

  getByEmail: protectedProcedure
    .input(z.object({ email: z.string() }))
    .query(({ input }) => {
      const db = getDb();
      return (
        db.patients.find(
          (p) => p.linkedEmail === input.email.toLowerCase()
        ) ?? null
      );
    }),

  updateIdentity: protectedProcedure
    .input(
      z.object({
        patientId: z.string(),
        identity: z.object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          birthDate: z.string().optional(),
          sex: z.enum(["M", "F"]).optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
          commune: z.string().optional(),
          prefecture: z.string().optional(),
          emergencyContacts: z.array(emergencyContactSchema).optional(),
          photo: z.string().optional(),
        }),
      })
    )
    .mutation(({ input }) => {
      const db = getDb();
      const patient = db.patients.find((p) => p.id === input.patientId);
      if (!patient) throw new Error("Patient non trouvé");

      Object.assign(patient.identity, input.identity);
      patient.updatedAt = new Date().toISOString();
      return patient;
    }),

  updateCriticalInfo: protectedProcedure
    .input(
      z.object({
        patientId: z.string(),
        info: z.object({
          bloodGroup: z.string().optional(),
          rhFactor: z.enum(["Positif", "Négatif"]).optional(),
          drugAllergies: z.array(allergySchema).optional(),
          foodAllergies: z.array(allergySchema).optional(),
          chronicDiseases: z.array(z.string()).optional(),
          otherChronicDisease: z.string().optional(),
          permanentTreatments: z.array(treatmentSchema).optional(),
          handicap: z.string().optional(),
        }),
      })
    )
    .mutation(({ input }) => {
      const db = getDb();
      const patient = db.patients.find((p) => p.id === input.patientId);
      if (!patient) throw new Error("Patient non trouvé");

      Object.assign(patient.criticalInfo, input.info);
      patient.updatedAt = new Date().toISOString();
      return patient;
    }),

  updatePersonalHistory: protectedProcedure
    .input(
      z.object({
        patientId: z.string(),
        history: z.object({
          pastIllnesses: z.string().optional(),
          surgeries: z.array(surgerySchema).optional(),
          hospitalizations: z.array(hospitalizationSchema).optional(),
          bloodTransfusion: z.boolean().optional(),
          bloodTransfusionDate: z.string().optional(),
        }),
      })
    )
    .mutation(({ input }) => {
      const db = getDb();
      const patient = db.patients.find((p) => p.id === input.patientId);
      if (!patient) throw new Error("Patient non trouvé");

      Object.assign(patient.personalHistory, input.history);
      patient.updatedAt = new Date().toISOString();
      return patient;
    }),

  updateFamilyHistory: protectedProcedure
    .input(
      z.object({
        patientId: z.string(),
        history: z.object({
          diabetes: z.boolean().optional(),
          hypertension: z.boolean().optional(),
          cancer: z.boolean().optional(),
          sickleCell: z.boolean().optional(),
          hereditary: z.boolean().optional(),
        }),
      })
    )
    .mutation(({ input }) => {
      const db = getDb();
      const patient = db.patients.find((p) => p.id === input.patientId);
      if (!patient) throw new Error("Patient non trouvé");

      Object.assign(patient.familyHistory, input.history);
      patient.updatedAt = new Date().toISOString();
      return patient;
    }),

  updateLifeHabits: protectedProcedure
    .input(
      z.object({
        patientId: z.string(),
        habits: z.object({
          tobacco: z.boolean().optional(),
          tobaccoQuantity: z.string().optional(),
          alcohol: z.boolean().optional(),
          physicalActivity: z.enum(["sedentaire", "moderee", "active"]).optional(),
          specialDiet: z.string().optional(),
        }),
      })
    )
    .mutation(({ input }) => {
      const db = getDb();
      const patient = db.patients.find((p) => p.id === input.patientId);
      if (!patient) throw new Error("Patient non trouvé");

      Object.assign(patient.lifeHabits, input.habits);
      patient.updatedAt = new Date().toISOString();
      return patient;
    }),

  addConsultation: protectedProcedure
    .input(
      z.object({
        patientId: z.string(),
        consultation: z.object({
          doctorId: z.string(),
          doctorName: z.string(),
          date: z.string(),
          time: z.string(),
          reason: z.string(),
          vitalSigns: vitalSignsSchema,
          clinicalExams: z.array(clinicalExamSchema),
          mainDiagnosis: z.string(),
          differentialDiagnosis: z.string().optional(),
          treatment: z.string(),
          prescriptions: z.array(prescriptionSchema),
          requestedExams: z.array(z.string()),
          nextAppointment: z.string().optional(),
          referral: z.string().optional(),
          referralStructure: z.string().optional(),
          observations: z.string().optional(),
        }),
      })
    )
    .mutation(({ input }) => {
      const db = getDb();
      const patient = db.patients.find((p) => p.id === input.patientId);
      if (!patient) throw new Error("Patient non trouvé");

      const id = genId();
      const consultation = {
        ...input.consultation,
        id,
        patientId: input.patientId,
      };
      patient.consultations.unshift(consultation);
      patient.updatedAt = new Date().toISOString();
      console.log("[Patients] Consultation added:", id);
      return consultation;
    }),

  addLabResult: protectedProcedure
    .input(
      z.object({
        patientId: z.string(),
        result: z.object({
          examType: z.string(),
          date: z.string(),
          facility: z.string(),
          result: z.string(),
          unit: z.string().optional(),
          interpretation: z.string().optional(),
          photoUri: z.string().optional(),
          prescribedBy: z.string(),
        }),
      })
    )
    .mutation(({ input }) => {
      const db = getDb();
      const patient = db.patients.find((p) => p.id === input.patientId);
      if (!patient) throw new Error("Patient non trouvé");

      const id = genId();
      const labResult = {
        ...input.result,
        id,
        patientId: input.patientId,
      };
      patient.labResults.unshift(labResult);
      patient.updatedAt = new Date().toISOString();
      return labResult;
    }),

  addVaccine: protectedProcedure
    .input(
      z.object({
        patientId: z.string(),
        vaccine: z.object({
          name: z.string(),
          date: z.string(),
          facility: z.string(),
          doctor: z.string(),
          nextReminder: z.string().optional(),
          status: z.enum(["fait", "a_faire", "en_retard"]),
        }),
      })
    )
    .mutation(({ input }) => {
      const db = getDb();
      const patient = db.patients.find((p) => p.id === input.patientId);
      if (!patient) throw new Error("Patient non trouvé");

      const id = genId();
      const vaccine = {
        ...input.vaccine,
        id,
        patientId: input.patientId,
      };
      patient.vaccines.push(vaccine);
      patient.updatedAt = new Date().toISOString();
      return vaccine;
    }),

  linkToDoctor: protectedProcedure
    .input(
      z.object({
        dossierNumber: z.string(),
        doctorId: z.string(),
      })
    )
    .mutation(({ input }) => {
      const db = getDb();
      const patient = db.patients.find(
        (p) => p.identity.dossierNumber === input.dossierNumber
      );
      if (!patient) throw new Error("Patient non trouvé");

      const existingIds = patient.doctorIds || [patient.doctorId];
      if (!existingIds.includes(input.doctorId)) {
        patient.doctorIds = [...existingIds, input.doctorId];
        patient.doctorId = input.doctorId;
      }
      return { success: true };
    }),

  getDoctorStats: protectedProcedure.query(({ ctx }) => {
    const db = getDb();
    const patients = db.patients.filter(
      (p) =>
        p.doctorId === ctx.user.id ||
        (p.doctorIds && p.doctorIds.includes(ctx.user.id))
    );
    const now = new Date();
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    ).toISOString();
    let monthConsultations = 0;
    let monthPrescriptions = 0;

    patients.forEach((p) => {
      p.consultations.forEach((c) => {
        if (c.date >= monthStart) {
          monthConsultations++;
          if (c.prescriptions.length > 0) monthPrescriptions++;
        }
      });
    });

    return {
      totalPatients: patients.length,
      monthConsultations,
      monthPrescriptions,
      patientsFollowed: patients.length,
    };
  }),

  getMyRecord: protectedProcedure.query(({ ctx }) => {
    const db = getDb();
    return (
      db.patients.find((p) => p.userId === ctx.user.id) ??
      db.patients.find((p) => p.linkedEmail === ctx.user.email?.toLowerCase()) ??
      null
    );
  }),

  getMyPrescriptions: protectedProcedure.query(({ ctx }) => {
    const db = getDb();
    const patient =
      db.patients.find((p) => p.userId === ctx.user.id) ??
      db.patients.find((p) => p.linkedEmail === ctx.user.email?.toLowerCase());
    if (!patient) return [];
    return patient.consultations
      .filter((c) => c.prescriptions.length > 0)
      .map((c) => ({ consultation: c, prescriptions: c.prescriptions }));
  }),

  getQRCodeData: protectedProcedure.query(({ ctx }) => {
    const db = getDb();
    const patient =
      db.patients.find((p) => p.userId === ctx.user.id) ??
      db.patients.find((p) => p.linkedEmail === ctx.user.email?.toLowerCase());
    if (!patient) return JSON.stringify({ error: "Patient non trouvé" });

    return JSON.stringify({
      dossierNumber: patient.identity.dossierNumber,
      firstName: patient.identity.firstName,
      lastName: patient.identity.lastName,
      birthDate: patient.identity.birthDate,
      sex: patient.identity.sex,
      bloodGroup: patient.criticalInfo.bloodGroup,
      rhFactor: patient.criticalInfo.rhFactor,
      drugAllergies: patient.criticalInfo.drugAllergies.map((a) => ({
        name: a.name,
        severity: a.severity,
      })),
      foodAllergies: patient.criticalInfo.foodAllergies.map((a) => a.name),
      chronicDiseases: patient.criticalInfo.chronicDiseases,
      permanentTreatments: patient.criticalInfo.permanentTreatments.map(
        (t) => t.medication
      ),
      emergencyContacts: patient.identity.emergencyContacts.map((c) => ({
        name: c.fullName,
        phone: c.phoneNumber,
        relation: c.relationship,
      })),
    });
  }),
});
