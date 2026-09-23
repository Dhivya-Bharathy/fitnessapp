import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Platform, StatusBar, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useState } from 'react';
import { RadialMenu } from '../components/RadialMenu';
import { useThemeStore } from '../store/themeStore';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { useSteps } from '../hooks/useSteps';

if (Platform.OS === 'android') {
  StatusBar.setTranslucent(true);
  StatusBar.setBackgroundColor('transparent');
}

// ── CORE SCREENS ──────────────────────────────────────────────
import HomeScreen from '../screens/dashboard/HomeScreen';
import CalorieScreen from '../screens/calorie/CalorieScreen';
import MealsScreen from '../screens/meals/MealsScreen';
import WorkoutScreen from '../screens/Activity/ActivityScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import ProgressScreen from '../screens/progress/ProgressScreen';
import StreaksScreen from '../screens/streaks/StreaksScreen';
import SleepScreen from '../screens/sleep/SleepScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import EditProfileScreen from '../screens/settings/EditProfileScreen';
import DownloadDataScreen from '../screens/settings/DownloadDataScreen';

import PrivacyScreen from '../screens/settings/PrivacyScreen';
import GoalsScreen from '../screens/settings/GoalsScreen';
import QuickStartScreen from '../screens/Activity/QuickStartScreen';
import AnalysisScreen from '../screens/Activity/AnalysisScreen';
import SubscriptionScreen from '../screens/earnings/SubscriptionScreen';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import FitnessAssessmentScreen from '../screens/onboarding/FitnessAssessmentScreen';
import AssessmentResultsScreen from '../screens/onboarding/AssessmentResultsScreen';
import RecapScreen from '../screens/progress/RecapScreen';
import IntermittentFastingScreen from '../screens/meals/IntermittentFastingScreen';
import BodyMeasurementsScreen from '../screens/progress/BodyMeasurementScreen';

// ── AI COACH MODULE ─────────────────────────────────────────────
import AICoachScreen from '../screens/AICoachScreen';

// ── NOTES MODULE ───────────────────────────────────────────────
import NotesScreen from '../screens/nutrition/NotesScreen';

// ── MEAL PLAN MODULE ──────────────────────────────────────────
import MealPlanScreen from '../screens/meals/MealPlanScreen';

// ── AI FOOD SCANNER ───────────────────────────────────────────
import FoodScannerScreen from '../screens/calorie/FoodScannerScreen';

// ── ACCOUNTABILITY MODULE ─────────────────────────────────────
import AccountabilityScreen from '../modules/accountability/screens/AccountabilityScreen';
import PartnerChatScreen from '../modules/accountability/screens/PartnerChatScreen';

// ── SETTINGS MODULE ───────────────────────────────────────────
import EquipmentPreferencesScreen from '../screens/settings/EquipmentPreferenceScreen';

const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

// ── CUSTOM TAB BAR ─────────────────────────────────────────────
const TAB_ICONS: Record<string, { active: any; inactive: any }> = {
  Home:     { active: 'home',         inactive: 'home-outline' },
  Calorie:  { active: 'nutrition',    inactive: 'nutrition-outline' },
  AICoach:  { active: 'bulb',         inactive: 'bulb-outline' },
  Notes:    { active: 'book',         inactive: 'book-outline' },
};

const TAB_LABELS: Record<string, string> = {
  Home: 'Home', Calorie: 'Calorie', AICoach: 'AI Coach', Notes: 'Notes',
};

function CustomTabBar({ state, navigation: nav }: BottomTabBarProps) {
  const { colorScheme } = useThemeStore();
  const theme = colors[colorScheme];
  const [radialOpen, setRadialOpen] = useState(false);

  // Hide tab bar on PartnerChat screen
  const currentRoute = state.routeNames[state.index];
  if (currentRoute === 'PartnerChat') return null;

  const handleRadialSelect = (key: string) => {
    setRadialOpen(false);
    const routeMap: Record<string, string> = {
      Activity: 'Activity',
      Health: 'Meals',
      MealPlans: 'MealPlan',
      Progress: 'Progress',
      FoodScanner: 'FoodScanner',
    };
    setTimeout(() => (nav as any).navigate(routeMap[key] ?? key), 200);
  };

  // Only show these 4 tabs in the bar
  const visibleRoutes = state.routes.filter(r => TAB_ICONS[r.name]);

  return (
    <>
      <RadialMenu
        visible={radialOpen}
        onClose={() => setRadialOpen(false)}
        onSelect={handleRadialSelect}
        theme={theme}
      />

      <View style={[tb.bar, { backgroundColor: theme.tabBar, borderTopColor: theme.border }]}>
        {visibleRoutes.map((route, index) => {
          const isFocused = state.index === index;
          const icon = TAB_ICONS[route.name];
          const label = TAB_LABELS[route.name] || route.name;

          const onPress = () => {
            const event = nav.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) nav.navigate(route.name);
          };

          return (
            <TouchableOpacity key={route.key} onPress={onPress} activeOpacity={0.7} style={tb.tab}>
              <Ionicons
                name={isFocused ? icon.active : icon.inactive}
                size={22}
                color={isFocused ? theme.tabBarActive : theme.tabBarInactive}
              />
              <Text style={[tb.label, { color: isFocused ? theme.tabBarActive : theme.tabBarInactive }]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Floating + button */}
        <TouchableOpacity
          onPress={() => setRadialOpen(true)}
          activeOpacity={0.85}
          style={[tb.plusBtn, { backgroundColor: theme.accent }]}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </>
  );
}

const tb = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 72,
    borderTopWidth: 0.5,
    paddingBottom: 8,
    paddingTop: 8,
    paddingHorizontal: 8,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 10 },
      android: { elevation: 8 },
      web: { boxShadow: '0 -4px 10px rgba(0,0,0,0.12)' },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  plusBtn: {
    position: 'absolute',
    top: -26,
    left: '50%',
    marginLeft: -24,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
});

// ── TAB NAVIGATOR ─────────────────────────────────────────────
// useSteps lives HERE so it mounts once and never tears down.
// HomeScreen reads liveSteps from Zustand — no hook call needed there.
function TabNavigator() {
  const { colorScheme } = useThemeStore();
  const { profile } = useAuthStore();

  // ── Single source of truth for step tracking ──────────────
  // Calling useSteps here means the pedometer subscription + 60s save
  // timer survive ALL navigation — tab switches, stack pushes, pulls.
  // HomeScreen, ActivityScreen, ProgressScreen just read liveSteps from
  // Zustand (authStore.liveSteps) which this hook writes on every poll.
  const stepGoal = (profile as any)?.step_goal ?? 10000;
  useSteps(stepGoal);

  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home"     component={HomeScreen} />
      <Tab.Screen name="Calorie"  component={CalorieScreen} />
      <Tab.Screen name="AICoach"  component={AICoachScreen} />
      <Tab.Screen name="Notes"    component={NotesScreen} />

      {/* Hidden tabs — show bottom bar via CustomTabBar */}
      <Tab.Screen name="Activity"             component={WorkoutScreen}             options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Progress"             component={ProgressScreen}             options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Streaks"              component={StreaksScreen}              options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Sleep"                component={SleepScreen}                options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Notifications"        component={NotificationsScreen}        options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Meals"                component={MealsScreen}                options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="FoodScanner"          component={FoodScannerScreen}          options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="MealPlan"             component={MealPlanScreen}             options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Accountability"       component={AccountabilityScreen}       options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="PartnerChat"          component={PartnerChatScreen}          options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="QuickStart"           component={QuickStartScreen}           options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Analysis"             component={AnalysisScreen}             options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Recap"                component={RecapScreen}                options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="IntermittentFasting"  component={IntermittentFastingScreen}  options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="BodyMeasurements"     component={BodyMeasurementsScreen}     options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="EquipmentPreferences" component={EquipmentPreferencesScreen} options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="DownloadData"         component={DownloadDataScreen}         options={{ tabBarItemStyle: { display: 'none' } }} />

      <Tab.Screen name="Privacy"              component={PrivacyScreen}              options={{ tabBarItemStyle: { display: 'none' } }} />
      <Tab.Screen name="Goals"                component={GoalsScreen}                options={{ tabBarItemStyle: { display: 'none' } }} />
    </Tab.Navigator>
  );
}

// ── AUTH STACK (no headers — screens have own UI) ────────────
function AuthStack() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Welcome"      component={WelcomeScreen} />
      <RootStack.Screen name="Onboarding"   component={OnboardingScreen} />
      <RootStack.Screen name="FitnessAssessment" component={FitnessAssessmentScreen} />
      <RootStack.Screen name="AssessmentResults" component={AssessmentResultsScreen} />
      <RootStack.Screen name="Subscription" component={SubscriptionScreen} />
    </RootStack.Navigator>
  );
}

// ── APP STACK (no default headers — screens have own back buttons) ──
function AppStack() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      <RootStack.Screen name="Main"                    component={TabNavigator} />
      <RootStack.Screen name="Settings"                component={SettingsScreen} />
      <RootStack.Screen name="EditProfile"             component={EditProfileScreen} />
      <RootStack.Screen name="Subscription"            component={SubscriptionScreen} />
    </RootStack.Navigator>
  );
}

// ── ROOT NAVIGATOR ────────────────────────────────────────────
export default function AppNavigator() {
  const { user, isOnboarding } = useAuthStore();
  const showAuth = !user || isOnboarding;
  const navKey = (user && !isOnboarding) ? `authed-${user.id}` : 'guest';

  return (
    <NavigationContainer key={navKey}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen
          name={showAuth ? 'Auth' : 'App'}
          component={showAuth ? AuthStack : AppStack}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}