import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";

import { usesNativeTabs } from "@/src/navigation";
import { useTheme } from "@/src/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function tabIcon(active: IconName, inactive: IconName) {
  return function TabBarIcon({ color, size, focused }: { color: string; size: number; focused: boolean }) {
    return <Ionicons name={focused ? active : inactive} color={color} size={size} />;
  };
}

export default function TabsLayout() {
  const { colors } = useTheme();
  if (usesNativeTabs) {
    return <NativeTabs>
      <NativeTabs.Trigger name="index"><NativeTabs.Trigger.Icon sf="house.fill" /><NativeTabs.Trigger.Label>Formulas</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="ingredients"><NativeTabs.Trigger.Icon sf="leaf.fill" /><NativeTabs.Trigger.Label>Ingredients</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="calculator"><NativeTabs.Trigger.Icon sf="scalemass.fill" /><NativeTabs.Trigger.Label>Calculator</NativeTabs.Trigger.Label></NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings"><NativeTabs.Trigger.Icon sf="gearshape.fill" /><NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    </NativeTabs>;
  }
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.brand, tabBarInactiveTintColor: colors.muted, tabBarStyle: { ...(Platform.OS === "web" ? { height: 64 } : {}), backgroundColor: colors.surfaceSecondary, borderTopColor: colors.border }, tabBarItemStyle: { alignSelf: "center" } }}>
    <Tabs.Screen name="index" options={{ title: "Formulas", tabBarLabel: "Formulas", tabBarButtonTestID: "tab-formulas", tabBarIcon: tabIcon("flask", "flask-outline") }} />
    <Tabs.Screen name="ingredients" options={{ title: "Ingredients", tabBarLabel: "Ingredients", tabBarButtonTestID: "tab-ingredients", tabBarIcon: tabIcon("leaf", "leaf-outline") }} />
    <Tabs.Screen name="calculator" options={{ title: "Calculator", tabBarLabel: "Calculator", tabBarButtonTestID: "tab-calculator", tabBarIcon: tabIcon("calculator", "calculator-outline") }} />
    <Tabs.Screen name="settings" options={{ title: "Settings", tabBarLabel: "Settings", tabBarButtonTestID: "tab-settings", tabBarIcon: tabIcon("settings", "settings-outline") }} />
  </Tabs>;
}
