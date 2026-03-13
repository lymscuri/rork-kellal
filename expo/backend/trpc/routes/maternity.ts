import * as z from "zod";
import { createTRPCRouter, protectedProcedure } from "../create-context";
import { getDb, genId } from "../db";
import type {
  MaternityPatient,
  PrenatalConsultation,
  PEVVaccine,
} from "@/types/medical";

const DEFAULT_PRENATAL_CONSULTATIONS = [
  { weekTarget: 8, description: "Première consultation prénatale — prise de sang, examen général", status: "a_venir" as const },
  { weekTarget: 12, description: "Échographie T1 — datation, clarté nucale", status: "a_venir" as const },
  { weekTarget: 20, description: "Échographie T2 — morphologie fœtale", status: "a_venir" as const },
  { weekTarget: 28, description: "Consultation 7e mois — test O'Sullivan, Rhésus", status: "a_venir" as const },
  { weekTarget: 32, description: "Échographie T3 — présentation, croissance", status: "a_venir" as const },
  { weekTarget: 36, description: "Consultation 8e mois — prélèvement vaginal", status: "a_venir" as const },
  { weekTarget: 38, description: "Consultation pré-accouchement", status: "a_venir" as const },
  { weekTarget: 40, description: "Terme prévu — surveillance renforcée", status: "a_venir" as const },
];

const GUINEA_PEV_VACCINES = [
  { name: "BCG", targetAge: "Naissance", status: "a_faire" as const },
  { name: "VPO0", targetAge: "Naissance", status: "a_faire" as const },
  { name: "Pentavalent 1", targetAge: "6 semaines", status: "a_faire" as const },
  { name: "Pneumocoque 1", targetAge: "6 semaines", status: "a_faire" as const },
  { name: "Pentavalent 2", targetAge: "10 semaines", status: "a_faire" as const },
  { name: "Pneumocoque 2", targetAge: "10 semaines", status: "a_faire" as const },
  { name: "Pentavalent 3", targetAge: "14 semaines", status: "a_faire" as const },
  { name: "Pneumocoque 3", targetAge: "14 semaines", status: "a_faire" as const },
  { name: "Fièvre jaune", targetAge: "9 mois", status: "a_faire" as const },
  { name: "Rougeole 1ère dose", targetAge: "9 mois", status: "a_faire" as const },
  { name: "Méningite A", targetAge: "12-23 mois", status: "a_faire" as const },
  { name: "Rougeole 2ème dose", targetAge: "15-18 mois", status: "a_faire" as const },
  { name: "DTC rappel", targetAge: "18 mois", status: "a_faire" as const },
];

export const maternityRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        pregnancy: z.object({
          firstName: z.string(),
          age: z.number(),
          lastPeriodDate: z.string().optional(),
          dueDate: z.string().optional(),
          currentWeek: z.number(),
          gravidity: z.number(),
          parity: z.number(),
          previousPregnancies: z.array(z.string()),
          deliveryPlace: z.string(),
          referentDoctor: z.string().optional(),
          isActive: z.boolean(),
        }),
        userId: z.string().optional(),
        linkedEmail: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      const db = getDb();
      const id = genId();
      const pregnancyId = genId();

      const consultations: PrenatalConsultation[] = DEFAULT_PRENATAL_CONSULTATIONS.map((c) => ({
        ...c,
        id: genId(),
        pregnancyId,
      }));

      const newPatient: MaternityPatient = {
        id,
        userId: input.userId,
        linkedEmail: input.linkedEmail?.toLowerCase(),
        pregnancy: { ...input.pregnancy, id: pregnancyId, patientId: id },
        weeklyCheckups: [],
        prenatalConsultations: consultations,
        prenatalExams: [],
        children: [],
        childGrowth: [],
        childVaccines: [],
        alertLevel: "vert",
        soignantId: ctx.user.id,
      };

      db.maternityPatients.push(newPatient);
      console.log("[Maternity] Patient created:", id);
      return newPatient;
    }),

  listByDoctor: protectedProcedure.query(({ ctx }) => {
    const db = getDb();
    return db.maternityPatients.filter(
      (p) => !p.soignantId || p.soignantId === ctx.user.id
    );
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const db = getDb();
      return db.maternityPatients.find((p) => p.id === input.id) ?? null;
    }),

  getMyData: protectedProcedure.query(({ ctx }) => {
    const db = getDb();
    return (
      db.maternityPatients.find((p) => p.userId === ctx.user.id) ??
      db.maternityPatients.find(
        (p) => p.linkedEmail === ctx.user.email?.toLowerCase()
      ) ??
      null
    );
  }),

  addWeeklyCheckup: protectedProcedure
    .input(
      z.object({
        patientId: z.string(),
        checkup: z.object({
          week: z.number(),
          date: z.string(),
          weight: z.number().optional(),
          systolicBP: z.number().optional(),
          diastolicBP: z.number().optional(),
          symptoms: z.array(z.string()),
          fetalMovements: z.enum(["actifs", "normaux", "reduits", "absents"]).optional(),
          mood: z.enum(["bien", "fatigue", "anxieux"]).optional(),
        }),
      })
    )
    .mutation(({ input }) => {
      const db = getDb();
      const patient = db.maternityPatients.find((p) => p.id === input.patientId);
      if (!patient) throw new Error("Patiente non trouvée");

      const id = genId();
      const newCheckup = {
        ...input.checkup,
        id,
        pregnancyId: patient.pregnancy.id,
      };

      let alertLevel: MaternityPatient["alertLevel"] = "vert";
      if (input.checkup.systolicBP && input.checkup.systolicBP >= 140) alertLevel = "rouge";
      else if (input.checkup.diastolicBP && input.checkup.diastolicBP >= 90) alertLevel = "rouge";
      else if (input.checkup.fetalMovements === "absents") alertLevel = "rouge";
      else if (input.checkup.fetalMovements === "reduits") alertLevel = "jaune";
      else if (input.checkup.symptoms?.includes("Saignements")) alertLevel = "rouge";

      patient.weeklyCheckups.push(newCheckup);
      patient.alertLevel = alertLevel;
      return newCheckup;
    }),

  markConsultationDone: protectedProcedure
    .input(
      z.object({
        patientId: z.string(),
        consultationId: z.string(),
        date: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      const db = getDb();
      const patient = db.maternityPatients.find((p) => p.id === input.patientId);
      if (!patient) throw new Error("Patiente non trouvée");

      const consultation = patient.prenatalConsultations.find(
        (c) => c.id === input.consultationId
      );
      if (consultation) {
        consultation.status = "effectuee";
        consultation.actualDate = input.date;
        if (input.notes) consultation.notes = input.notes;
      }
      return { success: true };
    }),

  scheduleConsultation: protectedProcedure
    .input(
      z.object({
        patientId: z.string(),
        consultationId: z.string(),
        scheduledDate: z.string(),
      })
    )
    .mutation(({ input }) => {
      const db = getDb();
      const patient = db.maternityPatients.find((p) => p.id === input.patientId);
      if (!patient) throw new Error("Patiente non trouvée");

      const consultation = patient.prenatalConsultations.find(
        (c) => c.id === input.consultationId
      );
      if (consultation) {
        consultation.scheduledDate = input.scheduledDate;
      }
      return { success: true };
    }),

  addPrenatalExam: protectedProcedure
    .input(
      z.object({
        patientId: z.string(),
        exam: z.object({
          date: z.string(),
          week: z.number(),
          weight: z.number().optional(),
          systolicBP: z.number().optional(),
          diastolicBP: z.number().optional(),
          uterineHeight: z.number().optional(),
          fetalHeartRate: z.number().optional(),
          fetalPresentation: z.enum(["cephalique", "siege", "transverse"]).optional(),
          labResults: z.array(z.string()),
          ultrasound: z.string().optional(),
          prescriptions: z.array(z.string()),
          observations: z.string().optional(),
          markedDone: z.boolean(),
        }),
      })
    )
    .mutation(({ input }) => {
      const db = getDb();
      const patient = db.maternityPatients.find((p) => p.id === input.patientId);
      if (!patient) throw new Error("Patiente non trouvée");

      const id = genId();
      const exam = {
        ...input.exam,
        id,
        pregnancyId: patient.pregnancy.id,
      };
      patient.prenatalExams.push(exam);
      return exam;
    }),

  addChild: protectedProcedure
    .input(
      z.object({
        patientId: z.string(),
        child: z.object({
          firstName: z.string(),
          birthDate: z.string(),
          birthWeight: z.number().optional(),
          birthHeight: z.number().optional(),
          headCircumference: z.number().optional(),
          apgarScore: z.number().optional(),
        }),
      })
    )
    .mutation(({ input }) => {
      const db = getDb();
      const patient = db.maternityPatients.find((p) => p.id === input.patientId);
      if (!patient) throw new Error("Patiente non trouvée");

      const id = genId();
      const child = { ...input.child, id, parentId: input.patientId };
      patient.children.push(child);

      const vaccines: PEVVaccine[] = GUINEA_PEV_VACCINES.map((v) => ({
        ...v,
        id: genId(),
        childId: id,
      }));
      patient.childVaccines.push(...vaccines);

      return { child, vaccines };
    }),

  addChildGrowth: protectedProcedure
    .input(
      z.object({
        childId: z.string(),
        record: z.object({
          date: z.string(),
          weight: z.number().optional(),
          height: z.number().optional(),
          headCircumference: z.number().optional(),
          notes: z.string().optional(),
        }),
      })
    )
    .mutation(({ input }) => {
      const db = getDb();
      const patient = db.maternityPatients.find((p) =>
        p.children.some((c) => c.id === input.childId)
      );
      if (!patient) throw new Error("Enfant non trouvé");

      const id = genId();
      const record = { ...input.record, id, childId: input.childId };
      patient.childGrowth.push(record);
      return record;
    }),

  markChildVaccineDone: protectedProcedure
    .input(
      z.object({
        vaccineId: z.string(),
        date: z.string(),
        facility: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      const db = getDb();
      for (const patient of db.maternityPatients) {
        const vaccine = patient.childVaccines.find((v) => v.id === input.vaccineId);
        if (vaccine) {
          vaccine.status = "fait";
          vaccine.doneDate = input.date;
          if (input.facility) vaccine.facility = input.facility;
          return { success: true };
        }
      }
      throw new Error("Vaccin non trouvé");
    }),
});
