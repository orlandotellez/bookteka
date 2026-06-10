import { Stack, Redirect } from "expo-router"
import { useAppTheme } from "@/hooks/useAppTheme"
import { useEffect, useState } from "react"
import { getCachedSession } from "@/shared/lib/auth"
import { ActivityIndicator, View } from "react-native"

type AuthRoutes = "login" | "register";

interface AuthConfig {
  name: AuthRoutes;
  title?: string;
  presentation?: "modal" | "card" | "fullScreenModal";
  headerShown: boolean;
}

const AUTH_ROUTES: AuthConfig[] = [
  {
    name: "login",
    title: "Iniciar Sesión",
    headerShown: false
  },
  {
    name: "register",
    title: "Crear Cuenta",
    headerShown: false
  },
];


export default function AuthLayout() {
  const { theme } = useAppTheme()
  const [isChecking, setIsChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    async function check() {
      try {
        const session = await getCachedSession()
        setHasSession(!!session)
      } catch {
        setHasSession(false)
      } finally {
        setIsChecking(false)
      }
    }
    check()
  }, [])

  // Show loading while checking session
  if (isChecking) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.primary,
        }}
      >
        <ActivityIndicator size="large" color={theme.secondary} />
      </View>
    )
  }

  // Already authenticated → redirect to tabs
  if (hasSession) {
    return <Redirect href="/(tabs)" />
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "none",
        headerStyle: { backgroundColor: theme.primary },
        headerTintColor: theme.fontColorTitle,
        headerTitleStyle: { fontWeight: "600" },
        contentStyle: { backgroundColor: theme.primary },

      }}
    >
      {AUTH_ROUTES.map((route) => (
        <Stack.Screen
          key={route.name}
          name={route.name}
          options={{
            title: route.title,
            presentation: route.presentation,
          }}
        />
      ))}
    </Stack>
  )
}
