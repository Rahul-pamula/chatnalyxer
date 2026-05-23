import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, shadows } from '../src/theme/colors';
import { useAuth } from '../src/context/AuthContext';
import { BASE_URL } from '../src/config';

// Fix for web globals
declare const window: any;

export default function ConsentScreen() {
  const router = useRouter();
  const { token, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  const [consentWhatsApp, setConsentWhatsApp] = useState(true);
  const [consentEmail, setConsentEmail] = useState(true);

  useEffect(() => {
    (async () => {
      if (!token) {
        router.replace('/login');
        return;
      }
      try {
        const res = await fetch(`${BASE_URL}/consent/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.consent_accepted === true) {
            router.replace('/setup');
            return;
          }
          // Defaults
          if (typeof data?.consent_whatsapp === 'boolean') setConsentWhatsApp(data.consent_whatsapp);
          if (typeof data?.consent_email === 'boolean') setConsentEmail(data.consent_email);
        }
      } catch (e) {
        // ignore, show screen
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const onAccept = async () => {
    if (!consentWhatsApp && !consentEmail) {
      if (Platform.OS === 'web') {
        (window as any).alert('Select at least one permission (WhatsApp or Email).');
      } else {
        Alert.alert('Required', 'Select at least one permission (WhatsApp or Email).');
      }
      return;
    }

    setAccepting(true);
    try {
      const res = await fetch(`${BASE_URL}/consent/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          consent_version: 'v1',
          consent_whatsapp: consentWhatsApp,
          consent_email: consentEmail
        })
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to accept consent');
      }

      await refreshUser();
      router.replace('/setup');
    } catch (e: any) {
      const msg = e?.message || 'Failed to accept consent';
      if (Platform.OS === 'web') {
        (window as any).alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Terms & Data Permissions</Text>
        <Text style={styles.subtitle}>
          Please review and accept before connecting WhatsApp or Email.
        </Text>
      </View>

      <ScrollView style={styles.card} contentContainerStyle={{ paddingBottom: 16 }}>
        <Text style={styles.sectionTitle}>What Chatnalyxer will access</Text>

        <Pressable
          style={[styles.checkboxRow, !consentWhatsApp && styles.checkboxRowMuted]}
          onPress={() => setConsentWhatsApp(v => !v)}
        >
          <View style={[styles.checkbox, consentWhatsApp && styles.checkboxChecked]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.checkboxTitle}>WhatsApp (Selected Groups only)</Text>
            <Text style={styles.checkboxDesc}>
              Chatnalyxer will read messages ONLY from groups you select to analyze and generate summaries, deadlines, and priority alerts.
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.checkboxRow, !consentEmail && styles.checkboxRowMuted]}
          onPress={() => setConsentEmail(v => !v)}
        >
          <View style={[styles.checkbox, consentEmail && styles.checkboxChecked]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.checkboxTitle}>Email (Inbox scanning)</Text>
            <Text style={styles.checkboxDesc}>
              Chatnalyxer will fetch and analyze incoming emails to show only important items (meetings, deadlines, submissions) and ignore promotions.
            </Text>
          </View>
        </Pressable>

        <Text style={styles.sectionTitle}>Policy</Text>
        <Text style={styles.policyText}>
          By continuing, you agree that Chatnalyxer may process your selected WhatsApp group messages and/or emails for the purpose of classification, summarization, deadline detection, and notifications.
          {'\n\n'}
          You can disconnect WhatsApp or remove Email linking anytime.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, accepting && styles.btnDisabled, pressed && styles.btnPressed]}
          onPress={onAccept}
          disabled={accepting}
        >
          {accepting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>I Agree & Continue</Text>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    color: colors.textSecondary,
    fontWeight: '600'
  },
  header: {
    marginTop: 12,
    marginBottom: 12
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary
  },
  subtitle: {
    marginTop: 6,
    color: colors.textSecondary
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    ...shadows.card
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 8,
    marginBottom: 10
  },
  checkboxRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10
  },
  checkboxRowMuted: {
    opacity: 0.7
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    marginTop: 2
  },
  checkboxChecked: {
    backgroundColor: colors.primary
  },
  checkboxTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary
  },
  checkboxDesc: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18
  },
  policyText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18
  },
  footer: {
    marginTop: 12
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    ...shadows.button
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '800'
  },
  btnDisabled: {
    opacity: 0.7
  },
  btnPressed: {
    transform: [{ scale: 0.99 }]
  }
});
