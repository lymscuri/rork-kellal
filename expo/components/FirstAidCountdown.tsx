// Compte à rebours visible + vibration à la fin.
// Partagé entre l'écran protocole (app/firstaid/[id].tsx) et le chat urgence.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Vibration } from 'react-native';
import { MedicalColors } from '@/constants/colors';

export function FirstAidCountdown({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);
  const firedRef = useRef(false);

  useEffect(() => {
    setRemaining(seconds);
    firedRef.current = false;
    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(interval);
          if (!firedRef.current) {
            firedRef.current = true;
            Vibration.vibrate(800);
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  return (
    <View style={styles.timerWrap}>
      <Text style={styles.timerText}>
        {mm}:{ss}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  timerWrap: {
    alignSelf: 'center',
    backgroundColor: MedicalColors.dark,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  timerText: { color: MedicalColors.white, fontSize: 40, fontWeight: '800', letterSpacing: 2 },
});
