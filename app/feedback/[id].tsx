/**
 * Feedback form for an outlet: rating and comment. Submits to API (or mock).
 */

import { Layout } from '@/constants/theme';
import type { Outlet } from '@/types/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';

const DUMMY_OUTLETS: Outlet[] = [
  { id: 'o1', name: 'Tech Haven', outletType: 'Retail', address: '123 Main St, Colombo', latitude: 6.9271, longitude: 79.8612, isOpen: true },
  { id: 'o2', name: 'Gadget Mall', outletType: 'Mall', address: '456 Oak Ave, Colombo', latitude: 6.9300, longitude: 79.8700, isOpen: true },
  { id: 'o3', name: 'Fresh Mart', outletType: 'Supermarket', address: '789 Market Rd', latitude: 6.9280, longitude: 79.8650, isOpen: true },
  { id: 'o4', name: 'Health Plus', outletType: 'Pharmacy', address: '321 Health St', latitude: 6.9250, longitude: 79.8580, isOpen: true },
  { id: 'o5', name: 'City Central', outletType: 'Mall', address: '100 Central Blvd', latitude: 6.9320, longitude: 79.8480, isOpen: true },
  { id: 'o6', name: 'Quick Stop', outletType: 'Convenience', address: '55 Park Lane', latitude: 6.9200, longitude: 79.8550, isOpen: true },
];

function getOutletById(id: string): Outlet | undefined {
  return DUMMY_OUTLETS.find((o) => o.id === id);
}

export default function FeedbackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const outlet = id ? getOutletById(id) : undefined;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    // TODO: POST to API /feedback with outletId, rating, comment
    setSubmitted(true);
    setTimeout(() => router.back(), 1500);
  };

  if (!outlet) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.empty}>Outlet not found.</ThemedText>
      </ThemedView>
    );
  }

  if (submitted) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle" style={styles.thankYou}>Thank you for your feedback!</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ThemedText type="subtitle" style={styles.title}>{outlet.name}</ThemedText>
        <ThemedText style={styles.hint}>Your feedback helps us improve.</ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.label}>Rating (1–5)</ThemedText>
        <View style={styles.starRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              onPress={() => setRating(n)}
              style={[styles.starBtn, rating >= n && styles.starActive]}
            >
              <ThemedText style={[styles.star, rating >= n && styles.starTextActive]}>★</ThemedText>
            </Pressable>
          ))}
        </View>

        <ThemedTextInput
          label="Comment (optional)"
          placeholder="Share your experience..."
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={4}
          style={styles.commentInput}
        />

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={handleSubmit}
        >
          <ThemedText style={styles.buttonText}>Submit feedback</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  empty: { padding: 20 },
  title: { marginBottom: 4 },
  hint: { marginBottom: 24, opacity: 0.8 },
  label: { marginBottom: 10 },
  starRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  starBtn: {
    width: 44,
    height: 44,
    borderRadius: Layout.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starActive: { backgroundColor: 'rgba(59, 130, 246, 0.2)' },
  star: { fontSize: 28, opacity: 0.5 },
  starTextActive: { opacity: 1 },
  commentInput: { minHeight: 100 },
  button: {
    backgroundColor: Layout.primary,
    borderRadius: Layout.radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  pressed: { opacity: 0.9 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  thankYou: { padding: 24, textAlign: 'center' },
});
