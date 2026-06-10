import { Stack } from "expo-router"
import { ThemeProvider } from "@/shared/theme"
import { useEffect, useState, useRef } from "react"
import { getDatabase } from "@/shared/database"
import { getCachedSession } from "@/shared/lib/auth"
import { setCurrentUserId } from "@/shared/database"
import { useBookStore } from "@/shared/store/bookStore"
import { useUserPreferences } from "@/shared/store/userPreferencesStore"
import { ActivityIndicator, StatusBar, View } from "react-native"
import { THEME } from "@/shared/lib/theme"

type RootRoutes = "(tabs)" | "(auth)" | "reader/[id]";

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
    name: "(auth)",
    headerShown: false
  },
  {
    name: "reader/[id]",
    headerShown: false
  },
];

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false)
  const hasTriggeredAutoSync = useRef(false)

  useEffect(() => {
    async function initialize() {
      try {
        // Initialize the SQLite database
        await getDatabase()

        // Check for a cached session and set the current user ID
        // so database queries can filter by user
        const session = await getCachedSession()
        if (session?.user?.id) {
          setCurrentUserId(session.user.id)
        }
      } catch (err) {
        console.error("Root layout initialization error:", err)
      } finally {
        setIsReady(true)
      }
    }

    initialize()
  }, [])

  // Auto-sync on app startup if cloud sync is enabled
  useEffect(() => {
    if (!isReady) return
    if (hasTriggeredAutoSync.current) return

    const cloudSyncEnabled = useUserPreferences.getState().cloudSyncEnabled
    if (cloudSyncEnabled) {
      hasTriggeredAutoSync.current = true
      useBookStore.getState().syncBooks().catch((err) => {
        console.error("Error durante la sincronización automática:", err)
      })
    }
  }, [isReady])

  // Show a loading indicator while initializing
  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#000",
        }}
      >
        <ActivityIndicator size="large" color="#df8052" />
      </View>
    )
  }

  return (
    <ThemeProvider>
      <StatusBar backgroundColor={THEME.colors.primaryColor} translucent={false} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: THEME.colors.primaryColor,
          },
          animation: "none",
        }
        }
      >
        {ROOT_STACK.map((route) => (
          <Stack.Screen
            key={route.name}
            name={route.name}
            options={{
              headerShown: route.headerShown,
              presentation: route.presentation,
            }}
          />
        ))}
      </Stack>
    </ThemeProvider>
  )
}
