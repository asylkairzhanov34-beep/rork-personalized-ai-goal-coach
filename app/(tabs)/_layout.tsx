import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';
import { Home, Target, Timer, User } from 'lucide-react-native';
import { NavBar, NavBarItem } from '@/components/NavBar';

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      tabBar={(props) => {
        // We only want to show specific tabs in the custom bar
        // We map the routes to the items required by NavBar
        // Routes: home, plan, progress, timer, profile
        // We want 4 items: Home, Plan, Timer, Profile (Hiding Progress for now to fit 4-slot design)
        
        const { state, descriptors, navigation } = props;
        
        // Define the order and selection of tabs
        const TABS_TO_SHOW = ['home', 'plan', 'timer', 'profile'];
        
        const items: NavBarItem[] = TABS_TO_SHOW.map((routeName) => {
           // Find the route in state
           const route = state.routes.find((r: any) => r.name === routeName);
           if (!route) return null;
           
           const { options } = descriptors[route.key];
           
           // Determine icon based on route name
           let IconComponent;
           switch (routeName) {
               case 'home': IconComponent = <Home />; break;
               case 'plan': IconComponent = <Target />; break;
               case 'timer': IconComponent = <Timer />; break;
               case 'profile': IconComponent = <User />; break;
               default: IconComponent = <Home />;
           }

           return {
               key: route.key,
               label: options.title || routeName,
               icon: IconComponent,
           };
        }).filter(Boolean) as NavBarItem[];

        const activeRoute = state.routes[state.index];
        const activeKey = activeRoute.key;

        return (
            <NavBar
                items={items}
                activeKey={activeKey}
                onSelect={(key) => {
                    const route = state.routes.find((r: any) => r.key === key);
                    if (route) {
                        navigation.navigate(route.name);
                    }
                }}
                onBotPress={() => {
                    router.push('/chat');
                }}
                floatAboveKeyboard={true}
            />
        );
      }}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        // We need to set background transparent because NavBar is absolute and floats
        // But we also need to ensure content has padding bottom if necessary?
        // NavBar handles paddingBottom of container.
        // But the screen content needs to know about the tab bar height to avoid being covered.
        // Standard Tabs usually handle this via safe area, but with absolute positioning, we might need manual padding.
        // However, usually screens in Tabs are wrapped in SafeAreaView or have content container padding.
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Главная',
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'План',
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Прогресс',
          // This tab is hidden from the bar but accessible if navigated to
          // We might want to add it to the bar if user wants 5 tabs.
          // But NavBar supports 4.
        }}
      />
      <Tabs.Screen
        name="timer"
        options={{
          title: 'Фокус',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профиль',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
    // Styles are handled in NavBar component
});
