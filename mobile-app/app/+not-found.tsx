import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Book } from 'lucide-react-native';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Book width={100} height={100} />
      </View>

      <Text style={styles.title}>Ups, página no encontrada</Text>

      <Text style={styles.message}>
        Lo que buscas no está aquí.{'\n'}
        Quizás fue movido o nunca existió.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace('/')}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>Volver al inicio</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
