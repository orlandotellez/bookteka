import { Stack, Redirect } from "expo-router"
import { useAppTheme } from "@/hooks/useAppTheme"
import { useEffect, useState } from "react"
import { getCachedSession } from "@/shared/lib/auth"
import { ActivityIndicator, View } from "react-native"

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
        headerStyle: { backgroundColor: theme.primary },
        headerTintColor: theme.fontColorTitle,
        headerTitleStyle: { fontWeight: "600" },
        contentStyle: { backgroundColor: theme.primary },
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          title: "Iniciar Sesión",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: "Crear Cuenta",
          headerShown: false,
        }}
      />
    </Stack>
  )
}
