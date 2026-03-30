import { Stack } from 'expo-router';

type RootRoutes = "(tabs)" | "+not-found";

interface StackConfig {
  name: RootRoutes;
  headerShown: boolean;
  title?: string;
  presentation?: 'modal' | 'card' | 'fullScreenModal';
}

const ROOT_STACK: StackConfig[] = [
  {
    name: "(tabs)",
    headerShown: false
  },
  {
    name: "+not-found",
    headerShown: false
  }
];

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#000' },
        headerTintColor: '#fff',
        contentStyle: { backgroundColor: '#000' },
      }}
    >
      {ROOT_STACK.map((route) => (
        <Stack.Screen
          key={route.name}
          name={route.name}
          options={{
            headerShown: route.headerShown,
            title: route.title,
            presentation: route.presentation,
          }}
        />
      ))}
    </Stack>
  );
}
