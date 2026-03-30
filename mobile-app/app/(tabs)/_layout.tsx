import { Tabs } from "expo-router";
import { Book, User } from "lucide-react-native";

type TabRoutes = "index" | "profile";

interface TabConfig {
  name: TabRoutes;
  title: string;
  icon: typeof Book;
}

const TABS: TabConfig[] = [
  { name: "index", title: "Librería", icon: Book },
  { name: "profile", title: "Perfil", icon: User },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarStyle: { backgroundColor: '#000' },
        tabBarActiveTintColor: '#fff',
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size }) => (
              <tab.icon color={color} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

