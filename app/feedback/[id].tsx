

import { Layout } from '@/constants/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';

export default function FeedbackScreen() {
  const { id, outletName } = useLocalSearchParams<{ id: string; outletName?: string }>();
  const router = useRouter();
  const title = outletName ?? 'Outlet';
  const outletId = id ?? '';
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {

    setSubmitted(true);
    setTimeout(() => router.back(), 1500);
  };

  if (!outletId) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.empty}>No outlet selected.</ThemedText>
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
        <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
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
